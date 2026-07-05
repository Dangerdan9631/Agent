import { basename, extname } from 'node:path';
import type { CytoscapeElement } from '#arch/application/graph/cytoscape-element.js';

/**
 * Builds Cytoscape compound nodes that represent nested source directories.
 */
export class DirectoryCytoscapeGroupBuilder {
  /**
   * Creates directory group nodes for a file path and returns the leaf group and file label.
   *
   * @param filePath - Source file path used as the stable graph node identifier.
   * @param relativePath - Package-relative path in slash-separated form.
   * @param rootParentId - Optional parent group identifier that owns the first directory segment.
   * @returns Directory group nodes, the deepest parent id, and a filename label without its extension.
   */
  build(
    filePath: string,
    relativePath: string,
    rootParentId?: string,
  ): {
    groups: CytoscapeElement[];
    parentId?: string;
    fileLabel: string;
  } {
    const pathSegments = relativePath.replaceAll('\\', '/').split('/');
    const fileName = pathSegments.at(-1) ?? relativePath;
    const directorySegments = pathSegments.slice(0, -1);
    const groups: CytoscapeElement[] = [];
    let parentId = rootParentId;
    let groupPath = '';

    for (const directorySegment of directorySegments) {
      groupPath = groupPath
        ? `${groupPath}/${directorySegment}`
        : directorySegment;
      const groupId = this.groupId(filePath, groupPath, rootParentId);
      groups.push({
        data: {
          id: groupId,
          label: directorySegment,
          ...(parentId ? { parent: parentId } : {}),
        },
      });
      parentId = groupId;
    }

    return {
      groups,
      parentId,
      fileLabel: this.fileLabel(fileName),
    };
  }

  private groupId(
    filePath: string,
    groupPath: string,
    rootParentId?: string,
  ): string {
    const sourceRootMatch = /^(.*?\/src\/[^/]+\/src\/)/u.exec(
      filePath.replaceAll('\\', '/'),
    );
    const namespace = rootParentId ?? sourceRootMatch?.[1] ?? 'root';

    return `directory:${namespace}:${groupPath}`;
  }

  private fileLabel(fileName: string): string {
    const extension = extname(fileName);
    const label = basename(fileName, extension);

    return label || fileName;
  }
}
