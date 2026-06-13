import path from 'node:path';
import React, { useMemo } from 'react';
import { Box, Text } from 'ink';

import { buildVersionReport } from '../../commands/version.js';
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
  return parent.length > 0 ? path.join('...', parent, name) : name;
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
      return buildVersionReport({ cwd: session.projectRoot });
    } catch {
      return null;
    }
  }, [session.projectRoot]);
  const binaryContext = versionReport?.invocation ?? session.binaryContext;
  const localBinaryPath = versionReport?.localCliPath ?? session.localBinaryPath;
  const localPath = localBinaryPath == null ? '' : ` (${abbreviateProjectRoot(localBinaryPath)})`;

  return (
    <Box borderStyle="single" justifyContent="center" paddingX={1} width="100%">
      <Text color="yellow" bold={true}>
        Spec-N-Roll
      </Text>
      <Text color="white">
        {' | '}
      </Text>
      <Text color="blue">
        {abbreviateProjectRoot(session.projectRoot)}
      </Text>
      <Text color="white">
        {' | '}
      </Text>
      <Text color="grey">
        {binaryContext} {localPath}
      </Text>
      <Text color="white">
        {' | '}
      </Text>
      <Text color="grey">
         {breadcrumb}
      </Text>
    </Box>
  );
}
