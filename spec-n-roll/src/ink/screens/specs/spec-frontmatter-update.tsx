import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

import { updateSpecFrontmatter } from '../../../sdk/core/frontmatter.js';
import type { TaskSpecIdentity } from '../../../sdk/workflow/engine.js';
import { useSession } from '../../app/session-context.js';
import type { RoutedScreenProps } from '../../app/routed-screen-props.js';

/**
 * Input accepted by the interactive spec frontmatter update path.
 */
export interface InteractiveSpecFrontmatterUpdateInput {
  /**
   * Absolute path to the initialized project root.
   */
  projectRoot: string;
  /**
   * Task spec identity selected for mutation.
   */
  taskSpec: TaskSpecIdentity;
  /**
   * Non-status frontmatter fields to merge into `spec.md`.
   */
  fields: Record<string, unknown>;
}

/**
 * Applies a spec frontmatter merge through the core frontmatter writer.
 *
 * @param input - Project, selected task spec, and frontmatter field map.
 * @returns Updated frontmatter snapshot after the merge.
 */
export async function applyInteractiveSpecFrontmatterUpdate(
  input: InteractiveSpecFrontmatterUpdateInput,
): Promise<Record<string, unknown>> {
  return updateSpecFrontmatter(
    input.projectRoot,
    input.taskSpec.taskSpecId,
    input.taskSpec.slug,
    input.fields,
  );
}

/**
 * Renders a constrained frontmatter update action for the selected task spec.
 *
 * @returns React element for the frontmatter update screen.
 */
export function SpecFrontmatterUpdateScreen(_props: RoutedScreenProps): React.ReactElement {
  const session = useSession();
  const selected = session.selectedTaskSpec;
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useInput((input) => {
    if (selected == null || input !== 'o') {
      return;
    }

    setError(null);
    void applyInteractiveSpecFrontmatterUpdate({
      projectRoot: session.projectRoot,
      taskSpec: selected,
      fields: { owner: 'interactive' },
    })
      .then((frontmatter) => {
        setMessage(`owner: ${String(frontmatter.owner)}`);
      })
      .catch((unknownError: unknown) => {
        const text = unknownError instanceof Error ? unknownError.message : String(unknownError);
        setError(text);
      });
  });

  return (
    <Box flexDirection="column">
      <Text bold>Update Frontmatter</Text>
      {selected == null ? (
        <Text color="yellow">No task spec is selected.</Text>
      ) : (
        <>
          <Text color="gray">target: {selected.label}</Text>
          <Text>Press o to set owner=interactive.</Text>
        </>
      )}
      {message != null ? <Text color="green">{message}</Text> : null}
      {error != null ? <Text color="red">{error}</Text> : null}
    </Box>
  );
}
