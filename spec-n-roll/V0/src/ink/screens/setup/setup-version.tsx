import React from 'react';
import { Box, Text } from 'ink';

import { buildCliVersionReport } from '../../../cli/version-invocation.js';
import { formatVersionReport } from '../../../cli/commands/version.js';
import { useSession } from '../../app/session-context.js';
import type { RoutedScreenProps } from '../../app/routed-screen-props.js';

/**
 * Renders version information from the shared version report builder.
 *
 * @returns React element for the version screen.
 */
export function SetupVersionScreen(_props: RoutedScreenProps): React.ReactElement {
  const session = useSession();
  const report = buildCliVersionReport({ cwd: session.projectRoot });

  return (
    <Box flexDirection="column">
      <Text bold>Version Info</Text>
      {formatVersionReport(report)
        .trimEnd()
        .split('\n')
        .map((line) => (
          <Text key={line}>{line}</Text>
        ))}
    </Box>
  );
}
