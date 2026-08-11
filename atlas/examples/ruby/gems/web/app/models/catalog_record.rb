# frozen_string_literal: true

# Represents the Rails persistence boundary exercised by the example.
class CatalogRecord
  has_many :items, class_name: "AtlasExample::Domain::CatalogItem"
  before_save :normalize_catalog

  # Normalizes persisted catalog state before storage.
  def normalize_catalog; end
end
