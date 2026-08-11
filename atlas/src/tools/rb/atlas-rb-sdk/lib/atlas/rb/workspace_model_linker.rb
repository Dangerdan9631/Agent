# frozen_string_literal: true

require "pathname"

module Atlas
  module Rb
    # Resolves portable label targets against unique workspace declarations and require paths.
    class WorkspaceModelLinker
      # Returns models whose safe local and cross-module targets use explicit identities.
      def link(models, descriptors)
        descriptor_by_id = descriptors.to_h { |descriptor| [descriptor.id, descriptor] }
        qualified = unique_index(models) { |_model, element| element.fetch(:qualifiedName) }
        sources = unique_index(models) do |model, element|
          next unless element.fetch(:kind) == "source-unit"

          "#{model.fetch(:module).fetch(:id)}\0#{element.fetch(:sourcePath)}"
        end
        requires = require_index(models, descriptor_by_id)
        models.map do |model|
          linked = model.fetch(:relationships).map do |relationship|
            link_relationship(model, relationship, qualified, sources, requires)
          end
          model.merge(relationships: linked.group_by { |item| item.fetch(:id) }
                                           .values.map(&:first)
                                           .sort_by { |item| item.fetch(:id) })
        end
      end

      private

      def link_relationship(source_model, relationship, qualified, sources, requires)
        label = relationship.fetch(:target).fetch(:label, nil)
        return relationship if label.nil?

        source_module_id = source_model.fetch(:module).fetch(:id)
        target = qualified[label]
        target ||= sources["#{source_module_id}\0#{label}"]
        if target.nil? && relationship.fetch(:kind) == "imports"
          target = requires["#{source_module_id}\0#{normalize_require(label)}"] ||
                   requires["*\0#{normalize_require(label)}"]
        end
        return relationship if target.nil?

        explicit = { elementId: target.fetch(:element).fetch(:id) }
        target_module_id = target.fetch(:model).fetch(:module).fetch(:id)
        explicit[:moduleId] = target_module_id unless target_module_id == source_module_id
        identity = ModelIdentity.new(source_module_id)
        linked = relationship.merge(target: explicit)
        linked.merge(id: identity.relationship_id(linked.fetch(:sourceElementId), linked.fetch(:kind), explicit))
      end

      def unique_index(models)
        groups = Hash.new { |hash, key| hash[key] = [] }
        models.each do |model|
          model.fetch(:elements).each do |element|
            key = yield(model, element)
            groups[key] << { model: model, element: element } unless key.nil?
          end
        end
        groups.filter_map { |key, values| [key, values.first] if values.one? }.to_h
      end

      def require_index(models, descriptor_by_id)
        local_groups = Hash.new { |hash, key| hash[key] = [] }
        global_groups = Hash.new { |hash, key| hash[key] = [] }
        models.each do |model|
          module_id = model.fetch(:module).fetch(:id)
          descriptor = descriptor_by_id.fetch(module_id)
          model.fetch(:elements).select { |element| element.fetch(:kind) == "source-unit" }.each do |element|
            absolute = File.join(descriptor.root_path, element.fetch(:sourcePath))
            descriptor.source_root_paths.each do |root|
              next unless contained?(root, absolute)

              key = normalize_require(Pathname.new(absolute).relative_path_from(Pathname.new(root)).to_s)
              value = { model: model, element: element }
              local_groups["#{module_id}\0#{key}"] << value
              global_groups["*\0#{key}"] << value
            end
          end
        end
        unique_groups(local_groups).merge(unique_groups(global_groups))
      end

      def unique_groups(groups)
        groups.filter_map { |key, values| [key, values.first] if values.one? }.to_h
      end

      def normalize_require(value)
        value.tr("\\", "/").delete_suffix(".rb").delete_prefix("./")
      end

      def contained?(root_path, candidate_path)
        relative = Pathname.new(candidate_path).relative_path_from(Pathname.new(root_path)).to_s
        relative != ".." && !relative.start_with?("..#{File::SEPARATOR}")
      end
    end
  end
end
