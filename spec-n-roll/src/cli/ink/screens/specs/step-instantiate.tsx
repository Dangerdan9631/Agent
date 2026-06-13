import React, { useState } from 'react';
import { Box, Text } from 'ink';

import { instantiateStepOutput } from '../../../../core/templates.js';
import type { TaskSpecIdentity } from '../../../../workflow/engine.js';
import { useSession } from '../../app/session-context.js';
import type { RoutedScreenProps } from '../../app/routed-screen-props.js';
import { SelectableList, type SelectableListItem } from '../../components/SelectableList.js';

/**
 * Input accepted by the interactive step instantiate path.
 */
export interface InteractiveStepInstantiateInput {
  /**
   * Absolute path to the initialized project root.
   */
  projectRoot: string;
  /**
   * Task spec identity selected for mutation.
   */
  taskSpec: TaskSpecIdentity;
  /**
   * Built-in workflow step id whose artifact template should be copied.
   */
  stepId: string;
  /**
   * Optional frontmatter values used when instantiating `spec.md`.
   */
  frontmatter?: Record<string, unknown>;
}

/**
 * Selectable built-in step artifact template.
 */
interface StepTemplateItem extends SelectableListItem {
  /**
   * Built-in workflow step id passed to the core template writer.
   */
  stepId: string;
}

/**
 * Built-in step templates supported by core template instantiation.
 */
const STEP_TEMPLATE_ITEMS: readonly StepTemplateItem[] = [
  { id: 'specify', label: 'specify', description: 'spec.md', stepId: 'specify' },
  { id: 'plan', label: 'plan', description: 'plan.md', stepId: 'plan' },
  { id: 'tasks', label: 'tasks', description: 'tasks.md', stepId: 'tasks' },
];

/**
 * Applies step artifact instantiation through the core template writer.
 *
 * @param input - Project, selected task spec, step id, and optional frontmatter.
 * @returns Project-relative path to the instantiated artifact.
 */
export async function applyInteractiveStepInstantiate(
  input: InteractiveStepInstantiateInput,
): Promise<string> {
  return instantiateStepOutput(
    input.projectRoot,
    input.taskSpec.taskSpecId,
    input.taskSpec.slug,
    input.stepId,
    { frontmatter: input.frontmatter },
  );
}

/**
 * Renders built-in step output choices for the selected task spec.
 *
 * @returns React element for the step instantiate screen.
 */
export function StepInstantiateScreen(_props: RoutedScreenProps): React.ReactElement {
  const session = useSession();
  const selected = session.selectedTaskSpec;
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const instantiate = (item: StepTemplateItem): void => {
    if (selected == null) {
      return;
    }

    setError(null);
    void applyInteractiveStepInstantiate({
      projectRoot: session.projectRoot,
      taskSpec: selected,
      stepId: item.stepId,
    })
      .then((relativePath) => {
        setMessage(`instantiated: ${relativePath}`);
      })
      .catch((unknownError: unknown) => {
        const text = unknownError instanceof Error ? unknownError.message : String(unknownError);
        setError(text);
      });
  };

  return (
    <Box flexDirection="column">
      <Text bold>Instantiate Step Output</Text>
      {selected == null ? (
        <Text color="yellow">No task spec is selected.</Text>
      ) : (
        <>
          <Text color="gray">target: {selected.label}</Text>
          <SelectableList items={STEP_TEMPLATE_ITEMS} onSelect={instantiate} />
        </>
      )}
      {message != null ? <Text color="green">{message}</Text> : null}
      {error != null ? <Text color="red">{error}</Text> : null}
    </Box>
  );
}
