import path from 'node:path';
import React, { useMemo } from 'react';
import { Box, Text } from 'ink';

import { buildCliVersionReport } from '../../cli/version-invocation.js';
import { formatBreadcrumb } from '../app/navigation.js';
import { useSession } from '../app/session-context.js';

/**
 * Shortens a path for compact terminal footer display.
 *
 * @param projectRoot - Absolute project path to abbreviate.
 * @returns Compact path retaining the final directory name.
 */
function abbreviateProjectRoot(projectRoot: string): string {
  const parent = path.basename(path.dirname(projectRoot));
  const name = path.basename(projectRoot);
  return parent.length > 0 ? path.join(parent, name) : name;
}

/**
 * Renders persistent project, binary, and breadcrumb status.
 *
 * @returns React element for the app footer.
 */
export function StatusBar(): React.ReactElement {
  const session = useSession();
  const breadcrumb = formatBreadcrumb(session.navigationStack);
  const versionReport = useMemo(() => {
    try {
      return buildCliVersionReport({ cwd: session.projectRoot });
    } catch {
      return null;
    }
  }, [session.projectRoot]);
  const binaryContext = session.binaryContext;
  const localBinaryPath = versionReport?.localCliPath ?? session.localBinaryPath;
  const localPath = localBinaryPath == null ? '' : ` (${abbreviateProjectRoot(localBinaryPath)})`;

  return (
    <Box flexDirection="column" padding={1} width="100%" backgroundColor="blackBright">
      <Box backgroundColor="black" justifyContent="center" width="100%">
        <Text color="white" bold={true}>
          Spec-N-Roll
        </Text>
        <Text color="grey">
          {binaryContext == 'local' ? ` (${binaryContext} ${localPath})` : ` (${binaryContext})`}
        </Text>
        <Text color="grey" bold={true}>
          {' | '}
        </Text>
        <Text color="grey">{abbreviateProjectRoot(session.projectRoot)}</Text>
      </Box>
      <Box justifyContent="center" width="100%">
        <Text color="white">{breadcrumb}</Text>
      </Box>
    </Box>
  );
}
