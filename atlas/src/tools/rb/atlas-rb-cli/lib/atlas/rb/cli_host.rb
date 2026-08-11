# frozen_string_literal: true

module Atlas
  module Rb
    # Hosts the executable while containing process-global exit behavior.
    class CliHost
      # Runs atlas-rb arguments and returns the requested process status.
      def run(arguments)
        catch(:atlas_rb_exit) do
          return CompositionRoot.new.create_cli.run(arguments.dup)
        end
      end
    end
  end
end
