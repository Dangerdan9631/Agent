import { readProjectMetadata } from '../../../core/project-metadata.js';
import type { ProjectMetadata } from '../../../config/schema.js';

/**
 * Read-only project metadata prepared for the project screen.
 */
export interface ProjectMetadataView {
  /**
   * Counter value for the next task spec id allocation, or null when metadata is absent.
   */
  nextTaskSpecId: number | null;
  /**
   * Current task spec id claimed for implementation, or null when none is active.
   */
  currentTaskSpecId: string | null;
  /**
   * Current task spec slug paired with `currentTaskSpecId`, or null when none is active.
   */
  currentTaskSlug: string | null;
  /**
   * ISO timestamp for when implementation began, or null when absent.
   */
  implementationStartedAt: string | null;
  /**
   * Raw parsed metadata for future edit flows.
   */
  raw: ProjectMetadata | null;
}

/**
 * Loads project metadata for read-only display.
 *
 * @param projectRoot - Absolute path to the project root.
 * @returns Project metadata view fields with nulls when metadata is absent.
 */
export async function loadProjectMetadataView(projectRoot: string): Promise<ProjectMetadataView> {
  const metadata = await readProjectMetadata(projectRoot);

  return {
    nextTaskSpecId: metadata?.nextTaskSpecId ?? null,
    currentTaskSpecId: metadata?.currentTaskSpecId ?? null,
    currentTaskSlug: metadata?.currentTaskSlug ?? null,
    implementationStartedAt: metadata?.implementationStartedAt ?? null,
    raw: metadata,
  };
}
