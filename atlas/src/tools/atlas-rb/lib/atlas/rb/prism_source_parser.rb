# frozen_string_literal: true

require "prism"

module Atlas
  module Rb
    # Extracts portable declarations and reliable relationships from one Ruby source file.
    class PrismSourceParser
      # Ruby constants that should not become external architectural references.
      # The set includes core language objects and common exception types.
      BUILTIN_CONSTANTS = %w[
        Array BasicObject Binding Class Comparable Data Dir Encoding Enumerable Enumerator
        ENV Exception FalseClass Fiber File Float GC Hash IO Integer Kernel MatchData Math
        Method Module Mutex NilClass Numeric Object Proc Process Queue Random Range Rational
        Regexp RubyVM Set String Struct Symbol Thread Time TrueClass UnboundMethod
      ].freeze

      # Creates parsing for one module from identity and syntax collaborators.
      def initialize(module_descriptor, identity, syntax_reader = RubySyntaxReader.new)
        @module_descriptor = module_descriptor
        @identity = identity
        @syntax_reader = syntax_reader
      end

      # Returns declarations and relationships extracted from one contained Ruby file.
      def parse(file_path)
        @source_path = @module_descriptor.relative_source_path(file_path)
        @elements = []
        @relationships = []
        source_unit = element("source-unit", @source_path, File.basename(@source_path), @source_path)
        @rails_analyzer = RailsDslAnalyzer.new(@syntax_reader, method(:add_relationship))
        result = Prism.parse_file(file_path)
        unless result.success?
          details = result.errors.map(&:message).uniq.join("; ")
          raise ArgumentError, "Ruby source '#{@source_path}' could not be parsed: #{details}"
        end

        context = {
          source_id: source_unit[:id],
          owner_id: source_unit[:id],
          owner_name: nil,
          namespace: nil,
          singleton: false,
          route_file: route_file?(@source_path),
          route_prefix: nil,
          route_controller: nil,
          rails_namespace: nil
        }
        walk(result.value, context)
        SourceExtraction.new(unique_sorted(@elements), unique_sorted(@relationships))
      end

      private

      def walk(node, context)
        return if node.nil?

        case node.type
        when :class_node
          walk_class(node, context)
        when :module_node
          walk_module(node, context)
        when :singleton_class_node
          walk_singleton_class(node, context)
        when :def_node
          walk_method(node, context)
        when :constant_write_node, :constant_path_write_node
          walk_constant_write(node, context)
        when :constant_read_node, :constant_path_node
          walk_constant_reference(node, context)
        when :call_node
          walk_call(node, context)
        else
          node.each_child_node { |child| walk(child, context) }
        end
      end

      def walk_class(node, context)
        qualified_name = qualify(@syntax_reader.constant_name(node.constant_path), context[:namespace])
        return node.each_child_node { |child| walk(child, context) } if qualified_name.nil?

        class_element = element("class", qualified_name, qualified_name.split("::").last,
                                context[:owner_id])
        superclass = @syntax_reader.constant_name(node.superclass)
        unless superclass.nil?
          add_relationship(class_element[:id], "inherits",
                           label: qualify(superclass, context[:namespace]))
        end
        child_context = context.merge(owner_id: class_element[:id], owner_name: qualified_name,
                                      namespace: qualified_name, singleton: false,
                                      rails_namespace: qualified_name.split("::")[0...-1].join("::"))
        walk(node.body, child_context)
      end

      def walk_module(node, context)
        qualified_name = qualify(@syntax_reader.constant_name(node.constant_path), context[:namespace])
        return node.each_child_node { |child| walk(child, context) } if qualified_name.nil?

        module_element = element("namespace", qualified_name, qualified_name.split("::").last,
                                 context[:owner_id])
        child_context = context.merge(owner_id: module_element[:id], owner_name: qualified_name,
                                      namespace: qualified_name, singleton: false,
                                      rails_namespace: qualified_name)
        walk(node.body, child_context)
      end

      def walk_singleton_class(node, context)
        walk(node.expression, context) unless node.expression&.type == :self_node
        walk(node.body, context.merge(singleton: true))
      end

      def walk_method(node, context)
        singleton = context[:singleton] || !node.receiver.nil?
        separator = singleton ? "." : "#"
        owner_name = context[:owner_name]
        qualified_name = owner_name.nil? ? "#{@source_path}##{node.name}" : "#{owner_name}#{separator}#{node.name}"
        signature = method_signature(node)
        kind = if node.name == :initialize && !singleton
                 "constructor"
               else
                 (owner_name.nil? ? "function" : "method")
               end
        traits = singleton ? ["singleton"] : nil
        method_element = element(kind, qualified_name, node.name.to_s, context[:owner_id], signature, traits)
        walk(node.receiver, context) unless node.receiver.nil? || node.receiver.type == :self_node
        walk(node.body, context.merge(owner_id: method_element[:id], owner_name: qualified_name))
      end

      def walk_constant_write(node, context)
        raw_name = if node.type == :constant_write_node
                     node.name.to_s
                   else
                     @syntax_reader.constant_name(node.target)
                   end
        qualified_name = qualify(raw_name, context[:namespace])
        return node.each_child_node { |child| walk(child, context) } if qualified_name.nil?

        constant = element("constant", qualified_name, qualified_name.split("::").last,
                           context[:owner_id], nil, ["const"])
        walk(node.value, context.merge(owner_id: constant[:id]))
      end

      def walk_constant_reference(node, context)
        name = @syntax_reader.constant_name(node)
        return if name.nil? || builtin?(name)

        add_relationship(context[:owner_id], "references", label: qualify(name, lexical_namespace(context)))
      end

      def walk_call(node, context)
        analyze_core_call(node, context)
        @rails_analyzer.analyze(node, context)
        walk(node.receiver, context) unless node.receiver.nil?
        node.arguments&.each_child_node { |child| walk(child, context) }
        return if node.block.nil?

        block_context = @rails_analyzer.block_context(node, context)
        walk(node.block, block_context)
      end

      def analyze_core_call(node, context)
        case node.name
        when :require, :load, :autoload
          specifier = @syntax_reader.literal(@syntax_reader.positional_arguments(node).last)
          add_relationship(context[:source_id], "imports", label: specifier) unless specifier.nil?
        when :require_relative
          specifier = @syntax_reader.literal(@syntax_reader.positional_arguments(node).first)
          target = relative_require_target(specifier)
          add_relationship(context[:source_id], "imports", label: target) unless target.nil?
        when :include, :prepend, :extend
          kind = node.name == :extend ? "references" : "implements"
          @syntax_reader.positional_arguments(node).each do |argument|
            target = @syntax_reader.constant_name(argument)
            add_relationship(context[:owner_id], kind, label: target) unless target.nil?
          end
        end
      end

      def relative_require_target(specifier)
        return nil if specifier.nil?

        candidate = File.expand_path(specifier.end_with?(".rb") ? specifier : "#{specifier}.rb",
                                     File.dirname(File.join(@module_descriptor.root_path, @source_path)))
        return specifier unless File.file?(candidate)

        @module_descriptor.relative_source_path(File.realpath(candidate))
      end

      def element(kind, qualified_name, name, parent_id, signature = nil, traits = nil)
        value = {
          id: @identity.element_id(kind, @source_path, qualified_name, signature),
          name: name,
          kind: kind,
          qualifiedName: qualified_name,
          sourcePath: @source_path
        }
        value[:parentId] = parent_id unless kind == "source-unit"
        value[:signature] = signature unless signature.nil? || signature.empty?
        value[:traits] = traits unless traits.nil? || traits.empty?
        @elements << value
        value
      end

      def add_relationship(source_id, kind, target)
        return if source_id.nil? || target[:label].to_s.empty?

        relationship = {
          sourceElementId: source_id,
          kind: kind,
          target: target
        }
        relationship[:id] = @identity.relationship_id(source_id, kind, target)
        @relationships << relationship
      end

      def qualify(name, namespace)
        return nil if name.nil? || name.empty?
        return name.delete_prefix("::") if name.start_with?("::")
        return name if name.include?("::") || namespace.nil? || namespace.empty?

        "#{namespace}::#{name}"
      end

      def lexical_namespace(context)
        owner = context[:owner_name]
        return context[:namespace] if owner.nil? || owner.include?("#") || owner.include?(".")

        owner
      end

      def method_signature(node)
        text = node.parameters&.location&.slice
        return nil if text.nil? || text.empty?

        "(#{text.gsub(/\s+/, ' ').strip})"
      end

      def builtin?(name)
        BUILTIN_CONSTANTS.include?(name.delete_prefix("::").split("::").first)
      end

      def route_file?(source_path)
        source_path == "config/routes.rb" || source_path.start_with?("config/routes/")
      end

      def unique_sorted(records)
        records.group_by { |record| record.fetch(:id) }.values.map(&:first).sort_by { |record| record.fetch(:id) }
      end
    end
  end
end
