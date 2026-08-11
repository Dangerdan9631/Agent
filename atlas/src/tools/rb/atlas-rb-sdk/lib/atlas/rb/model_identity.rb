# frozen_string_literal: true

require "uri"

module Atlas
  module Rb
    # Creates deterministic artifact-scoped identities for Ruby model records.
    class ModelIdentity
      # Creates identity generation for one stable module ID.
      def initialize(module_id)
        @module_id = module_id
      end

      # Returns a globally unique element ID for one source declaration.
      def element_id(kind, source_path, qualified_name, signature = nil)
        [@module_id, kind, source_path, qualified_name, signature.to_s].join("|")
      end

      # Returns a globally unique relationship ID for one source-target fact.
      def relationship_id(source_id, kind, target)
        target_identity = %i[moduleId elementId label].map { |key| target[key].to_s }.join("\0")
        "relationship:#{encode(source_id)}>#{encode(target_identity)}:#{kind}"
      end

      private

      def encode(value)
        URI.encode_www_form_component(value)
      end
    end
  end
end
