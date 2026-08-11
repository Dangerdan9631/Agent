# frozen_string_literal: true

require "active_support/core_ext/string/inflections"
require "dry/validation"
require_relative "reading_list_item"

module AtlasExample
  # Validates titles and creates normalized reading-list items.
  class ReadingList
    # Defines the title constraints enforced by the library boundary.
    class Contract < Dry::Validation::Contract
      params do
        required(:title).filled(:string)
      end
    end

    # Creates the service with its validation contract.
    def initialize(contract = Contract.new)
      @contract = contract
    end

    # Returns a normalized reading-list item for the supplied title.
    def add(title)
      result = @contract.call(title: title)
      raise ArgumentError, result.errors.to_h.inspect if result.failure?

      normalized_title = title.strip.titleize
      ReadingListItem.new(title: normalized_title, slug: normalized_title.parameterize)
    end
  end
end
