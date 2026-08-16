# frozen_string_literal: true

module Atlas
  module Rb
    # Carries normalized command options into one workspace generation run.
    class GenerationRequest
      attr_reader :workspace_path, :configuration_path, :output_path, :identity_overrides,
                  :module_root, :gemspec_file, :source_roots, :route_files

      # Creates a request whose paths may be relative to the current invocation directory.
      def initialize(workspace_path:, configuration_path:, output_path:, identity_overrides:,
                     module_root: nil, gemspec_file: nil, source_roots: [], route_files: [])
        @workspace_path = workspace_path
        @configuration_path = configuration_path
        @output_path = output_path
        @identity_overrides = identity_overrides.freeze
        @module_root = module_root
        @gemspec_file = gemspec_file
        @source_roots = source_roots.freeze
        @route_files = route_files.freeze
      end
    end
  end
end
