# frozen_string_literal: true

require "json"

module Atlas
  module Rb
    # Loads the canonical Atlas policy used for Ruby discovery and output selection.
    class WorkspaceConfiguration
      attr_reader :path, :value

      # Reads and validates one JSON configuration document.
      def self.load(path, schema_validator)
        value = JSON.parse(File.read(path, encoding: "UTF-8"))
        schema_validator.validate!("atlas.schema.json", value, path)
        new(path, value)
      rescue JSON::ParserError => e
        raise ArgumentError, "Atlas configuration '#{path}' is not valid JSON: #{e.message}"
      end

      # Retains one already validated configuration value.
      def initialize(path, value)
        @path = path
        @value = value.freeze
      end

      # Returns the package discovery object.
      def discovery
        value.fetch("discovery")
      end

      # Returns the configured artifact root or the conventional default.
      def artifact_root
        value.fetch("artifacts", {}).fetch("root", "architecture")
      end
    end
  end
end
