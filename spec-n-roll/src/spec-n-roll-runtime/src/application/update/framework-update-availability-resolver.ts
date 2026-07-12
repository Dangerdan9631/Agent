import type { ProjectFrameworkUpdateAvailability } from 'spec-n-roll-sdk';

/**
 * Resolves availability for framework update actions from source and version metadata.
 */
export class FrameworkUpdateAvailabilityResolver {
  /**
   * Resolves whether a project-local framework may be updated.
   *
   * @param dispatcherSource - Dispatcher installation source.
   * @param localVersion - Project-local runtime version.
   * @param dispatcherVersion - Dispatcher version providing the global framework.
   * @returns Availability and a disabled explanation when current.
   */
  project(dispatcherSource: 'local' | 'remote', localVersion: string, dispatcherVersion: string): ProjectFrameworkUpdateAvailability {
    if (dispatcherSource === 'local' || this.compare(localVersion, dispatcherVersion) < 0) return { enabled: true };
    return { enabled: false, disabledReason: 'Project framework is current.' };
  }

  /**
   * Compares semantic version numeric components.
   *
   * @param left - First version to compare.
   * @param right - Second version to compare.
   * @returns Positive when left is newer, zero when equal, negative when older.
   */
  private compare(left: string, right: string): number {
    const read = (value: string): readonly number[] => value.replace(/^v/, '').split('-')[0]!.split('.').map((part) => Number(part) || 0);
    const leftParts = read(left);
    const rightParts = read(right);
    for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
      const result = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
      if (result !== 0) return result;
    }
    return 0;
  }
}
