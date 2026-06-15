import React from 'react';
import { Box, Text } from 'ink';

/**
 * One labeled field rendered in a static content block.
 */
export interface StaticContentField {
  /**
   * Field label shown in bold before the value.
   */
  label: string;
  /**
   * Plain-text value shown after the label.
   */
  value: string;
}

/**
 * Props for rendering a stack of labeled static content fields.
 */
export interface StaticContentBlockProps {
  /**
   * Ordered fields to render as consecutive labeled lines.
   */
  fields: readonly StaticContentField[];
}

/**
 * Renders labeled bold field lines for home and manage static content areas.
 *
 * @param props - Ordered static content fields.
 * @returns React element containing labeled field lines.
 */
export function StaticContentBlock(props: StaticContentBlockProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      {props.fields.map((field) => (
        <Text key={field.label}>
          <Text bold color="blue">
            {field.label}:
          </Text>{' '}
          {field.value}
        </Text>
      ))}
    </Box>
  );
}
