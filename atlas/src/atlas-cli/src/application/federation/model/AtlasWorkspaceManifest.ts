/**
 * Selects the independently generated module models that form one federated Atlas workspace.
 */
export interface AtlasWorkspaceManifest {
  /** The independently versioned workspace-manifest schema. */
  readonly schemaVersion: 1;
  /** Manifest entries in deterministic artifact-ID order. */
  readonly modules: readonly AtlasWorkspaceManifestEntry[];
}

/**
 * Locates one model file and asserts the artifact identity expected by the manifest.
 */
export interface AtlasWorkspaceManifestEntry {
  /** Expected opaque artifact ID. */
  readonly moduleId: string;
  /** Manifest-relative, slash-normalized model path. */
  readonly modelPath: string;
}
