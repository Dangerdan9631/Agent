# frozen_string_literal: true

require "fileutils"
require "pathname"

module Atlas
  module Rb
    # Coordinates configuration, Ruby discovery, extraction, linking, and persistence.
    class GenerateRubyModels
      # Creates generation from focused infrastructure collaborators.
      def initialize(schema_validator:, discoverer:, model_builder:, linker:, writer:, logger:)
        @schema_validator = schema_validator
        @discoverer = discoverer
        @model_builder = model_builder
        @linker = linker
        @writer = writer
        @logger = logger
      end

      # Generates all selected module models and returns the absolute manifest path.
      def execute(request)
        workspace_path = canonical_directory(request.workspace_path || Dir.pwd, "workspace")
        configuration_path = resolve_configuration(workspace_path, request.configuration_path)
        configuration = WorkspaceConfiguration.load(configuration_path, @schema_validator)
        descriptors = @discoverer.discover(workspace_path, configuration, request.identity_overrides)
        models = descriptors.map { |descriptor| @model_builder.build(descriptor) }
        linked_models = @linker.link(models, descriptors)
        artifact_root = resolve_output(workspace_path, request.output_path || configuration.artifact_root)
        @logger.info("Writing Ruby Atlas models", workspace: workspace_path,
                                                  output: artifact_root,
                                                  modules: descriptors.map(&:id))
        @writer.write(File.join(artifact_root, "models"), linked_models)
      end

      private

      def canonical_directory(path, label)
        absolute = File.expand_path(path)
        raise ArgumentError, "Atlas Ruby #{label} '#{absolute}' is not a directory." unless File.directory?(absolute)

        File.realpath(absolute)
      end

      def resolve_configuration(workspace_path, option)
        candidate = if option.nil?
                      File.join(workspace_path,
                                "atlas.config.yml")
                    else
                      File.expand_path(option, workspace_path)
                    end
        raise ArgumentError, "Atlas configuration '#{candidate}' does not exist." unless File.file?(candidate)

        File.realpath(candidate)
      end

      def resolve_output(workspace_path, output)
        path = File.expand_path(output, workspace_path)
        FileUtils.mkdir_p(path)
        File.realpath(path)
      end
    end
  end
end
