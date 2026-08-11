# frozen_string_literal: true

module Atlas
  module Rb
    # Owns the generator's deliberate user-facing stdout and stderr contract.
    class RuntimeOutputWriter
      # Creates output from explicit writable streams.
      def initialize(output_stream, error_stream)
        @output_stream = output_stream
        @error_stream = error_stream
      end

      # Writes one successful command result.
      def write_line(message)
        @output_stream.puts(message)
      end

      # Writes one user-facing command failure.
      def write_error(message)
        @error_stream.puts(message)
      end
    end
  end
end
