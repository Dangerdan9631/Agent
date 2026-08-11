# frozen_string_literal: true

require "pathname"

module Atlas
  module Rb
    # Describes one discovered Ruby artifact and the source files it owns.
    class ModuleDescriptor
      attr_reader :id, :display_name, :version, :category, :root_path,
                  :relative_root_path, :source_root_paths, :route_file_paths

      # Creates an immutable module descriptor from contained canonical paths.
      def initialize(id:, display_name:, version:, category:, root_path:,
                     relative_root_path:, source_root_paths:, route_file_paths:)
        @id = id
        @display_name = display_name
        @version = version
        @category = category
        @root_path = root_path
        @relative_root_path = relative_root_path
        @source_root_paths = source_root_paths.freeze
        @route_file_paths = route_file_paths.freeze
      end

      # Returns every unique Ruby source file owned by the descriptor.
      def source_files
        root_files = source_root_paths.flat_map do |source_root|
          Dir.glob("**/*.rb", File::FNM_DOTMATCH, base: source_root).map do |relative|
            File.join(source_root, relative)
          end
        end
        (root_files + route_file_paths).select { |path| File.file?(path) }
                                       .map { |path| File.realpath(path) }
                                       .uniq
          .sort
      end

      # Returns a slash-normalized source path relative to this module.
      def relative_source_path(file_path)
        Pathname.new(file_path).relative_path_from(Pathname.new(root_path)).to_s.tr("\\", "/")
      end
    end
  end
end
