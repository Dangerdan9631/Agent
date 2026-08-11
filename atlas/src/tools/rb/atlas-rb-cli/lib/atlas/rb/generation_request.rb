# frozen_string_literal: true

module Atlas
  module Rb
    # Carries normalized command options into one workspace generation run.
    class GenerationRequest
      attr_reader :workspace_path, :configuration_path, :output_path, :identity_overrides

      # Creates a request whose paths may be relative to the current invocation directory.
      def initialize(workspace_path:, configuration_path:, output_path:, identity_overrides:)
        @workspace_path = workspace_path
        @configuration_path = configuration_path
        @output_path = output_path
        @identity_overrides = identity_overrides.freeze
      end
    end
  end
end
