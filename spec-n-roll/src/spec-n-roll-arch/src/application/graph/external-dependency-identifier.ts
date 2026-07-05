/**
 * Dependency metadata used to classify a module reference as external or internal.
 */
export type ExternalDependencyReference = {
  /** Import specifier as written in source, such as "tslog" or "node:path". */
  module: string;
  /** Resolved file path or bare module name from dependency-cruiser. */
  resolved: string;
  /** True when the dependency is a Node.js built-in module. */
  coreModule?: boolean;
};

/**
 * Identifies external npm and Node.js core dependencies from dependency-cruiser metadata.
 */
export class ExternalDependencyIdentifier {
  /**
   * Returns a stable external node id when the dependency is not a project-internal file.
   *
   * @param dependency - Dependency-cruiser module reference to classify.
   * @returns An `external:<name>` id, or undefined when the dependency is internal.
   */
  identify(dependency: ExternalDependencyReference): string | undefined {
    if (dependency.coreModule) {
      return `external:${dependency.module}`;
    }

    const nodeModulesPackageName = this.nodeModulesPackageName(
      dependency.resolved,
    );
    if (nodeModulesPackageName) {
      return `external:${nodeModulesPackageName}`;
    }

    if (this.isBareExternalModule(dependency.resolved)) {
      return `external:${dependency.module}`;
    }

    return undefined;
  }

  /**
   * Strips the `external:` prefix from an external dependency node id.
   *
   * @param externalId - External node id produced by {@link identify}.
   * @returns Display and exclusion-list name, such as "tslog" or "node:path".
   */
  label(externalId: string): string {
    return externalId.startsWith('external:')
      ? externalId.slice('external:'.length)
      : externalId;
  }

  /**
   * True when an id or dependency-cruiser flag marks a Node.js core module.
   *
   * @param id - Normalized dependency id.
   * @param coreModule - Optional dependency-cruiser core-module flag.
   * @returns true when the dependency should render as an external core module.
   */
  isExternalDependency(id: string, coreModule = false): boolean {
    return coreModule || id.startsWith('external:');
  }

  private nodeModulesPackageName(filePath: string): string | undefined {
    const normalizedPath = filePath.replaceAll('\\', '/');
    const nodeModulesIndex = normalizedPath.lastIndexOf('/node_modules/');
    const packagePath =
      nodeModulesIndex >= 0
        ? normalizedPath.slice(nodeModulesIndex + '/node_modules/'.length)
        : normalizedPath.startsWith('node_modules/')
          ? normalizedPath.slice('node_modules/'.length)
          : undefined;

    if (!packagePath) {
      return undefined;
    }

    const packageSegments = packagePath.split('/');
    if (packageSegments[0]?.startsWith('@')) {
      return packageSegments.slice(0, 2).join('/');
    }

    return packageSegments[0];
  }

  private isBareExternalModule(resolved: string): boolean {
    return !resolved.includes('/') && !resolved.startsWith('spec-n-roll');
  }
}
