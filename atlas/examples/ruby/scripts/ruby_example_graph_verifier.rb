# frozen_string_literal: true

require "json"
require "pathname"
require "set"

# Verifies the persisted diagram contract produced by the Ruby example.
# It checks graph integrity, layout coverage, language metadata, and key semantic edges.
class RubyExampleGraphVerifier
  # Diagram scopes that the Ruby example configuration must generate.
  # Exact matching detects missing scopes as well as unintended output drift.
  EXPECTED_SCOPES = %w[
    folder:atlas-example-web:app/controllers
    group:ruby-catalog
    landscape
    package:atlas-example-application
    package:atlas-example-domain
    package:atlas-example-web
  ].freeze

  # Creates a verifier rooted at one generated artifact directory.
  # The path must contain `atlas-diagrams.json` and its referenced artifacts.
  def initialize(artifact_root)
    @artifact_root = File.realpath(artifact_root)
    @graphs_by_scope = {}
  end

  # Verifies every generated diagram and returns the number of valid scopes.
  def verify
    index = read_document("atlas-diagrams.json")
    assert(index["schemaVersion"] == 1, "diagram index must use schema version 1")
    diagrams = index.fetch("diagrams")
    scopes = diagrams.map { |diagram| diagram.fetch("scope") }
    assert(scopes == scopes.sort, "diagram scopes must be deterministic")
    assert(scopes == EXPECTED_SCOPES, "diagram scopes differ from the Ruby example contract")
    diagrams.each { |diagram| verify_diagram(diagram) }
    verify_semantic_edges
    diagrams.length
  end

  private

  def verify_diagram(diagram)
    scope = diagram.fetch("scope")
    graph = read_document(diagram.fetch("graphPath"))
    layout = read_document(diagram.fetch("layoutPath"))
    nodes = graph.dig("elements", "nodes")
    edges = graph.dig("elements", "edges")
    assert(nodes.is_a?(Array) && !nodes.empty?, "#{scope} must contain nodes")
    assert(edges.is_a?(Array), "#{scope} must contain an edge collection")
    verify_identifiers(scope, nodes, edges)
    verify_layout(scope, nodes, edges, layout)
    verify_ruby_metadata(scope, nodes)
    @graphs_by_scope[scope] = graph
  end

  def verify_identifiers(scope, nodes, edges)
    node_ids = nodes.map { |node| node.dig("data", "id") }
    edge_ids = edges.map { |edge| edge.dig("data", "id") }
    assert(node_ids.none?(&:nil?) && node_ids.uniq.length == node_ids.length, "#{scope} has invalid node identifiers")
    assert(edge_ids.none?(&:nil?) && edge_ids.uniq.length == edge_ids.length, "#{scope} has invalid edge identifiers")
    known_nodes = node_ids.to_set
    edges.each do |edge|
      source = edge.dig("data", "source")
      target = edge.dig("data", "target")
      assert(known_nodes.include?(source), "#{scope} edge source #{source.inspect} is missing")
      assert(known_nodes.include?(target), "#{scope} edge target #{target.inspect} is missing")
    end
  end

  def verify_layout(scope, nodes, edges, layout)
    leaf_ids = nodes.reject { |node| node.dig("data", "compound") }.to_set { |node| node.dig("data", "id") }
    positions = layout.fetch("positions")
    positioned_ids = positions.map { |position| position.fetch("nodeId") }
    assert(positioned_ids.uniq.length == positioned_ids.length, "#{scope} has duplicate layout positions")
    assert(positioned_ids.to_set == leaf_ids, "#{scope} layout does not cover every leaf node exactly once")
    positions.each do |position|
      assert(coordinate?(position["x"]) && coordinate?(position["y"]), "#{scope} contains a non-finite position")
    end
    edge_ids = edges.to_set { |edge| edge.dig("data", "id") }
    hidden_ids = layout.fetch("hiddenRelationshipIds")
    assert(hidden_ids.to_set.subset?(edge_ids), "#{scope} hides unknown relationships")
  end

  def verify_ruby_metadata(scope, nodes)
    source_nodes = nodes.select { |node| node.dig("data", "sourcePath") }
    assert(!source_nodes.empty?, "#{scope} must expose Ruby source nodes")
    source_nodes.each do |node|
      data = node.fetch("data")
      assert(data["sourceLanguage"] == "ruby", "#{scope} contains non-Ruby source metadata")
      path = Pathname.new(data.fetch("sourcePath"))
      assert(!path.absolute? && !path.each_filename.include?(".."), "#{scope} contains a non-portable source path")
    end
  end

  def verify_semantic_edges
    assert_edge("landscape", "CatalogService%23find", "CatalogItem")
    assert_edge("landscape", "CatalogRecord", "CatalogItem")
    assert_edge("package:atlas-example-web", "config%2Froutes.rb", "CatalogController%23index")
  end

  def assert_edge(scope, source_fragment, target_fragment)
    edges = @graphs_by_scope.fetch(scope).dig("elements", "edges")
    found = edges.any? do |edge|
      data = edge.fetch("data")
      data.fetch("id").include?(source_fragment) && data.fetch("id").include?(target_fragment)
    end
    assert(found, "#{scope} is missing the #{source_fragment} -> #{target_fragment} semantic edge")
  end

  def read_document(relative_path)
    path = contained_path(relative_path)
    JSON.parse(File.read(path, encoding: "UTF-8"))
  rescue JSON::ParserError => e
    raise "Ruby graph verification failed: #{relative_path} is invalid JSON: #{e.message}"
  end

  def contained_path(relative_path)
    path = File.expand_path(relative_path, @artifact_root)
    root_prefix = "#{@artifact_root}#{File::SEPARATOR}"
    assert(path.start_with?(root_prefix), "artifact path escapes the Ruby output root: #{relative_path}")
    assert(File.file?(path), "artifact file does not exist: #{relative_path}")
    path
  end

  def coordinate?(value)
    value.is_a?(Numeric) && value.finite?
  end

  def assert(condition, message)
    raise "Ruby graph verification failed: #{message}" unless condition
  end
end
