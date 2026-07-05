import { existsSync } from 'node:fs';
import { dirname, join, parse, resolve, type ParsedPath } from 'node:path';
import {
  SPEC_N_ROLL_CONFIG_DIRECTORY_NAME,
  type PathResolutionContext,
  type ProjectRootResolution,
} from 'spec-n-roll-api';

/**
 * Resolves Spec-N-Roll project roots from explicit roots or parent discovery.
 */
export class ProjectRootResolver {
  /**
   * Resolves the project root for one dispatcher invocation.
   *
   * @param context - Current working directory and optional caller-provided root.
   * @returns Project root resolution with the search start directory recorded.
   */
  resolve(context: PathResolutionContext): ProjectRootResolution {
    const searchStartDirectory =
      context.requestedProjectRoot == null
        ? resolve(context.cwd)
        : resolve(context.cwd, context.requestedProjectRoot);

    if (context.requestedProjectRoot != null) {
      return {
        projectRoot: searchStartDirectory,
        searchStartDirectory,
      };
    }

    return {
      projectRoot: this.findNearestProjectRoot(searchStartDirectory),
      searchStartDirectory,
    };
  }

  /**
   * Checks whether the supplied directory contains a Spec-N-Roll config folder.
   *
   * @param directory - Absolute or relative directory path to inspect.
   * @returns true when `.spec-n-roll` exists under the directory.
   */
  hasProjectConfigDirectory(directory: string): boolean {
    return existsSync(join(directory, SPEC_N_ROLL_CONFIG_DIRECTORY_NAME));
  }

  /**
   * Walks upward until a Spec-N-Roll config folder is found.
   *
   * @param startDirectory - Absolute or relative directory where discovery starts.
   * @returns Absolute project root when found, otherwise undefined.
   */
  private findNearestProjectRoot(startDirectory: string): string | undefined {
    for (
      let current = resolve(startDirectory),
        pathRoot: ParsedPath = parse(current);
      ;
      current = dirname(current)
    ) {
      if (this.hasProjectConfigDirectory(current)) {
        return current;
      }

      if (current === pathRoot.root) {
        return undefined;
      }

      pathRoot = parse(current);
    }
  }
}
