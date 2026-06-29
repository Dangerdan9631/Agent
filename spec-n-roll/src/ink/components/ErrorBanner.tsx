import React from 'react';
import { Box, Text } from 'ink';

/**
 * Recoverable error content shown inline without ending the session.
 */
export interface ErrorBannerMessage {
  /**
   * User-facing error message.
   */
  message: string;
  /**
   * Optional next step that can resolve the error.
   */
  remediation?: string;
}

/**
 * Props for an inline recoverable error banner.
 */
export interface ErrorBannerProps {
  /**
   * Error content to render, or null when no error is active.
   */
  error: ErrorBannerMessage | null;
}

/**
 * Renders an inline recoverable error message.
 *
 * @param props - Error content to display.
 * @returns React element for an error banner, or an empty fragment.
 */
export function ErrorBanner(props: ErrorBannerProps): React.ReactElement {
  if (props.error == null) {
    return <></>;
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="red" paddingX={1}>
      <Text color="red">{props.error.message}</Text>
      {props.error.remediation != null ? (
        <Text color="yellow">{props.error.remediation}</Text>
      ) : null}
    </Box>
  );
}
