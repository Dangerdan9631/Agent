import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';

import { useSession } from '../../app/session-context.js';
import { homeRouteIdFor, type RouteId } from '../../app/navigation.js';
import type { RoutedScreenProps } from '../../app/routed-screen-props.js';
import { SelectableList, type SelectableListItem } from '../../components/SelectableList.js';
import { RouteContentLayout } from '../../components/RouteContentLayout.js';
import type {
  ContextContentState,
  SelectedOptionContext,
} from '../../components/ContextContent.js';
import {
  appendBackMenuItem,
  isBackMenuItem,
  type BackMenuItem,
} from '../../components/menu/back-menu-item.js';
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
    details: [`Next task spec id: ${metadata.nextTaskSpecId ?? 'unknown'}.`],
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
 * Resolves the parent route id used when building a Back row.
 *
 * @param navigationStack - Current navigation stack entries.
 * @param binaryContext - Active CLI invocation target.
 * @returns Parent route id for the Back row.
 */
function parentRouteId(
  navigationStack: readonly { routeId: RouteId }[],
  binaryContext: 'local' | 'global',
): RouteId {
  return navigationStack.at(-2)?.routeId ?? homeRouteIdFor(binaryContext);
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
  const dataItems = useMemo(
    () => (metadata == null ? [] : [buildEditMetadataAction(metadata)]),
    [metadata],
  );
  const items = useMemo((): readonly (ProjectMetadataActionItem | BackMenuItem)[] => {
    if (metadata == null) {
      return [];
    }

    return appendBackMenuItem(
      dataItems,
      parentRouteId(session.navigationStack, session.binaryContext),
    );
  }, [dataItems, metadata, session.binaryContext, session.navigationStack]);
  const backItem = useMemo(
    () => items.find((item): item is BackMenuItem => isBackMenuItem(item)),
    [items],
  );
  const contextState = useMemo((): ContextContentState => {
    if (metadata == null) {
      return {
        routeTitle: 'Project Metadata',
      };
    }

    return {
      routeTitle: 'Project Metadata',
      selectedContext: selectedContext ?? projectOverviewContext(metadata),
    };
  }, [metadata, selectedContext]);
  const editMetadata = useCallback((): void => {
    session.pushRoute('project-metadata-edit');
  }, [session]);
  const handleSelect = useCallback(
    (item: ProjectMetadataActionItem | BackMenuItem): void => {
      if (isBackMenuItem(item)) {
        session.popRoute();
        return;
      }

      editMetadata();
    },
    [editMetadata, session],
  );
  const reportFocusedContext = useCallback(
    (item: ProjectMetadataActionItem | BackMenuItem | undefined): void => {
      if (item == null || isBackMenuItem(item)) {
        setSelectedContext(undefined);
        return;
      }

      setSelectedContext(item.context);
    },
    [],
  );

  useInput((input) => {
    if (backItem != null && input === backItem.key) {
      session.popRoute();
      return;
    }

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
        <Text bold>Project Metadata</Text>
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
        <Text bold>Project Metadata</Text>
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
          onSelect={handleSelect}
        />
      }
    />
  );
}
