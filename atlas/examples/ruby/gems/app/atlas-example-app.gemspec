# frozen_string_literal: true

Gem::Specification.new do |specification|
  specification.name = "atlas-example-app"
  specification.version = "1.0.0"
  specification.authors = ["Star Cruise Studios"]
  specification.summary = "Reading-list command-line application for the Atlas Ruby example."
  specification.required_ruby_version = ">= 3.1"
  specification.files = Dir.chdir(__dir__) { Dir["lib/**/*", "exe/*", "DOC.md"] }
  specification.bindir = "exe"
  specification.executables = ["atlas-reading-list"]
  specification.require_paths = ["lib"]
  specification.add_dependency "activesupport", "~> 7.2"
  specification.add_dependency "atlas-example-lib", "= 1.0.0"
  specification.add_dependency "pastel", "~> 0.8"
  specification.metadata["rubygems_mfa_required"] = "true"
end
