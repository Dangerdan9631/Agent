# frozen_string_literal: true

Gem::Specification.new do |specification|
  specification.name = "atlas-example-web"
  specification.version = "1.0.0"
  specification.summary = "Atlas Ruby web example"
  specification.authors = ["Star Cruise Studios"]
  specification.required_ruby_version = ">= 3.1"
  specification.metadata["rubygems_mfa_required"] = "true"
  specification.files = Dir["app/**/*.rb", "config/routes.rb"]
  specification.require_paths = ["app"]
end
