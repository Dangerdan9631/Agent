# frozen_string_literal: true

module AtlasExample
  # Stores the normalized title and stable slug for one reading-list entry.
  ReadingListItem = Struct.new(:title, :slug, keyword_init: true)
end
