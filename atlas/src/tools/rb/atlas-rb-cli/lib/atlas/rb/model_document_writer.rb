# frozen_string_literal: true

require "fileutils"
require "json"
require "yaml"
require_relative "version_two_model_document"

module Atlas
  module Rb
    # Persists deterministic Atlas YAML documents through atomic sibling replacements.
    class ModelDocumentWriter
      # Creates writing from the portable schema validator.
      def initialize(schema_validator)
        @schema_validator = schema_validator
        @model_document = VersionTwoModelDocument.new
      end

      # Writes module models and returns their absolute containing directory.
      def write(output_directory, models)
        FileUtils.mkdir_p(output_directory)
        models.sort_by { |model| model.fetch(:module).fetch(:id) }.each do |model|
          document = @model_document.create(model)
          @schema_validator.validate!("atlas-module.schema.json", stringify(document), model.fetch(:module).fetch(:id))
          file_name = "#{safe_file_name(model.fetch(:module).fetch(:id))}.atlas.module.yml"
          atomic_write(File.join(output_directory, file_name), document)
        end
        File.realpath(output_directory)
      end

      # Writes one module model to its target-derived destination and returns the absolute path.
      def write_model(output_path, model)
        document = @model_document.create(model)
        @schema_validator.validate!("atlas-module.schema.json", stringify(document), model.fetch(:module).fetch(:id))
        FileUtils.mkdir_p(File.dirname(output_path))
        atomic_write(output_path, document)
        File.realpath(output_path)
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
