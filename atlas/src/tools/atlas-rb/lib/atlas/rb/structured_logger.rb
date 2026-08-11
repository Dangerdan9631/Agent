# frozen_string_literal: true

require "json"

module Atlas
  module Rb
    # Writes opt-in structured diagnostics to the process error stream.
    class StructuredLogger < AtlasLogger
      # Creates a logger that remains silent unless verbose output is enabled.
      def initialize(error_stream, verbose: false)
        @error_stream = error_stream
        @verbose = verbose
      end

      # Emits an informational diagnostic when verbose output is enabled.
      def info(message, context = {})
        write("info", message, context) if @verbose
      end

      # Emits a warning diagnostic regardless of verbose output.
      def warn(message, context = {})
        write("warn", message, context)
      end

      private

      def write(level, message, context)
        @error_stream.puts(JSON.generate({ level: level, message: message, context: context }))
      end
    end
  end
end
