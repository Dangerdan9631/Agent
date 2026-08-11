# frozen_string_literal: true

require_relative "reading_list_command"

module AtlasExample
  # Composes and starts the reading-list command-line application.
  class Program
    # Creates the application from its command boundary.
    def initialize(command = ReadingListCommand.new)
      @command = command
    end

    # Runs the application with a title assembled from process arguments.
    def run(arguments)
      title = arguments.empty? ? "Domain-Driven Design" : arguments.join(" ")
      @command.execute(title)
    end
  end
end
