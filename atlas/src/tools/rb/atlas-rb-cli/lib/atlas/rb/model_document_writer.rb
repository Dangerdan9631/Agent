# frozen_string_literal: true

require "fileutils"
require "json"
require "yaml"

module Atlas
  module Rb
    # Persists deterministic Atlas YAML documents through atomic sibling replacements.
    class ModelDocumentWriter
      # Creates writing from the portable schema validator.
      def initialize(schema_validator)
        @schema_validator = schema_validator
      end

      # Writes module models and returns the absolute generated manifest path.
      def write(output_directory, models)
        FileUtils.mkdir_p(output_directory)
        entries = models.sort_by { |model| model.fetch(:module).fetch(:id) }.map do |model|
          @schema_validator.validate!("atlas-module.schema.json", stringify(model), model.fetch(:module).fetch(:id))
          file_name = "#{safe_file_name(model.fetch(:module).fetch(:id))}.atlas.module.yml"
          atomic_write(File.join(output_directory, file_name), model)
          { moduleId: model.fetch(:module).fetch(:id), modelPath: file_name }
        end
        manifest = { schemaVersion: 1, modules: entries }
        @schema_validator.validate!("atlas-workspace.schema.json", stringify(manifest), "Atlas workspace manifest")
        manifest_path = File.join(output_directory, "atlas.manifest.yml")
        atomic_write(manifest_path, manifest)
        File.realpath(manifest_path)
      end

      private

      def atomic_write(path, value)
        temporary_path = "#{path}.tmp-#{Process.pid}"
        File.write(temporary_path, YAML.dump(stringify(value)), encoding: "UTF-8")
        File.rename(temporary_path, path)
      ensure
        File.delete(temporary_path) if defined?(temporary_path) && File.exist?(temporary_path)
      end

      def stringify(value)
        JSON.parse(JSON.generate(value))
      end

      def safe_file_name(module_id)
        module_id.gsub(/[^A-Za-z0-9._-]/, "_")
      end
    end
  end
end
