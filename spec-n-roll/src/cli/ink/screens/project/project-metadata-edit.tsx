import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';

import {
  readProjectMetadata,
  writeProjectMetadata,
  type ProjectMetadataWriteInput,
} from '../../../../core/project-metadata.js';
import { resolveTaskSpecSlug } from '../../../../core/task-lifecycle.js';
import type { ProjectMetadata } from '../../../../config/schema.js';
import { useSession } from '../../app/session-context.js';
import type { RoutedScreenProps } from '../../app/routed-screen-props.js';

/**
 * Input accepted by the interactive project metadata mutation path.
 */
export interface InteractiveProjectMetadataWriteInput {
  /**
   * Absolute path to the initialized project root.
   */
  projectRoot: string;
  /**
   * Metadata fields to merge into project-metadata.json.
   */
  metadata: ProjectMetadataWriteInput;
}

/**
 * Applies the interactive project metadata mutation through the core writer.
 *
 * @param input - Project root and metadata fields to persist.
 * @returns Persisted project metadata.
 */
export async function applyInteractiveProjectMetadataWrite(
  input: InteractiveProjectMetadataWriteInput,
): Promise<ProjectMetadata> {
  const currentTaskSlug =
    input.metadata.currentTaskSpecId != null
      ? await resolveTaskSpecSlug(input.projectRoot, input.metadata.currentTaskSpecId)
      : input.metadata.currentTaskSlug;

  return writeProjectMetadata(input.projectRoot, {
    ...input.metadata,
    currentTaskSlug,
  });
}

/**
 * Editable project metadata field ids.
 */
type MetadataFieldId = 'nextTaskSpecId' | 'currentTaskSpecId' | 'implementationStartedAt';

/**
 * Ordered metadata fields edited by the compact terminal form.
 */
const METADATA_FIELDS: readonly MetadataFieldId[] = [
  'nextTaskSpecId',
  'currentTaskSpecId',
  'implementationStartedAt',
];

/**
 * Formats metadata values as editable field text.
 *
 * @param metadata - Existing project metadata or null when absent.
 * @returns Field text keyed by editable metadata field id.
 */
function metadataToFields(metadata: ProjectMetadata | null): Record<MetadataFieldId, string> {
  return {
    nextTaskSpecId: String(metadata?.nextTaskSpecId ?? 1),
    currentTaskSpecId: metadata?.currentTaskSpecId ?? '',
    implementationStartedAt: metadata?.implementationStartedAt ?? '',
  };
}

/**
 * Builds write input from editable metadata field text.
 *
 * @param fields - Current field text keyed by metadata field id.
 * @returns Metadata write input for the core writer.
 */
function fieldsToMetadataInput(fields: Record<MetadataFieldId, string>): ProjectMetadataWriteInput {
  return {
    nextTaskSpecId: Number(fields.nextTaskSpecId),
    currentTaskSpecId:
      fields.currentTaskSpecId.trim().length > 0 ? fields.currentTaskSpecId.trim() : null,
    currentTaskSlug: fields.currentTaskSpecId.trim().length > 0 ? undefined : null,
    implementationStartedAt:
      fields.implementationStartedAt.trim().length > 0
        ? fields.implementationStartedAt.trim()
        : null,
  };
}

/**
 * Renders a keyboard-editable project metadata form.
 *
 * @returns React element for the project metadata edit screen.
 */
export function ProjectMetadataEditScreen(props: RoutedScreenProps): React.ReactElement {
  const session = useSession();
  const [fieldIndex, setFieldIndex] = useState(0);
  const [fields, setFields] = useState<Record<MetadataFieldId, string>>(metadataToFields(null));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const slotHeight = props.routeContentRows > 0 ? props.routeContentRows : undefined;

  useEffect(() => {
    let active = true;
    void readProjectMetadata(session.projectRoot)
      .then((metadata) => {
        if (active) {
          setFields(metadataToFields(metadata));
        }
      })
      .catch((unknownError: unknown) => {
        if (active) {
          const text = unknownError instanceof Error ? unknownError.message : String(unknownError);
          setError(text);
        }
      });

    return () => {
      active = false;
    };
  }, [session.projectRoot]);

  useInput((input, key) => {
    const fieldId = METADATA_FIELDS[fieldIndex] ?? 'nextTaskSpecId';

    if (key.upArrow) {
      setFieldIndex((current) => Math.max(0, current - 1));
      return;
    }

    if (key.downArrow || input === '\t') {
      setFieldIndex((current) => Math.min(METADATA_FIELDS.length - 1, current + 1));
      return;
    }

    if (key.backspace || key.delete) {
      setFields((current) => ({ ...current, [fieldId]: current[fieldId].slice(0, -1) }));
      return;
    }

    if (key.return) {
      setError(null);
      void applyInteractiveProjectMetadataWrite({
        projectRoot: session.projectRoot,
        metadata: fieldsToMetadataInput(fields),
      })
        .then((metadata) => {
          setMessage(`metadata updated: next ${metadata.nextTaskSpecId}`);
        })
        .catch((unknownError: unknown) => {
          const text = unknownError instanceof Error ? unknownError.message : String(unknownError);
          setError(text);
        });
      return;
    }

    if (/^[A-Za-z0-9:.\-+Z]$/.test(input)) {
      setFields((current) => ({ ...current, [fieldId]: `${current[fieldId]}${input}` }));
    }
  });

  return (
    <Box flexDirection="column" height={slotHeight}>
      <Text bold>Edit Project Metadata</Text>
      {METADATA_FIELDS.map((field, index) => (
        <Text key={field} color={index === fieldIndex ? 'cyan' : undefined}>
          {index === fieldIndex ? '>' : ' '} {field}: {fields[field] || '_'}
        </Text>
      ))}
      <Text color="gray">Up/Down move, Enter apply</Text>
      {message != null ? <Text color="green">{message}</Text> : null}
      {error != null ? <Text color="red">{error}</Text> : null}
    </Box>
  );
}
