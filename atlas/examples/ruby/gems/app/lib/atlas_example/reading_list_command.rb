# frozen_string_literal: true

require "active_support/core_ext/string/filters"
require "pastel"
require "atlas_example/reading_list"

module AtlasExample
  # Normalizes command input and renders the item returned by the library.
  class ReadingListCommand
    # Creates the command from its library service, terminal formatter, and output boundary.
    def initialize(reading_list = ReadingList.new, pastel = Pastel.new, output = $stdout)
      @reading_list = reading_list
      @pastel = pastel
      @output = output
    end

    # Creates and prints an item for the supplied command-line title.
    def execute(title)
      item = @reading_list.add(title.squish)
      @output.puts(@pastel.bold(item.title))
      @output.puts(@pastel.dim("slug: #{item.slug}"))
      item
    end
  end
end
