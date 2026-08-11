# frozen_string_literal: true

module Atlas
  module Rb
    # Reads stable literal and constant facts from Prism nodes.
    class RubySyntaxReader
      # Returns a qualified constant name or nil for unsupported dynamic syntax.
      def constant_name(node)
        return nil if node.nil?
        return node.full_name.to_s if node.respond_to?(:full_name)

        nil
      rescue StandardError
        nil
      end

      # Returns a literal string or symbol value without evaluating Ruby code.
      def literal(node)
        return nil if node.nil?
        return node.unescaped.to_s if node.respond_to?(:unescaped)
        return node.value.to_s if %i[string_node symbol_node].include?(node.type) && node.respond_to?(:value)

        nil
      end

      # Returns positional call arguments in source order.
      def positional_arguments(call_node)
        arguments(call_node).reject { |argument| argument.type == :keyword_hash_node }
      end

      # Returns literal keyword values keyed by keyword name.
      def keywords(call_node)
        hash = arguments(call_node).find { |argument| argument.type == :keyword_hash_node }
        return {} if hash.nil?

        hash.elements.each_with_object({}) do |element, values|
          next unless element.type == :assoc_node

          key = literal(element.key)
          values[key] = element.value unless key.nil?
        end
      end

      # Returns a boolean literal or nil when the node is not literal true/false.
      def boolean(node)
        return true if node&.type == :true_node
        return false if node&.type == :false_node

        nil
      end

      private

      def arguments(call_node)
        call_node.arguments&.arguments || []
      end
    end
  end
end
