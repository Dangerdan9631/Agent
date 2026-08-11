# frozen_string_literal: true

require_relative "test_helper"

# Verifies Ruby and Rails syntax maps into the portable Atlas vocabulary.
class PrismSourceParserTest < Minitest::Test
  include AtlasRbTestSupport

  # Extracts declarations, inheritance, associations, callbacks, mixins, and references.
  def test_extracts_ruby_and_rails_facts
    with_temp_directory("atlas-rb-parser-") do |root|
      source = write_file(root, "app/models/admin/user.rb", <<~RUBY)
        module Admin
          class User < ApplicationRecord
            include Auditable
            has_many :posts, class_name: "Post"
            before_save :normalize
            validates_with UserValidator

            def normalize(value = nil)
              Post.find(value)
            end

            def self.lookup(id)
              User.find(id)
            end
          end
        end
      RUBY
      descriptor = descriptor(root, [File.join(root, "app")])
      extraction = Atlas::Rb::PrismSourceParser.new(
        descriptor,
        Atlas::Rb::ModelIdentity.new("example")
      ).parse(source)

      qualified_names = extraction.elements.map { |element| element.fetch(:qualifiedName) }
      assert_includes qualified_names, "Admin"
      assert_includes qualified_names, "Admin::User"
      assert_includes qualified_names, "Admin::User#normalize"
      assert_includes qualified_names, "Admin::User.lookup"
      assert_includes extraction.elements.find { |element|
        element[:qualifiedName] == "Admin::User.lookup"
      }[:traits], "singleton"

      facts = extraction.relationships.map do |relationship|
        [relationship.fetch(:kind), relationship.fetch(:target).fetch(:label)]
      end
      assert_includes facts, ["inherits", "Admin::ApplicationRecord"]
      assert_includes facts, %w[implements Auditable]
      assert_includes facts, %w[references Post]
      assert_includes facts, %w[references UserValidator]
      assert_includes facts, ["calls", "Admin::User#normalize"]
    end
  end

  # Extracts literal Rails route targets without creating generated action elements.
  def test_extracts_routes
    with_temp_directory("atlas-rb-routes-") do |root|
      routes = write_file(root, "config/routes.rb", <<~RUBY)
        Rails.application.routes.draw do
          namespace :admin do
            resources :users
            get "health", to: "health#show"
          end
          mount Billing::Engine => "/billing"
        end
      RUBY
      descriptor = descriptor(root, [File.join(root, "app")], [routes])
      FileUtils.mkdir_p(File.join(root, "app"))
      extraction = Atlas::Rb::PrismSourceParser.new(
        descriptor,
        Atlas::Rb::ModelIdentity.new("example")
      ).parse(routes)
      targets = extraction.relationships.map { |relationship| relationship.fetch(:target).fetch(:label) }

      assert_includes targets, "Admin::UsersController#index"
      assert_includes targets, "Admin::HealthController#show"
      assert_includes targets, "Billing::Engine"
      refute(extraction.elements.any? { |element| element[:qualifiedName] == "Admin::UsersController#index" })
    end
  end

  private

  def descriptor(root, roots, routes = [])
    Atlas::Rb::ModuleDescriptor.new(
      id: "example",
      display_name: "example",
      version: "1.0.0",
      category: "ruby-application",
      root_path: root,
      relative_root_path: ".",
      source_root_paths: roots,
      route_file_paths: routes
    )
  end
end
