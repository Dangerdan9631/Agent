# frozen_string_literal: true

Gem::Specification.new do |specification|
  specification.name = "atlas-example-application"
  specification.version = "1.0.0"
  specification.summary = "Atlas Ruby application example"
  specification.authors = ["Star Cruise Studios"]
  specification.required_ruby_version = ">= 3.1"
  specification.metadata["rubygems_mfa_required"] = "true"
  specification.files = Dir["lib/**/*.rb"]
  specification.require_paths = ["lib"]
end
