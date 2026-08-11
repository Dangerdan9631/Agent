# frozen_string_literal: true

require "active_support/inflector"

module Atlas
  module Rb
    # Converts bounded literal Rails DSL declarations into portable relationships.
    class RailsDslAnalyzer
      # Rails association macros that describe references between model classes.
      # Each recognized call produces relationships without synthesizing declarations.
      ASSOCIATIONS = %i[belongs_to has_one has_many has_and_belongs_to_many].freeze
      # Active Record lifecycle callbacks represented as calls relationships.
      # The list covers validation, persistence, initialization, and transaction hooks.
      MODEL_CALLBACKS = %i[
        before_validation after_validation before_save around_save after_save before_create
        around_create after_create before_update around_update after_update before_destroy
        around_destroy after_destroy after_commit after_rollback after_find after_initialize
        after_touch validate
      ].freeze
      # Action Controller lifecycle callbacks represented as calls relationships.
      # Callback targets are accepted only when their method names are statically known.
      CONTROLLER_CALLBACKS = %i[before_action around_action after_action].freeze
      # Rails routing verbs that directly identify controller action endpoints.
      # Dynamic verb construction remains outside the supported static subset.
      ROUTE_VERBS = %i[get post put patch delete options head match].freeze
      # Conventional REST actions emitted by Rails resource routing macros.
      # Route options may narrow this list through static only and except values.
      REST_ACTIONS = %w[index show new create edit update destroy].freeze

      # Creates Rails extraction from syntax reading and a relationship callback.
      def initialize(syntax_reader, relationship_writer)
        @syntax_reader = syntax_reader
        @relationship_writer = relationship_writer
        @associations = Hash.new { |hash, key| hash[key] = {} }
      end

      # Interprets one call when it is a supported literal Rails declaration.
      def analyze(call_node, context)
        name = call_node.name
        analyze_association(call_node, context) if ASSOCIATIONS.include?(name)
        analyze_callback(call_node, context) if (MODEL_CALLBACKS + CONTROLLER_CALLBACKS).include?(name)
        analyze_validator(call_node, context) if name == :validates_with
        analyze_delegate(call_node, context) if name == :delegate
        analyze_route(call_node, context) if ROUTE_VERBS.include?(name) || %i[root resources resource
                                                                              mount].include?(name)
      end

      # Returns a context adjusted by literal route namespace/controller blocks.
      def block_context(call_node, context)
        name = call_node.name
        return context unless %i[namespace scope controller].include?(name)

        value = @syntax_reader.literal(@syntax_reader.positional_arguments(call_node).first)
        keywords = @syntax_reader.keywords(call_node)
        value = @syntax_reader.literal(keywords["module"]) || value if name == :scope
        return context if value.nil?

        updated = context.dup
        if name == :controller
          updated[:route_controller] = value
        else
          prefix = [context[:route_prefix], value].compact.reject(&:empty?).join("/")
          updated[:route_prefix] = prefix
        end
        updated
      end

      private

      def analyze_association(call_node, context)
        return if context[:owner_name].nil?

        association_name = @syntax_reader.literal(@syntax_reader.positional_arguments(call_node).first)
        return if association_name.nil?

        keywords = @syntax_reader.keywords(call_node)
        explicit_name = @syntax_reader.literal(keywords["class_name"])
        polymorphic = @syntax_reader.boolean(keywords["polymorphic"])
        target_name = explicit_name || infer_model_name(association_name, context[:rails_namespace])
        unless polymorphic && explicit_name.nil?
          @associations[context[:owner_name]][association_name] = target_name
          write(context[:owner_id], "references", label: target_name)
        end
        through_name = @syntax_reader.literal(keywords["through"])
        through_target = @associations[context[:owner_name]][through_name] unless through_name.nil?
        write(context[:owner_id], "references", label: through_target) unless through_target.nil?
      end

      def analyze_callback(call_node, context)
        return if context[:owner_name].nil?

        @syntax_reader.positional_arguments(call_node).filter_map { |argument| @syntax_reader.literal(argument) }
                      .each do |method_name|
          write(context[:owner_id], "calls", label: "#{context[:owner_name]}##{method_name}")
        end
      end

      def analyze_validator(call_node, context)
        @syntax_reader.positional_arguments(call_node).each do |argument|
          target = @syntax_reader.constant_name(argument)
          write(context[:owner_id], "references", label: target) unless target.nil? || context[:owner_id].nil?
        end
      end

      def analyze_delegate(call_node, context)
        return if context[:owner_name].nil?

        keywords = @syntax_reader.keywords(call_node)
        receiver = @syntax_reader.literal(keywords["to"])
        target_class = @associations[context[:owner_name]][receiver]
        return if target_class.nil?

        @syntax_reader.positional_arguments(call_node).filter_map { |argument| @syntax_reader.literal(argument) }
                      .each do |method_name|
          write(context[:owner_id], "calls", label: "#{target_class}##{method_name}")
        end
      end

      def analyze_route(call_node, context)
        return unless context[:route_file]

        case call_node.name
        when :resources, :resource
          resource = @syntax_reader.literal(@syntax_reader.positional_arguments(call_node).first)
          return if resource.nil?

          controller = route_controller(resource, context)
          REST_ACTIONS.each { |action| write(context[:source_id], "calls", label: "#{controller}##{action}") }
        when :mount
          target = @syntax_reader.constant_name(@syntax_reader.positional_arguments(call_node).first)
          write(context[:source_id], "references", label: target) unless target.nil?
        else
          destination = @syntax_reader.literal(@syntax_reader.keywords(call_node)["to"])
          if call_node.name == :root
            destination ||= @syntax_reader.literal(@syntax_reader.positional_arguments(call_node).first)
          end
          return if destination.nil? || !destination.include?("#")

          controller_name, action = destination.split("#", 2)
          write(context[:source_id], "calls", label: "#{route_controller(controller_name, context)}##{action}")
        end
      end

      def infer_model_name(association_name, namespace)
        constant = ActiveSupport::Inflector.camelize(ActiveSupport::Inflector.singularize(association_name))
        [namespace, constant].compact.reject(&:empty?).join("::")
      end

      def route_controller(value, context)
        controller_path = context[:route_controller] || value
        prefixed = [context[:route_prefix], controller_path].compact.reject(&:empty?).join("/")
        "#{ActiveSupport::Inflector.camelize(prefixed)}Controller"
      end

      def write(source_id, kind, target)
        return if source_id.nil? || target[:label].to_s.empty?

        @relationship_writer.call(source_id, kind, target)
      end
    end
  end
end
