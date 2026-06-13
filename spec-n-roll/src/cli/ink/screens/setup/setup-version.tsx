import React from 'react';
import { Box, Text } from 'ink';

import { buildVersionReport, formatVersionReport } from '../../../commands/version.js';
import { useSession } from '../../app/session-context.js';

/**
 * Renders version information from the shared version report builder.
 *
 * @returns React element for the version screen.
 */
export function SetupVersionScreen(): React.ReactElement {
  const session = useSession();
  const report = buildVersionReport({ cwd: session.projectRoot });

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
