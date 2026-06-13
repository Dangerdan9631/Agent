import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';

import { useSession } from '../../app/session-context.js';
import type { SelectedContextChangeHandler } from '../../app/App.js';
import { SelectableList, type SelectableListItem } from '../../components/SelectableList.js';
import { useSelectionRowContribution } from '../../components/SelectionRegion.js';
import {
  loadProjectMetadataView,
  type ProjectMetadataView,
} from '../../read-models/project-metadata.js';

/**
 * Selectable project metadata action row.
 */
interface ProjectMetadataActionItem extends SelectableListItem {
  /**
   * Number or letter key that activates this action from the project view.
   */
  key: string;
}

/**
 * Props for the project metadata view screen.
 */
export interface ProjectMetadataViewScreenProps {
  /**
   * Called when keyboard focus moves to a project action with read-only context.
   */
  onContextChange?: SelectedContextChangeHandler;
}

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
 * Builds the action row for project metadata editing.
 *
 * @param metadata - Loaded project metadata used to describe the edit context.
 * @returns Selectable project metadata action row.
 */
function buildEditMetadataAction(metadata: ProjectMetadataView): ProjectMetadataActionItem {
  return {
    id: 'edit-project-metadata',
    key: 'e',
    label: 'e Edit metadata',
    description: 'review and change project metadata',
    context: {
      id: 'project:edit-metadata',
      title: 'Edit Project Metadata',
      summary: 'Review and change project metadata values.',
      status: metadata.raw == null ? 'Metadata file is missing.' : 'Metadata file is loaded.',
      details: [
        `Next task spec id: ${metadata.nextTaskSpecId ?? 'unknown'}.`,
        `Current task: ${formatCurrentTask(metadata)}.`,
      ],
      warnings: metadata.raw == null ? ['Create project metadata before editing values.'] : [],
      nextStep: 'Open the project metadata edit screen.',
    },
  };
}

/**
 * Renders project metadata in a read-only view.
 *
 * @returns React element for the project metadata screen.
 */
export function ProjectMetadataViewScreen(
  props: ProjectMetadataViewScreenProps,
): React.ReactElement {
  const session = useSession();
  const [metadata, setMetadata] = useState<ProjectMetadataView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const items = useMemo(
    () => (metadata == null ? [] : [buildEditMetadataAction(metadata)]),
    [metadata],
  );
  const editMetadata = useCallback((): void => {
    session.pushRoute('project-metadata-edit');
  }, [session]);
  const reportFocusedContext = useCallback(
    (item: ProjectMetadataActionItem | undefined): void => {
      props.onContextChange?.(item?.context);
    },
    [props.onContextChange],
  );
  const extraRows = useMemo(() => {
    if (error != null) {
      return 2;
    }

    if (metadata == null) {
      return 2;
    }

    return 5;
  }, [error, metadata]);
  useSelectionRowContribution(extraRows);

  useInput((input) => {
    if (input === 'e') {
      editMetadata();
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
      <SelectableList
        items={items}
        onFocusChange={reportFocusedContext}
        onSelect={() => editMetadata()}
      />
    </Box>
  );
}
