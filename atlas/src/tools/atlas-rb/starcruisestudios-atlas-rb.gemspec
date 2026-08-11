# frozen_string_literal: true

require_relative "lib/atlas/rb/version"

Gem::Specification.new do |specification|
  specification.name = "starcruisestudios-atlas-rb"
  specification.version = Atlas::Rb::VERSION
  specification.authors = ["Star Cruise Studios"]
  specification.summary = "Ruby source-model generator for Atlas."
  specification.description = "Generates language-neutral Atlas models from Ruby and Rails source."
  specification.required_ruby_version = ">= 3.1"
  specification.files = Dir["lib/**/*", "exe/*", "schemas/*.json", "DOC.md"]
  specification.bindir = "exe"
  specification.executables = ["atlas-rb"]
  specification.require_paths = ["lib"]

  specification.add_dependency "activesupport", "~> 7.2"
  specification.add_dependency "json_schemer", "~> 2.5"
  specification.add_dependency "prism", "~> 1.9"

  specification.metadata["rubygems_mfa_required"] = "true"
end
