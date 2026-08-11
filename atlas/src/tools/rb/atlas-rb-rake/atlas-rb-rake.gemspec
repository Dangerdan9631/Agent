# frozen_string_literal: true

require_relative "../atlas-rb-sdk/lib/atlas/rb/version"

Gem::Specification.new do |specification|
  specification.name = "starcruisestudios-atlas-rb-rake"
  specification.version = Atlas::Rb::VERSION
  specification.authors = ["Star Cruise Studios"]
  specification.summary = "Rake task integration for Atlas Ruby workspaces."
  specification.required_ruby_version = ">= 3.1"
  specification.files = Dir.chdir(__dir__) { Dir["lib/**/*", "DOC.md"] }
  specification.require_paths = ["lib"]
  specification.add_dependency "rake", "~> 13.0"
  specification.add_dependency "starcruisestudios-atlas-rb-cli", Atlas::Rb::VERSION
  specification.metadata["rubygems_mfa_required"] = "true"
end
