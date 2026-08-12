# frozen_string_literal: true

module Atlas
  module Rb
    # Converts linked Ruby extraction values into the closed Atlas version-two module document.
    class VersionTwoModelDocument
      CALLABLE_KINDS = %w[function local-function constructor method].freeze

      # Creates one deterministic schema-compatible document.
      def create(model)
        elements = model.fetch(:elements).map { |element| convert_element(element) }
                        .sort_by { |element| element.fetch(:id) }
        relationships = model.fetch(:relationships).map { |relationship| convert_relationship(relationship) }
                             .sort_by { |relationship| relationship.fetch(:id) }
        {
          schemaVersion: 2,
          generator: { name: "atlas-rb", version: "1" },
          source: { language: "ruby" },
          module: module_identity(model.fetch(:module)),
          elements: elements,
          relationships: relationships
        }
      end

      private

      def module_identity(identity)
        {
          id: identity.fetch(:id),
          name: identity.fetch(:displayName),
          version: identity.fetch(:version),
          category: identity.fetch(:category)
        }
      end

      def convert_element(element)
        converted = {
          id: element.fetch(:id),
          kind: element.fetch(:kind),
          name: element.fetch(:name),
          qualifiedName: element.fetch(:qualifiedName),
          visibility: "unknown"
        }
        converted[:parentId] = element[:parentId] if element.key?(:parentId)
        converted[:traits] = element.fetch(:traits).uniq.sort if element.key?(:traits) && !element.fetch(:traits).empty?
        if CALLABLE_KINDS.include?(element.fetch(:kind))
          converted[:signature] =
            callable_signature(element.fetch(:kind))
        end
        converted
      end

      def callable_signature(kind)
        signature = { typeParameters: [], parameters: [] }
        signature[:returns] = { kind: "unknown" } unless kind == "constructor"
        signature
      end

      def convert_relationship(relationship)
        {
          id: relationship.fetch(:id),
          sourceElementId: relationship.fetch(:sourceElementId),
          kind: relationship.fetch(:kind),
          target: convert_target(relationship.fetch(:target))
        }
      end

      def convert_target(target)
        return { type: "element", **target.slice(:moduleId, :elementId) } if target.key?(:elementId)
        return { type: "module", moduleId: target.fetch(:moduleId) } if target.key?(:moduleId)

        label = target.fetch(:label)
        { type: "external", id: label, name: label }
      end
    end
  end
end
