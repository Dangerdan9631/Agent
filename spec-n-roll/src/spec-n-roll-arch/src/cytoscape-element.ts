/**
 * Describes a Cytoscape node or edge element.
 */
export interface CytoscapeElement {
  /**
   * Cytoscape element payload. Nodes require an id and edges require source and target.
   */
  data: Record<string, string>;
}
