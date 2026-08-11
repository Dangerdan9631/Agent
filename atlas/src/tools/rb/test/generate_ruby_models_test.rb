# frozen_string_literal: true

require_relative "test_helper"

# Verifies complete Ruby workspaces produce deterministic portable manifests.
class GenerateRubyModelsTest < Minitest::Test
  include AtlasRbTestSupport

  # Generates and links a gemless Rails-style root application twice identically.
  def test_generates_gemless_root_application
    with_temp_directory("atlas-rb-root-") do |root|
      write_file(root, "app/models/application_record.rb", "class ApplicationRecord; end\n")
      write_file(root, "app/models/user.rb", <<~RUBY)
        class User < ApplicationRecord
          has_many :posts
        end
      RUBY
      write_file(root, "app/models/post.rb", "class Post < ApplicationRecord; end\n")
      write_file(root, "atlas.config.yml", YAML.dump(configuration_for(
                                                       ["catalog"], source_roots: ["app"]
                                                     )))
      request = Atlas::Rb::GenerationRequest.new(
        workspace_path: root,
        configuration_path: nil,
        output_path: nil,
        identity_overrides: { module_id: "catalog", version: "1.2.3" }
      )
      generator = workflow
      manifest_path = generator.execute(request)
      first = generated_documents(File.dirname(manifest_path))
      second_manifest_path = generator.execute(request)
      second = generated_documents(File.dirname(second_manifest_path))

      assert_equal first, second
      manifest = YAML.safe_load(File.read(manifest_path, encoding: "UTF-8"))
      assert_equal(["catalog"], manifest.fetch("modules").map { |entry| entry.fetch("moduleId") })
      model = YAML.safe_load(File.read(File.join(File.dirname(manifest_path), manifest.dig("modules", 0, "modelPath")),
                                       encoding: "UTF-8"))
      assert_equal "ruby", model.fetch("sourceLanguage")
      assert_equal "1.2.3", model.dig("module", "version")
      post = model.fetch("elements").find { |element| element["qualifiedName"] == "Post" }
      association = model.fetch("relationships").find do |relationship|
        relationship["kind"] == "references" && relationship.dig("target", "elementId") == post.fetch("id")
      end
      refute_nil association, JSON.pretty_generate(model)
      refute_includes JSON.generate(model), root.tr("\\", "/")
    end
  end

  # Discovers one module per gemspec and links a require across gem boundaries.
  def test_generates_gem_workspace
    with_temp_directory("atlas-rb-gems-") do |root|
      create_gem(root, "domain", "catalog-domain", "class CatalogItem; end\n")
      create_gem(root, "application", "catalog-application", <<~RUBY)
        require "catalog_item"
        class CatalogService
          def item
            CatalogItem.new
          end
        end
      RUBY
      write_file(root, "atlas.config.yml", YAML.dump(configuration_for(
                                                       %w[catalog-domain
                                                          catalog-application], package_globs: ["gems/*"]
                                                     )))
      manifest_path = workflow.execute(Atlas::Rb::GenerationRequest.new(
                                         workspace_path: root,
                                         configuration_path: nil,
                                         output_path: nil,
                                         identity_overrides: {}
                                       ))
      models = YAML.safe_load(File.read(manifest_path, encoding: "UTF-8")).fetch("modules")
      assert_equal(%w[catalog-application catalog-domain], models.map { |entry| entry.fetch("moduleId") })
      application_path = models.find { |entry| entry["moduleId"] == "catalog-application" }.fetch("modelPath")
      application = YAML.safe_load(File.read(File.join(File.dirname(manifest_path), application_path),
                                             encoding: "UTF-8"))
      assert application.fetch("relationships").any? { |relationship|
        relationship.dig("target", "moduleId") == "catalog-domain"
      }, JSON.pretty_generate(application)
    end
  end

  # Keeps packaged schemas synchronized with the language-neutral CLI contracts.
  def test_packaged_schemas_match_canonical_contracts
    ruby_root = File.expand_path("..", __dir__)
    canonical_root = File.expand_path("../../atlas-cli/src/config", ruby_root)
    %w[atlas.schema.json atlas-module.schema.json atlas-workspace.schema.json].each do |name|
      assert_equal File.binread(File.join(canonical_root, name)),
                   File.binread(File.join(ruby_root, "atlas-rb-cli", "schemas", name))
    end
  end

  private

  def workflow
    logger = AtlasRbTestSupport::SilentLogger.new
    validator = Atlas::Rb::SchemaValidator.new
    Atlas::Rb::GenerateRubyModels.new(
      schema_validator: validator,
      discoverer: Atlas::Rb::WorkspaceDiscoverer.new(logger),
      model_builder: Atlas::Rb::RubyModelBuilder.new,
      linker: Atlas::Rb::WorkspaceModelLinker.new,
      writer: Atlas::Rb::ModelDocumentWriter.new(validator),
      logger: logger
    )
  end

  def generated_documents(directory)
    Dir.glob(File.join(directory, "*.json")).to_h do |path|
      [File.basename(path), File.binread(path)]
    end
  end

  def create_gem(root, directory, name, source)
    gem_root = File.join(root, "gems", directory)
    write_file(gem_root, "#{directory}.gemspec", <<~RUBY)
      Gem::Specification.new do |specification|
        specification.name = "#{name}"
        specification.version = "1.0.0"
        specification.summary = "Fixture"
        specification.authors = ["Atlas"]
        specification.files = Dir["lib/**/*.rb"]
        specification.require_paths = ["lib"]
      end
    RUBY
    write_file(gem_root, "lib/#{directory == 'domain' ? 'catalog_item' : 'catalog_service'}.rb", source)
  end
end
