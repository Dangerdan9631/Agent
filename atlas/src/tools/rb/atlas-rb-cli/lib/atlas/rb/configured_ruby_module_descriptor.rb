# frozen_string_literal: true

require "pathname"
require "rubygems"

module Atlas
  module Rb
    # Builds one module descriptor solely from an explicit Rake or CLI configuration.
    class ConfiguredRubyModuleDescriptor
      # Resolves exact gem metadata and configured source inputs below the module root.
      def create(module_root, request)
        metadata = if request.gemspec_file.nil?
                     application_metadata(module_root)
                   else
                     gem_metadata(module_root,
                                  request.gemspec_file)
                   end
        roots = request.source_roots
        roots = metadata.fetch(:require_paths) if roots.empty? && !request.gemspec_file.nil?
        raise ArgumentError, "Ruby source_roots are required when gemspec_file is omitted." if roots.empty?

        ModuleDescriptor.new(
          id: metadata.fetch(:id),
          display_name: metadata.fetch(:name),
          version: metadata.fetch(:version),
          category: metadata.fetch(:category),
          root_path: module_root,
          relative_root_path: ".",
          source_root_paths: roots.map { |path| contained_path(module_root, path, directory: true) }.uniq.sort,
          route_file_paths: request.route_files.map do |path|
            contained_path(module_root, path, directory: false)
          end.uniq.sort
        )
      end

      private

      def gem_metadata(module_root, gemspec_file)
        path = contained_path(module_root, gemspec_file, directory: false)
        specification = Gem::Specification.load(path)
        raise ArgumentError, "Ruby gemspec '#{path}' could not be evaluated." if specification.nil?

        { id: specification.name, name: specification.name, version: specification.version.to_s,
          category: "ruby-gem", require_paths: specification.require_paths }
      rescue StandardError => e
        raise ArgumentError, "Ruby gemspec '#{gemspec_file}' failed: #{e.message}"
      end

      def application_metadata(module_root)
        name = File.basename(module_root)
        { id: name, name: name, version: "0.0.0", category: "ruby-application", require_paths: [] }
      end

      def contained_path(module_root, relative_path, directory:)
        candidate = File.expand_path(relative_path, module_root)
        valid = directory ? File.directory?(candidate) : File.file?(candidate)
        raise ArgumentError, "Ruby configured path '#{relative_path}' does not exist." unless valid

        root = Pathname.new(File.realpath(module_root))
        resolved = Pathname.new(File.realpath(candidate))
        relative = resolved.relative_path_from(root).to_s
        if relative == ".." || relative.start_with?("..#{File::SEPARATOR}")
          raise ArgumentError,
                "Ruby configured path '#{relative_path}' escapes the module root."
        end

        resolved.to_s
      end
    end
  end
end
