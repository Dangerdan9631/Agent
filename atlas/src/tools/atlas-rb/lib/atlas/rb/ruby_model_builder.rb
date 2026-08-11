# frozen_string_literal: true

module Atlas
  module Rb
    # Builds one portable module model from all Ruby files owned by an artifact.
    class RubyModelBuilder
      # Creates model building from a parser factory.
      def initialize(parser_factory = nil)
        @parser_factory = parser_factory
      end

      # Returns an unlinked schema-compatible model for one descriptor.
      def build(descriptor)
        identity = ModelIdentity.new(descriptor.id)
        parser = @parser_factory&.call(descriptor, identity) || PrismSourceParser.new(descriptor, identity)
        extractions = descriptor.source_files.map { |file_path| parser.parse(file_path) }
        {
          schemaVersion: 1,
          generatorVersion: "atlas-rb-1",
          module: {
            id: descriptor.id,
            displayName: descriptor.display_name,
            version: descriptor.version,
            category: descriptor.category
          },
          sourceLanguage: "ruby",
          elements: extractions.flat_map(&:elements).sort_by { |element| element.fetch(:id) },
          relationships: extractions.flat_map(&:relationships)
                                    .group_by { |relationship| relationship.fetch(:id) }
                                    .values.map(&:first)
                                    .sort_by { |relationship| relationship.fetch(:id) }
        }
      end
    end
  end
end
