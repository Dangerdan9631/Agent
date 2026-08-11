# frozen_string_literal: true

require "atlas_example/domain/catalog_item"

module AtlasExample
  module Application
    # Coordinates catalog lookup behavior for delivery adapters.
    class CatalogService
      # Returns a domain item for one identifier.
      def find(identifier)
        AtlasExample::Domain::CatalogItem.new(identifier)
      end
    end
  end
end
