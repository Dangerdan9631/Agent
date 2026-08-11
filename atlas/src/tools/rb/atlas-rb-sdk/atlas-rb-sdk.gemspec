# frozen_string_literal: true

require_relative "lib/atlas/rb/version"

Gem::Specification.new do |specification|
  specification.name = "starcruisestudios-atlas-rb-sdk"
  specification.version = Atlas::Rb::VERSION
  specification.authors = ["Star Cruise Studios"]
  specification.summary = "Pure Ruby and Rails-convention model generation for Atlas."
  specification.required_ruby_version = ">= 3.1"
  specification.files = Dir.chdir(__dir__) { Dir["lib/**/*", "DOC.md"] }
  specification.require_paths = ["lib"]
  specification.add_dependency "activesupport", "~> 7.2"
  specification.add_dependency "prism", "~> 1.9"
  specification.metadata["rubygems_mfa_required"] = "true"
end
