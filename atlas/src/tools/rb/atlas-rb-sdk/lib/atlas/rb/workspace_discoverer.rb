# frozen_string_literal: true

require "pathname"
require "rubygems"

module Atlas
  module Rb
    # Discovers gem-backed modules and a conventional gemless root application.
    class WorkspaceDiscoverer
      # Flags applied consistently to workspace package and exclusion patterns.
      # Extended glob syntax is supported while path separators remain significant.
      GLOB_FLAGS = File::FNM_EXTGLOB | File::FNM_PATHNAME

      # Creates discovery from one diagnostic boundary.
      def initialize(logger)
        @logger = logger
      end

      # Returns deterministic module descriptors selected by Atlas policy.
      def discover(workspace_path, configuration, identity_overrides)
        roots = candidate_roots(workspace_path, configuration.discovery)
        descriptors = roots.map do |root_path|
          discover_module(workspace_path, root_path, configuration.discovery, identity_overrides)
        end
        assert_unique_ids(descriptors)
        @logger.info("Discovered Ruby modules", modules: descriptors.map(&:id))
        descriptors.sort_by(&:id)
      end

      private

      def candidate_roots(workspace_path, discovery)
        patterns = discovery["packageGlobs"]
        roots = if patterns.nil?
                  [workspace_path]
                else
                  patterns.flat_map do |pattern|
                    Dir.glob(pattern.tr("\\", "/"), base: workspace_path).map do |relative|
                      File.join(workspace_path, relative)
                    end
                  end
                end
        exclusions = discovery.fetch("excludePackageGlobs", [])
        selected = roots.select { |path| File.directory?(path) }
                        .map { |path| File.realpath(path) }
                        .uniq
                        .reject do |path|
          relative = relative_path(workspace_path, path)
          exclusions.any? { |pattern| File.fnmatch?(pattern, relative, GLOB_FLAGS) }
        end
        raise ArgumentError, "No Ruby package directories matched Atlas discovery policy." if selected.empty?

        selected.sort
      end

      def discover_module(workspace_path, root_path, discovery, identity_overrides)
        relative_root = relative_path(workspace_path, root_path)
        gemspec_paths = Dir.children(root_path).select { |name| name.end_with?(".gemspec") }
                           .map { |name| File.join(root_path, name) }.sort
        raise ArgumentError, "Ruby module '#{relative_root}' contains multiple gemspecs." if gemspec_paths.length > 1

        metadata = if gemspec_paths.one?
                     unless identity_overrides.empty?
                       raise ArgumentError,
                             "Root identity overrides apply only to a gemless application."
                     end

                     gem_metadata(gemspec_paths.first)
                   elsif root_path == workspace_path
                     application_metadata(workspace_path, identity_overrides)
                   else
                     raise ArgumentError, "Ruby package '#{relative_root}' does not contain a gemspec."
                   end
        policy = select_policy(discovery.fetch("packages"), metadata.fetch(:id), relative_root)
        roots = source_roots(root_path, discovery, policy, metadata.fetch(:require_paths))
        routes = [File.join(root_path, "config", "routes.rb"),
                  *Dir.glob(File.join(root_path, "config", "routes", "**", "*.rb"))]
                 .select { |path| File.file?(path) }
                 .map { |path| contained_realpath(root_path, path, "route file") }
                 .sort
        ModuleDescriptor.new(
          id: metadata.fetch(:id),
          display_name: metadata.fetch(:display_name),
          version: metadata.fetch(:version),
          category: metadata.fetch(:category),
          root_path: root_path,
          relative_root_path: relative_root,
          source_root_paths: roots,
          route_file_paths: routes
        )
      end

      def gem_metadata(gemspec_path)
        specification = Gem::Specification.load(gemspec_path)
        raise ArgumentError, "Ruby gemspec '#{gemspec_path}' could not be evaluated." if specification.nil?

        {
          id: specification.name,
          display_name: specification.name,
          version: specification.version.to_s,
          category: "ruby-gem",
          require_paths: specification.require_paths
        }
      rescue StandardError => e
        raise ArgumentError, "Ruby gemspec '#{gemspec_path}' failed: #{e.message}"
      end

      def application_metadata(workspace_path, overrides)
        default_name = File.basename(workspace_path)
        {
          id: overrides.fetch(:module_id, default_name),
          display_name: overrides.fetch(:display_name, overrides.fetch(:module_id, default_name)),
          version: overrides.fetch(:version, "0.0.0"),
          category: overrides.fetch(:category, "ruby-application"),
          require_paths: []
        }
      end

      def select_policy(policies, module_id, relative_root)
        matches = policies.select do |policy|
          matcher = policy.fetch("match")
          name_match = !matcher.key?("name") || File.fnmatch?(matcher.fetch("name"), module_id, GLOB_FLAGS)
          path_match = !matcher.key?("path") || File.fnmatch?(matcher.fetch("path"), relative_root, GLOB_FLAGS)
          name_match && path_match
        end
        return matches.first if matches.one?

        reason = matches.empty? ? "no" : "multiple"
        raise ArgumentError, "Ruby module '#{module_id}' at '#{relative_root}' has #{reason} matching package policies."
      end

      def source_roots(root_path, discovery, policy, require_paths)
        configured = policy["sourceRoots"] || discovery["defaultSourceRoots"]
        relative_roots = configured || (require_paths + %w[app lib]).uniq
        paths = relative_roots.filter_map do |relative_root|
          candidate = File.expand_path(relative_root, root_path)
          if File.directory?(candidate)
            contained_realpath(root_path, candidate, "source root")
          elsif configured
            raise ArgumentError, "Ruby source root '#{relative_root}' does not exist in '#{root_path}'."
          end
        end.uniq.sort
        raise ArgumentError, "Ruby module '#{root_path}' has no readable source roots." if paths.empty?

        paths
      end

      def contained_realpath(root_path, candidate_path, label)
        root = Pathname.new(File.realpath(root_path))
        candidate = Pathname.new(File.realpath(candidate_path))
        relative = candidate.relative_path_from(root).to_s
        if relative == ".." || relative.start_with?("..#{File::SEPARATOR}")
          raise ArgumentError, "Ruby #{label} '#{candidate}' escapes module root '#{root}'."
        end

        candidate.to_s
      end

      def relative_path(workspace_path, path)
        value = Pathname.new(path).relative_path_from(Pathname.new(workspace_path)).to_s.tr("\\", "/")
        value.empty? ? "." : value
      end

      def assert_unique_ids(descriptors)
        duplicate = descriptors.group_by(&:id).find { |_id, values| values.length > 1 }
        raise ArgumentError, "Ruby workspace contains duplicate module ID '#{duplicate.first}'." unless duplicate.nil?
      end
    end
  end
end
