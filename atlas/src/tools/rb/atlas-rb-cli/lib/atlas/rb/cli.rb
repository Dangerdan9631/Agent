# frozen_string_literal: true

require "optparse"

module Atlas
  module Rb
    # Parses the atlas-rb command and invokes one model-generation workflow.
    class Cli
      # Creates the command boundary from its workflow and output adapter.
      def initialize(workflow_factory, output_writer)
        @workflow_factory = workflow_factory
        @output_writer = output_writer
      end

      # Executes one command and returns a process-compatible exit status.
      def run(arguments)
        command = arguments.shift
        return write_usage(2, "atlas-rb requires the 'generate' command.") unless command == "generate"

        options = parse_options(arguments)
        output = @workflow_factory.call(options.fetch(:verbose)).execute(to_request(options))
        @output_writer.write_line("Generated Atlas Ruby output at #{output}.")
        0
      rescue OptionParser::ParseError, ArgumentError => e
        @output_writer.write_error(e.message)
        2
      rescue StandardError => e
        @output_writer.write_error("atlas-rb generation failed: #{e.message}")
        1
      end

      private

      def parse_options(arguments)
        options = { identity: {}, verbose: false }
        parser = OptionParser.new do |value|
          value.banner = "Usage: atlas-rb generate [options]"
          value.on("--workspace PATH", "Ruby workspace root") { |path| options[:workspace] = path }
          value.on("--module-root PATH", "Ruby module root") { |path| options[:workspace] = path }
          value.on("--config PATH", "Atlas configuration path") { |path| options[:config] = path }
          value.on("--output PATH", "Artifact output root") { |path| options[:output] = path }
          add_module_options(value, options)
          value.on("--module-id ID", "Gemless root module ID") { |id| options[:identity][:module_id] = id }
          value.on("--display-name NAME", "Gemless root display name") do |name|
            options[:identity][:display_name] = name
          end
          value.on("--version VERSION", "Gemless root version") { |version| options[:identity][:version] = version }
          value.on("--category CATEGORY", "Gemless root artifact category") do |category|
            options[:identity][:category] = category
          end
          value.on("--verbose", "Write structured generation diagnostics") { options[:verbose] = true }
          value.on("-h", "--help", "Show command help") do
            @output_writer.write_line(value.to_s)
            throw :atlas_rb_help
          end
        end
        help_requested = catch(:atlas_rb_help) do
          parser.parse!(arguments)
          false
        end
        throw :atlas_rb_exit, 0 if help_requested.nil?
        raise OptionParser::InvalidArgument, "Unexpected arguments: #{arguments.join(' ')}" unless arguments.empty?

        validate_identity(options.fetch(:identity))
        options
      end

      def add_module_options(parser, options)
        parser.on("--model-file PATH", "Exact module model output") { |path| options[:model_file] = path }
        parser.on("--gemspec-file PATH", "Exact module gemspec") { |path| options[:gemspec_file] = path }
        parser.on("--source-root PATH", "Explicit module source root") do |path|
          (options[:source_roots] ||= []) << path
        end
        parser.on("--route-file PATH", "Explicit Rails route file") do |path|
          (options[:route_files] ||= []) << path
        end
      end

      def to_request(options)
        GenerationRequest.new(
          workspace_path: options[:workspace],
          configuration_path: options[:config],
          output_path: options[:output],
          identity_overrides: options.fetch(:identity),
          model_file: options[:model_file],
          gemspec_file: options[:gemspec_file],
          source_roots: options.fetch(:source_roots, []),
          route_files: options.fetch(:route_files, [])
        )
      end

      def validate_identity(identity)
        empty = identity.find { |_key, value| value.nil? || value.strip.empty? }
        raise OptionParser::InvalidArgument, "Root identity values must be non-empty." unless empty.nil?
      end

      def write_usage(exit_code, message)
        @output_writer.write_error(message)
        exit_code
      end
    end
  end
end
