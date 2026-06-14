import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';

import { useSession } from '../../app/session-context.js';
import type { RoutedScreenProps } from '../../app/routed-screen-props.js';
import { StaticContentBlock } from '../../components/StaticContentBlock.js';
import {
  loadManifestoView,
  type ManifestoFileView,
  type ManifestoView,
} from '../../read-models/manifesto.js';

/**
 * Props for the read-only manifesto view screen.
 */
export type ManifestoViewScreenProps = RoutedScreenProps;

/**
 * Truncates long manifesto bodies for terminal display.
 *
 * @param content - Raw manifesto markdown body.
 * @param maxLines - Maximum number of lines to show before truncation.
 * @returns Display text with an ellipsis marker when truncated.
 */
function truncateManifestoContent(content: string, maxLines: number): string {
  const lines = content.split('\n');
  if (lines.length <= maxLines) {
    return content;
  }

  return `${lines.slice(0, maxLines).join('\n')}\n... (${lines.length - maxLines} more lines)`;
}

/**
 * Builds static summary fields for one manifesto file view.
 *
 * @param manifesto - Manifesto file view to summarize.
 * @returns Static content fields for the summary block.
 */
function buildManifestoSummaryFields(manifesto: ManifestoFileView): Array<{ label: string; value: string }> {
  const fields = [
    { label: 'Scope', value: manifesto.scope },
    { label: 'Path', value: manifesto.path },
    { label: 'Exists', value: manifesto.exists ? 'yes' : 'no' },
  ];

  if (manifesto.stepId != null) {
    fields.splice(1, 0, { label: 'Step', value: manifesto.stepId });
  }

  if (manifesto.orphan === true) {
    fields.push({ label: 'Orphan', value: 'not registered in workflow config' });
  }

  return fields;
}

/**
 * Renders one manifesto section with summary fields and preview text.
 *
 * @param manifesto - Manifesto file view to render.
 * @returns React element for the manifesto section.
 */
function ManifestoSection(props: { manifesto: ManifestoFileView }): React.ReactElement {
  const { manifesto } = props;
  const title =
    manifesto.scope === 'global'
      ? 'Global Manifesto'
      : `Step Manifesto: ${manifesto.stepId ?? 'unknown'}`;

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold>{title}</Text>
      <StaticContentBlock fields={buildManifestoSummaryFields(manifesto)} />
      {manifesto.content == null ? (
        <Text color="gray">No manifesto file defined.</Text>
      ) : (
        <Text>{truncateManifestoContent(manifesto.content, 12)}</Text>
      )}
      <Text color="gray">Author edits via /spec-n-manifesto</Text>
    </Box>
  );
}

/**
 * Renders global and step manifestos in a read-only Ink view.
 *
 * @param props - Route slot row budget from app scaffolding.
 * @returns React element for the manifesto view screen.
 */
export function ManifestoViewScreen(props: ManifestoViewScreenProps): React.ReactElement {
  const session = useSession();
  const [view, setView] = useState<ManifestoView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void loadManifestoView(session.projectRoot)
      .then((loaded) => {
        if (active) {
          setView(loaded);
        }
      })
      .catch((unknownError: unknown) => {
        if (active) {
          const message = unknownError instanceof Error ? unknownError.message : String(unknownError);
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
        <Text bold>Spec Manifestos</Text>
        <Text color="red">{error}</Text>
      </Box>
    );
  }

  if (view == null) {
    return (
      <Box
        flexDirection="column"
        height={props.routeContentRows > 0 ? props.routeContentRows : undefined}
      >
        <Text bold>Spec Manifestos</Text>
        <Text color="gray">Loading manifestos...</Text>
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      height={props.routeContentRows > 0 ? props.routeContentRows : undefined}
    >
      <Text bold>Spec Manifestos</Text>
      <ManifestoSection manifesto={view.global} />
      {view.stepManifestos.length === 0 ? (
        <Text color="gray">No step manifestos defined.</Text>
      ) : (
        view.stepManifestos.map((manifesto) => (
          <ManifestoSection key={manifesto.path} manifesto={manifesto} />
        ))
      )}
    </Box>
  );
}
