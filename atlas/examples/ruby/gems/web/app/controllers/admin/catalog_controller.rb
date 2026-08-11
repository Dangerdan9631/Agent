# frozen_string_literal: true

module Admin
  # Presents catalog behavior through a Rails-style controller boundary.
  class CatalogController
    before_action :load_catalog

    # Renders the catalog index.
    def index; end

    private

    # Loads catalog state before handling the action.
    def load_catalog; end
  end
end
