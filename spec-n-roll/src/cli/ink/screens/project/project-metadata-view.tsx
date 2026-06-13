import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';

import { useSession } from '../../app/session-context.js';
import {
  loadProjectMetadataView,
  type ProjectMetadataView,
} from '../../read-models/project-metadata.js';

/**
 * Formats the current task metadata for display.
 *
 * @param metadata - Project metadata view to summarize.
 * @returns Current task label or `none`.
 */
function formatCurrentTask(metadata: ProjectMetadataView): string {
  if (metadata.currentTaskSpecId == null || metadata.currentTaskSlug == null) {
    return 'none';
  }

  return `${metadata.currentTaskSpecId}-${metadata.currentTaskSlug}`;
}

/**
 * Renders project metadata in a read-only view.
 *
 * @returns React element for the project metadata screen.
 */
export function ProjectMetadataViewScreen(): React.ReactElement {
  const session = useSession();
  const [metadata, setMetadata] = useState<ProjectMetadataView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useInput((input) => {
    if (input === 'e') {
      session.pushRoute('project-metadata-edit');
    }
  });

  useEffect(() => {
    let active = true;
    void loadProjectMetadataView(session.projectRoot)
      .then((result) => {
        if (active) {
          setMetadata(result);
        }
      })
      .catch((unknownError: unknown) => {
        if (active) {
          const message =
            unknownError instanceof Error ? unknownError.message : String(unknownError);
          setError(message);
        }
      });

    return () => {
      active = false;
    };
  }, [session.projectRoot]);

  if (error != null) {
    return (
      <Box flexDirection="column">
        <Text bold>Project</Text>
        <Text color="red">{error}</Text>
      </Box>
    );
  }

  if (metadata == null) {
    return (
      <Box flexDirection="column">
        <Text bold>Project</Text>
        <Text color="gray">Loading project metadata...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold>Project</Text>
      <Text>next task spec id: {metadata.nextTaskSpecId ?? 'unknown'}</Text>
      <Text>current task: {formatCurrentTask(metadata)}</Text>
      <Text>implementation started: {metadata.implementationStartedAt ?? 'none'}</Text>
      <Text>metadata status: {metadata.raw == null ? 'missing' : 'loaded'}</Text>
      <Text color="gray">e edit</Text>
    </Box>
  );
}
