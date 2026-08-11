# frozen_string_literal: true

require "json"
require "yaml"
require "minitest/autorun"
require "tmpdir"
require "atlas/rb"

module AtlasRbTestSupport
  # Supplies inert diagnostics for focused generator tests.
  class SilentLogger < Atlas::Rb::AtlasLogger
    # Discards an informational diagnostic.
    def info(_message, _context = {}) end

    # Discards a warning diagnostic.
    def warn(_message, _context = {}) end
  end

  # Creates a contained file and all required parent directories.
  def write_file(root, relative_path, content)
    path = File.join(root, relative_path)
    FileUtils.mkdir_p(File.dirname(path))
    File.write(path, content, encoding: "UTF-8")
    path
  end

  # Yields a temporary workspace under the writable Ruby package directory.
  def with_temp_directory(prefix, &)
    Dir.mktmpdir(prefix, File.expand_path("..", __dir__), &)
  end

  # Creates one minimal valid Atlas policy for the supplied modules.
  def configuration_for(module_names, package_globs: nil, source_roots: nil)
    discovery = {
      "packages" => module_names.map do |name|
        { "match" => { "name" => name }, "classification" => "runtime" }
      end
    }
    discovery["packageGlobs"] = package_globs unless package_globs.nil?
    discovery["defaultSourceRoots"] = source_roots unless source_roots.nil?
    {
      "schemaVersion" => 1,
      "discovery" => discovery,
      "artifacts" => { "root" => "architecture" }
    }
  end
end
