# frozen_string_literal: true

require "rake"
require "shellwords"
require_relative "rake_configuration"

module Atlas
  # Owns module-local Ruby build integration without loading project Atlas policy.
  module Rake
    # Registers and configures the single-module model generation task.
    class Integration
      include ::Rake::DSL

      # Creates an unconfigured integration whose settings are supplied by the Rakefile.
      def initialize
        @configuration = RakeConfiguration.new
        @installed = false
      end

      # Applies one configuration block and installs the task exactly once.
      def configure(rakefile_path)
        @configuration.rakefile_path = rakefile_path
        yield @configuration
        @configuration.validate!
        install unless @installed
      end

      private

      def install
        configuration = @configuration
        namespace :atlas do
          desc "Generate this Ruby module's Atlas model"
          task :generate_model do
            sh Shellwords.join(configuration.command_arguments)
          end
        end
        task build: "atlas:generate_model" if configuration.generate_on_build
        @installed = true
      end
    end

    @integration = Integration.new

    # Configures the Atlas task for the gem or application owning this Rakefile.
    def self.configure(&)
      rakefile_path = caller_locations(1, 1).first&.absolute_path
      @integration.configure(rakefile_path, &)
    end
  end
end
