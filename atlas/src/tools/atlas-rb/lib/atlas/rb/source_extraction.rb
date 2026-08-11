# frozen_string_literal: true

module Atlas
  module Rb
    # Holds portable elements and relationships extracted from one Ruby file.
    class SourceExtraction
      attr_reader :elements, :relationships

      # Creates an extraction from mutable records that will no longer be changed.
      def initialize(elements, relationships)
        @elements = elements.freeze
        @relationships = relationships.freeze
      end
    end
  end
end
