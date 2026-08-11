# frozen_string_literal: true

require_relative "../atlas-rb-sdk/lib/atlas/rb/version"

Gem::Specification.new do |specification|
  specification.name = "starcruisestudios-atlas-rb-cli"
  specification.version = Atlas::Rb::VERSION
  specification.authors = ["Star Cruise Studios"]
  specification.summary = "Command-line YAML model generation for Atlas Ruby workspaces."
  specification.required_ruby_version = ">= 3.1"
  specification.files = Dir.chdir(__dir__) { Dir["lib/**/*", "exe/*", "schemas/*.json", "DOC.md"] }
  specification.bindir = "exe"
  specification.executables = ["atlas-rb"]
  specification.require_paths = ["lib"]
  specification.add_dependency "json_schemer", "~> 2.5"
  specification.add_dependency "starcruisestudios-atlas-rb-sdk", Atlas::Rb::VERSION
  specification.metadata["rubygems_mfa_required"] = "true"
end
