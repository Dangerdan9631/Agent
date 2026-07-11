import type {
  ArchitectureConfig,
  ArchitectureFolderDiagramConfig,
} from '#arch/application/config/architecture-config.js';

/**
 * Applies user-configured exclusions to architecture graph dependencies and project files.
 */
export class ArchitectureExclusionFilter {
  /**
   * Creates an architecture exclusion filter.
   *
   * @param config - User-editable architecture diagram configuration.
   */
  constructor(private readonly config: ArchitectureConfig = {}) {}

  /**
   * Creates an exclusion filter for a configured folder diagram.
   *
   * @param packageName - Workspace package name containing the folder diagram.
   * @param folderDiagram - Folder diagram configuration with optional exclusion overrides.
   * @returns Exclusion filter using folder overrides when present and package defaults otherwise.
   */
  forFolderDiagram(
    packageName: string,
    folderDiagram: ArchitectureFolderDiagramConfig,
  ): ArchitectureExclusionFilter {
    return new ArchitectureExclusionFilter({
      exclusions: {
        landscape: this.config.exclusions?.landscape,
        projectFiles: {
          allPackages: this.config.exclusions?.projectFiles?.allPackages,
          packages: {
            [packageName]:
              folderDiagram.exclusions?.projectFiles ??
              this.config.exclusions?.projectFiles?.packages?.[packageName] ??
              [],
          },
        },
      },
    });
  }

  /**
   * Checks whether an external dependency should be excluded from the landscape diagram.
   *
   * @param dependencyName - Displayed external dependency name, such as "tslog" or "fs".
   * @returns true when the external dependency is configured for project exclusion.
   */
  excludesLandscapeDependency(dependencyName: string): boolean {
    return new Set(this.config.exclusions?.landscape ?? []).has(dependencyName);
  }

  /**
   * Checks whether a project node should be excluded from a package graph.
   *
   * @param packageName - Workspace package name containing the file.
   * @param nodeName - Node name relative to the package source root, without a file extension.
   * @returns true when a global or package-specific project node pattern excludes the node.
   */
  excludesProjectNode(packageName: string, nodeName: string): boolean {
    const patterns = [
      ...(this.config.exclusions?.projectFiles?.allPackages ?? []),
      ...(this.config.exclusions?.projectFiles?.packages?.[packageName] ?? []),
    ];
    const normalizedNodeName = nodeName.replaceAll('\\', '/');

    return patterns.some((pattern) =>
      this.matchesProjectNodePattern(pattern, normalizedNodeName),
    );
  }

  private matchesProjectNodePattern(
    pattern: string,
    nodeName: string,
  ): boolean {
    const normalizedPattern = pattern.replaceAll('\\', '/');
    if (!this.isGlobPattern(normalizedPattern)) {
      return normalizedPattern === nodeName;
    }

    return this.globExpression(normalizedPattern).test(nodeName);
  }

  private isGlobPattern(pattern: string): boolean {
    return /[*?[\]]/u.test(pattern);
  }

  private globExpression(pattern: string): RegExp {
    let expression = '^';
    for (let index = 0; index < pattern.length; index += 1) {
      const character = pattern[index];
      const nextCharacter = pattern[index + 1];

      if (character === '*' && nextCharacter === '*') {
        if (pattern[index + 2] === '/') {
          expression += '(?:.*/)?';
          index += 2;
        } else {
          expression += '.*';
          index += 1;
        }
      } else if (character === '*') {
        expression += '[^/]*';
      } else if (character === '?') {
        expression += '[^/]';
      } else {
        expression += this.escapeRegularExpressionCharacter(character);
      }
    }

    return new RegExp(`${expression}$`, 'u');
  }

  private escapeRegularExpressionCharacter(character: string): string {
    return /[\\^$.*+?()[\]{}|]/u.test(character) ? `\\${character}` : character;
  }
}
