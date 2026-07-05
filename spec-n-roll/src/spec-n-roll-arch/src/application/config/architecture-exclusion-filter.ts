import { basename } from 'node:path';
import type { ArchitectureConfig } from '#arch/application/config/architecture-config.js';

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
   * Checks whether an external dependency should be excluded.
   *
   * @param dependencyName - Displayed external dependency name, such as "tslog" or "fs".
   * @returns true when the external dependency is configured for exclusion.
   */
  excludesExternalDependency(dependencyName: string): boolean {
    return new Set(this.config.exclusions?.externalDependencies ?? []).has(
      dependencyName,
    );
  }

  /**
   * Checks whether a project file should be excluded from a package graph.
   *
   * @param packageName - Workspace package name containing the file.
   * @param packageRelativePath - File path relative to the package root, using slash separators.
   * @returns true when a global or package-specific project file pattern excludes the file.
   */
  excludesProjectFile(
    packageName: string,
    packageRelativePath: string,
  ): boolean {
    const patterns = [
      ...(this.config.exclusions?.projectFiles?.allPackages ?? []),
      ...(this.config.exclusions?.projectFiles?.packages?.[packageName] ?? []),
    ];
    const normalizedPath = packageRelativePath.replaceAll('\\', '/');
    const fileName = basename(normalizedPath);

    return patterns.some((pattern) =>
      this.matchesProjectFilePattern(pattern, normalizedPath, fileName),
    );
  }

  private matchesProjectFilePattern(
    pattern: string,
    packageRelativePath: string,
    fileName: string,
  ): boolean {
    const normalizedPattern = pattern.replaceAll('\\', '/');
    if (!this.isGlobPattern(normalizedPattern)) {
      return (
        normalizedPattern === fileName ||
        normalizedPattern === packageRelativePath
      );
    }

    return this.globExpression(normalizedPattern).test(packageRelativePath);
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
