# frozen_string_literal: true

require "fileutils"
require "pathname"

module Atlas
  module Rb
    # Coordinates configuration, Ruby discovery, extraction, linking, and persistence.
    class GenerateRubyModels
      # Creates generation from focused infrastructure collaborators.
      def initialize(schema_validator:, discoverer:, model_builder:, linker:, writer:, logger:,
                     configured_descriptor: ConfiguredRubyModuleDescriptor.new)
        @schema_validator = schema_validator
        @discoverer = discoverer
        @configured_descriptor = configured_descriptor
        @model_builder = model_builder
        @linker = linker
        @writer = writer
        @logger = logger
      end

      # Generates all selected module models and returns their absolute containing directory.
      def execute(request)
        return generate_configured_module(request) unless request.module_root.nil?

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
        @writer.write(File.join(artifact_root, "model"), linked_models)
      end

      private

      def generate_configured_module(request)
        module_root = canonical_directory(request.module_root, "module root")
        if request.output_path.nil? || request.output_path.strip.empty?
          raise ArgumentError, "Module-local Ruby generation requires --output."
        end

        descriptor = @configured_descriptor.create(module_root, request)
        model = @linker.link([@model_builder.build(descriptor)], [descriptor]).fetch(0)
        output_root = File.expand_path(request.output_path, module_root)
        output_path = File.join(output_root, "model", model_file_name(descriptor.display_name))
        @logger.info("Writing Ruby Atlas module", module: descriptor.id, output: output_path)
        @writer.write_model(output_path, model)
      end

      def model_file_name(target_name)
        unless target_name.match?(/\A[A-Za-z0-9._-]+\z/)
          raise ArgumentError, "Ruby build target '#{target_name}' cannot form a model filename."
        end

        "#{target_name}.atlas.module.yml"
      end

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
