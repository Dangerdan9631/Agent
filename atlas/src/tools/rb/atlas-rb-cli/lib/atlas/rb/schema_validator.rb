# frozen_string_literal: true

require "json"
require "json_schemer"

module Atlas
  module Rb
    # Validates parsed Atlas document values against the JSON Schemas packaged with the generator.
    class SchemaValidator
      # Creates a validator rooted at the gem's generated schema directory.
      def initialize(schema_root = File.expand_path("../../../schemas", __dir__))
        @schema_root = schema_root
      end

      # Validates a value and raises one actionable error for any schema failures.
      def validate!(schema_name, value, document_name)
        schema_path = File.join(@schema_root, schema_name)
        schema = JSONSchemer.schema(JSON.parse(File.read(schema_path, encoding: "UTF-8")))
        errors = schema.validate(value).to_a
        return value if errors.empty?

        details = errors.first(5).map do |error|
          pointer = error.fetch("data_pointer", "")
          "#{pointer.empty? ? '/' : pointer}: #{error.fetch('type', 'invalid')}"
        end
        raise ArgumentError, "#{document_name} does not satisfy #{schema_name}: #{details.join('; ')}"
      end
    end
  end
end
