# frozen_string_literal: true

require "rake"

module Atlas
  module Rb
    # Registers Ruby workspace tasks that invoke the dedicated Atlas executables.
    class RakeTasks
      include Rake::DSL

      # Installs model generation, validation, diagram generation, and viewing tasks.
      def install
        namespace :atlas do
          desc "Generate Ruby Atlas module models and the workspace manifest"
          task :generate_models do
            sh "atlas-rb generate --config atlas.config.yml"
          end

          desc "Validate the generated Ruby Atlas workspace"
          task validate: :generate_models do
            sh "atlas-cli validate --config atlas.config.yml --manifest architecture/models/atlas.manifest.yml"
          end

          desc "Generate viewer artifacts for the Ruby Atlas workspace"
          task generate: :generate_models do
            sh "atlas-cli generate --config atlas.config.yml --manifest architecture/models/atlas.manifest.yml"
          end

          desc "Open the generated Ruby Atlas workspace"
          task view: :generate do
            sh "atlas --config atlas.config.yml --manifest architecture/models/atlas.manifest.yml"
          end
        end
      end
    end
  end
end

Atlas::Rb::RakeTasks.new.install
