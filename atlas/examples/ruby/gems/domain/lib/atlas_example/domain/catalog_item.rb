# frozen_string_literal: true

module AtlasExample
  module Domain
    # Represents one item visible in the example catalog.
    class CatalogItem
      # Creates an item from its stable identifier.
      def initialize(identifier)
        @identifier = identifier
      end

      # Returns the stable catalog identifier.
      attr_reader :identifier
    end
  end
end
