# frozen_string_literal: true

Gem::Specification.new do |specification|
  specification.name = "atlas-example-lib"
  specification.version = "1.0.0"
  specification.authors = ["Star Cruise Studios"]
  specification.summary = "Reusable reading-list behavior for the Atlas Ruby example."
  specification.required_ruby_version = ">= 3.1"
  specification.files = Dir.chdir(__dir__) { Dir["lib/**/*", "DOC.md"] }
  specification.require_paths = ["lib"]
  specification.add_dependency "activesupport", "~> 7.2"
  specification.add_dependency "dry-validation", "~> 1.11"
  specification.metadata["rubygems_mfa_required"] = "true"
end
