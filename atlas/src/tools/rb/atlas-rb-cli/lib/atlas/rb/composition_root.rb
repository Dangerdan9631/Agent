# frozen_string_literal: true

module Atlas
  module Rb
    # Constructs the concrete Ruby generator dependency graph.
    class CompositionRoot
      # Creates a ready CLI using the supplied process streams.
      def create_cli(output_stream: $stdout, error_stream: $stderr)
        output_writer = RuntimeOutputWriter.new(output_stream, error_stream)
        workflow_factory = lambda do |verbose|
          logger = StructuredLogger.new(error_stream, verbose: verbose)
          validator = SchemaValidator.new
          GenerateRubyModels.new(
            schema_validator: validator,
            discoverer: WorkspaceDiscoverer.new(logger),
            model_builder: RubyModelBuilder.new,
            linker: WorkspaceModelLinker.new,
            writer: ModelDocumentWriter.new(validator),
            logger: logger
          )
        end
        Cli.new(workflow_factory, output_writer)
      end
    end
  end
end
