import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';

import { useSession } from '../../app/session-context.js';
import type { RoutedScreenProps } from '../../app/routed-screen-props.js';
import { SelectableList, type SelectableListItem } from '../../components/SelectableList.js';
import { RouteContentLayout } from '../../components/RouteContentLayout.js';
import type {
  ContextContentState,
  SelectedOptionContext,
} from '../../components/ContextContent.js';
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
export type ProjectMetadataViewScreenProps = RoutedScreenProps;

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
 * Builds read-only overview context for project metadata.
 *
 * @param metadata - Loaded project metadata used to describe the view.
 * @returns Selected option context for the project overview.
 */
function projectOverviewContext(metadata: ProjectMetadataView): SelectedOptionContext {
  return {
    id: 'project:overview',
    title: 'Project Metadata',
    summary: `Current task: ${formatCurrentTask(metadata)}.`,
    status: metadata.raw == null ? 'Metadata file is missing.' : 'Metadata file is loaded.',
    details: [
      `Next task spec id: ${metadata.nextTaskSpecId ?? 'unknown'}.`,
      `Implementation started: ${metadata.implementationStartedAt ?? 'none'}.`,
    ],
    warnings: metadata.raw == null ? ['Create project metadata before editing values.'] : [],
    nextStep: 'Focus the edit action to change project metadata.',
  };
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
 * @param props - Route slot row budget from app scaffolding.
 * @returns React element for the project metadata screen.
 */
export function ProjectMetadataViewScreen(
  props: ProjectMetadataViewScreenProps,
): React.ReactElement {
  const session = useSession();
  const [metadata, setMetadata] = useState<ProjectMetadataView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedContext, setSelectedContext] = useState<SelectedOptionContext | undefined>();
  const items = useMemo(
    () => (metadata == null ? [] : [buildEditMetadataAction(metadata)]),
    [metadata],
  );
  const contextState = useMemo((): ContextContentState => {
    if (metadata == null) {
      return {
        routeTitle: 'Project',
        fallbackSummary: 'Inspect current task ownership and id allocation.',
      };
    }

    return {
      routeTitle: 'Project',
      fallbackSummary: 'Inspect current task ownership and id allocation.',
      selectedContext: selectedContext ?? projectOverviewContext(metadata),
    };
  }, [metadata, selectedContext]);
  const editMetadata = useCallback((): void => {
    session.pushRoute('project-metadata-edit');
  }, [session]);
  const reportFocusedContext = useCallback((item: ProjectMetadataActionItem | undefined): void => {
    setSelectedContext(item?.context);
  }, []);

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
      <Box
        flexDirection="column"
        height={props.routeContentRows > 0 ? props.routeContentRows : undefined}
      >
        <Text bold>Project</Text>
        <Text color="red">{error}</Text>
      </Box>
    );
  }

  if (metadata == null) {
    return (
      <Box
        flexDirection="column"
        height={props.routeContentRows > 0 ? props.routeContentRows : undefined}
      >
        <Text bold>Project</Text>
        <Text color="gray">Loading project metadata...</Text>
      </Box>
    );
  }

  return (
    <RouteContentLayout
      routeContentRows={props.routeContentRows}
      contextState={contextState}
      selection={
        <SelectableList
          items={items}
          onFocusChange={reportFocusedContext}
          onSelect={() => editMetadata()}
        />
      }
    />
  );
}
