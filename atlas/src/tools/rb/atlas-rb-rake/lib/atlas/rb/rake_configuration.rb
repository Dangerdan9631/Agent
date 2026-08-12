# frozen_string_literal: true

module Atlas
  module Rake
    # Holds the exact module-local inputs passed from Rake to the Ruby generator.
    class RakeConfiguration
      attr_accessor :model_file, :gemspec_file, :source_roots, :route_files, :generate_on_build, :rakefile_path

      # Creates settings with only the documented optional defaults applied.
      def initialize
        @source_roots = []
        @route_files = []
        @generate_on_build = true
      end

      # Rejects incomplete or malformed integration settings before task execution.
      def validate!
        validate_model_file
        validate_gemspec_file
        validate_paths(source_roots, "source_roots")
        validate_paths(route_files, "route_files")
        validate_source_roots
        validate_generate_on_build
      end

      def validate_model_file
        return if model_file.is_a?(String) && model_file.end_with?(".atlas.module.yml")

        raise ArgumentError, "Atlas Ruby model_file must end in .atlas.module.yml."
      end

      def validate_gemspec_file
        return if gemspec_file.nil? || gemspec_file.is_a?(String)

        raise ArgumentError, "Atlas Ruby gemspec_file must be a path when configured."
      end

      def validate_paths(paths, name)
        raise ArgumentError, "Atlas Ruby #{name} must contain paths." unless paths.is_a?(Array) && paths.all?(String)
      end

      def validate_source_roots
        return unless gemspec_file.nil? && source_roots.empty?

        raise ArgumentError,
              "Atlas Ruby source_roots are required without a gemspec_file."
      end

      def validate_generate_on_build
        return if [true, false].include?(generate_on_build)

        raise ArgumentError, "Atlas Ruby generate_on_build must be boolean."
      end

      # Returns one safely separable argument list for the dedicated module generator.
      def command_arguments
        module_root = File.dirname(File.expand_path(rakefile_path || "Rakefile"))
        arguments = ["atlas-rb", "generate", "--module-root", module_root, "--model-file", model_file]
        arguments.push("--gemspec-file", gemspec_file) unless gemspec_file.nil?
        source_roots.each { |path| arguments.push("--source-root", path) }
        route_files.each { |path| arguments.push("--route-file", path) }
        arguments
      end
    end
  end
end
