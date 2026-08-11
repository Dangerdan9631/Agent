# frozen_string_literal: true

module Atlas
  module Rb
    # Defines the diagnostic boundary used by Ruby generation workflows.
    class AtlasLogger
      # Emits an informational diagnostic with structured context.
      def info(_message, _context = {})
        raise NotImplementedError
      end

      # Emits a warning diagnostic with structured context.
      def warn(_message, _context = {})
        raise NotImplementedError
      end
    end
  end
end
