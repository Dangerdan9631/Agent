import { spawnSync } from 'node:child_process';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';

import { runProjectRemove } from '../../../sdk/remove.js';
import { runUpdate, type UpdateResult } from '../../../sdk/update.js';
import { resolveGlobalToolkitRoot } from '../../dispatcher.js';
import { runRefreshProjectInstall } from '../../../sdk/install/refresh-project-install.js';
import { listBundledAgentIds } from '../../../sdk/agents/extension-loader.js';
import { useSession } from '../app/session-context.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { RouteContentLayout } from '../components/RouteContentLayout.js';
import { SelectableList, type SelectableListItem } from '../components/SelectableList.js';
import { applyInteractiveInit } from './setup/setup-init.js';
import type { RoutedScreenProps } from '../app/routed-screen-props.js';
import {
  loadGlobalHomeContent,
  type GlobalHomeContent,
} from '../read-models/global-home-content.js';
import { reloadInteractiveApp } from '../reload.js';
import { StaticContentBlock } from '../components/StaticContentBlock.js';
import { UpdateConfirmPrompt } from '../update-prompts.js';

/**
 * Destructive global home action awaiting confirmation.
 */
type PendingConfirmAction = 'remove' | 'reinstall';

/**
 * Global home menu row with numeric shortcut activation.
 */
interface GlobalHomeMenuItem extends SelectableListItem {
  /**
   * Number key that activates this menu option.
   */
  key: string;
  /**
   * Stable action identifier for selection handling.
   */
  actionId:
    | 'update-global'
    | 'refresh-project'
    | 'update-project'
    | 'init'
    | 'remove'
    | 'reinstall'
    | 'quit';
}

/**
 * Props for the global instance home screen.
 */
export type GlobalHomeScreenProps = RoutedScreenProps;

/**
 * Runs the global CLI update flow for linked-source or remote installs.
 *
 * @param content - Loaded global home content with install source metadata.
 * @returns Promise that resolves when the update command completes successfully.
 */
async function runGlobalCliUpdate(content: GlobalHomeContent): Promise<void> {
  if (content.installSource.kind === 'local' && content.installSource.sourcePath != null) {
    const result = spawnSync('npm', ['run', 'build'], {
      cwd: content.installSource.sourcePath,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    if (result.status !== 0) {
      throw new Error('Linked-source build failed.');
    }
    return;
  }

  const result = spawnSync('npm', ['install', '-g', 'spec-n-roll'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    throw new Error('Global npm install failed.');
  }
}

/**
 * Builds global home menu rows with enablement derived from loaded content.
 *
 * @param content - Loaded global home read-model content.
 * @returns Menu items in numeric keyboard order.
 */
function buildMenuItems(content: GlobalHomeContent | null): readonly GlobalHomeMenuItem[] {
  const items: GlobalHomeMenuItem[] = [
    {
      id: 'update-global',
      key: '1',
      actionId: 'update-global',
      label: "1 Update Global Spec N' Roll",
      description: 'Update the global CLI installation',
      disabled: content?.updateGlobalDisabled === true,
    },
  ];

  if (content?.showProjectUpdateActions === true) {
    items.push(
      {
        id: 'refresh-project',
        key: '2',
        actionId: 'refresh-project',
        label: "2 Refresh Project Spec N' Roll",
        description: 'Copy the global CLI runtime into this project',
        disabled: content.refreshProjectDisabled,
      },
      {
        id: 'update-project',
        key: '3',
        actionId: 'update-project',
        label: '3 Update Project',
        description: 'Run the full project update workflow',
        disabled: content.updateProjectDisabled,
      },
    );
  }

  const initKey = content?.showProjectUpdateActions === true ? '4' : '2';
  const removeKey = content?.showProjectUpdateActions === true ? '5' : '3';
  const reinstallKey = content?.showProjectUpdateActions === true ? '6' : '4';
  const quitKey = content?.showProjectUpdateActions === true ? '7' : '5';

  items.push(
    {
      id: 'init',
      key: initKey,
      actionId: 'init',
      label: `${initKey} Init Project`,
      description: 'Initialize this project',
      disabled: false,
    },
    {
      id: 'remove',
      key: removeKey,
      actionId: 'remove',
      label: `${removeKey} Remove Spec N' Roll`,
      description: 'Remove managed project files',
      disabled: content?.removeDisabled === true,
    },
    {
      id: 'reinstall',
      key: reinstallKey,
      actionId: 'reinstall',
      label: `${reinstallKey} Re-install Spec N' Roll`,
      description: 'Remove managed files then initialize again',
      disabled: content?.reinstallDisabled === true,
    },
    {
      id: 'quit',
      key: quitKey,
      actionId: 'quit',
      label: `${quitKey} Quit`,
      description: 'Exit the interactive CLI',
      disabled: false,
    },
  );

  return items;
}

/**
 * Renders the global instance home screen with static content and installation actions.
 *
 * @param props - Route slot row budget from app scaffolding.
 * @returns React element for the global home screen.
 */
export function GlobalHomeScreen(props: GlobalHomeScreenProps): React.ReactElement {
  const session = useSession();
  const app = useApp();
  const [content, setContent] = useState<GlobalHomeContent | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmAction | null>(null);
  const [updatePlan, setUpdatePlan] = useState<UpdateResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const menuItems = useMemo(() => buildMenuItems(content), [content]);

  useEffect(() => {
    let cancelled = false;

    void loadGlobalHomeContent({
      projectRoot: session.projectRoot,
      isInitialized: session.isInitialized,
    }).then((loaded) => {
      if (!cancelled) {
        setContent(loaded);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [session.isInitialized, session.projectRoot]);

  const runGlobalUpdate = useCallback((): void => {
    if (content == null || content.updateGlobalDisabled) {
      return;
    }

    setRunning(true);
    setErrorMessage(null);
    setStatusMessage("Updating global Spec N' Roll...");

    void runGlobalCliUpdate(content)
      .then(() => {
        process.exitCode = reloadInteractiveApp({
          cwd: session.projectRoot,
          command: 'spec-n-roll',
          argv: ['--global'],
        });
        app.exit();
      })
      .catch((unknownError: unknown) => {
        const text = unknownError instanceof Error ? unknownError.message : String(unknownError);
        setErrorMessage(text);
        setStatusMessage(null);
      })
      .finally(() => {
        setRunning(false);
      });
  }, [app, content, session.projectRoot]);

  const runRefreshProject = useCallback((): void => {
    if (content == null || content.refreshProjectDisabled) {
      return;
    }

    setRunning(true);
    setErrorMessage(null);
    setStatusMessage("Refreshing project Spec N' Roll...");

    void runRefreshProjectInstall({
      projectRoot: session.projectRoot,
      globalInstallSource: content.installSource,
    })
      .then(() => {
        process.exitCode = reloadInteractiveApp({
          cwd: session.projectRoot,
          command: 'spec-n-roll',
          argv: ['--global'],
        });
        app.exit();
      })
      .catch((unknownError: unknown) => {
        const text = unknownError instanceof Error ? unknownError.message : String(unknownError);
        setErrorMessage(text);
        setStatusMessage(null);
      })
      .finally(() => {
        setRunning(false);
      });
  }, [app, content, session.projectRoot]);

  const runInitFlow = useCallback((): void => {
    session.pushRoute('setup-init');
  }, [session]);

  const startUpdateProject = useCallback((): void => {
    if (content == null || content.updateProjectDisabled) {
      return;
    }

    const globalToolkitRoot = resolveGlobalToolkitRoot();

    setRunning(true);
    setErrorMessage(null);
    setStatusMessage('Planning project update...');

    void runUpdate({
      projectRoot: session.projectRoot,
      toolkitRoot: globalToolkitRoot,
      dryRun: true,
    })
      .then((plan) => {
        setStatusMessage(null);
        setUpdatePlan(plan);
      })
      .catch((unknownError: unknown) => {
        const text = unknownError instanceof Error ? unknownError.message : String(unknownError);
        setErrorMessage(text);
        setStatusMessage(null);
      })
      .finally(() => {
        setRunning(false);
      });
  }, [content, session.projectRoot]);

  const applyUpdateProject = useCallback((): void => {
    const globalToolkitRoot = resolveGlobalToolkitRoot();

    setRunning(true);
    setErrorMessage(null);
    setStatusMessage('Updating project...');

    void runUpdate({
      projectRoot: session.projectRoot,
      toolkitRoot: globalToolkitRoot,
      force: true,
    })
      .then((result) => {
        setStatusMessage(
          `Updated ${result.previousToolkitVersion} -> ${result.targetToolkitVersion}.`,
        );
        reloadInteractiveApp();
      })
      .catch((unknownError: unknown) => {
        const text = unknownError instanceof Error ? unknownError.message : String(unknownError);
        setErrorMessage(text);
        setStatusMessage(null);
      })
      .finally(() => {
        setRunning(false);
        setUpdatePlan(null);
      });
  }, [session.projectRoot]);

  const runRemove = useCallback((): void => {
    setRunning(true);
    setErrorMessage(null);
    setStatusMessage("Removing Spec N' Roll...");

    void runProjectRemove({
      projectRoot: session.projectRoot,
      skipConfirmation: true,
    })
      .then((result) => {
        setStatusMessage(`Removed managed files from ${result.projectRoot}.`);
      })
      .catch((unknownError: unknown) => {
        const text = unknownError instanceof Error ? unknownError.message : String(unknownError);
        setErrorMessage(text);
        setStatusMessage(null);
      })
      .finally(() => {
        setRunning(false);
        setPendingConfirm(null);
      });
  }, [session.projectRoot]);

  const runReinstall = useCallback((): void => {
    setRunning(true);
    setErrorMessage(null);
    setStatusMessage("Re-installing Spec N' Roll...");

    void runProjectRemove({
      projectRoot: session.projectRoot,
      skipConfirmation: true,
    })
      .then(() =>
        applyInteractiveInit({
          projectRoot: session.projectRoot,
          agents: listBundledAgentIds(),
        }),
      )
      .then((result) => {
        setStatusMessage(`Re-installed for agents: ${result.selectedAgents.join(', ')}`);
      })
      .catch((unknownError: unknown) => {
        const text = unknownError instanceof Error ? unknownError.message : String(unknownError);
        setErrorMessage(text);
        setStatusMessage(null);
      })
      .finally(() => {
        setRunning(false);
        setPendingConfirm(null);
      });
  }, [session.projectRoot]);

  const handleMenuSelect = useCallback(
    (item: GlobalHomeMenuItem): void => {
      if (running) {
        return;
      }

      switch (item.actionId) {
        case 'update-global':
          runGlobalUpdate();
          return;
        case 'refresh-project':
          runRefreshProject();
          return;
        case 'update-project':
          startUpdateProject();
          return;
        case 'init':
          runInitFlow();
          return;
        case 'remove':
          setPendingConfirm('remove');
          return;
        case 'reinstall':
          setPendingConfirm('reinstall');
          return;
        case 'quit':
          app.exit();
      }
    },
    [app, runGlobalUpdate, runInitFlow, runRefreshProject, running, startUpdateProject],
  );

  useInput((input) => {
    if (pendingConfirm != null || updatePlan != null || running) {
      return;
    }

    const item = menuItems.find((candidate) => candidate.key === input);
    if (item != null) {
      handleMenuSelect(item);
    }
  });

  if (updatePlan != null) {
    return (
      <UpdateConfirmPrompt
        input={{
          previousToolkitVersion: updatePlan.previousToolkitVersion,
          targetToolkitVersion: updatePlan.targetToolkitVersion,
          filesToOverwrite: updatePlan.overwrittenFiles,
          backupConflicts: updatePlan.backupConflicts,
          migrationCount: updatePlan.configMigrations.length,
          extensionWarnings: updatePlan.extensionWarnings,
        }}
        onConfirm={applyUpdateProject}
        onCancel={() => {
          setUpdatePlan(null);
        }}
      />
    );
  }

  if (pendingConfirm === 'remove') {
    return (
      <ConfirmDialog
        title="Remove Spec N' Roll"
        message={`Remove managed Spec N' Roll files from ${session.projectRoot}?`}
        onConfirm={runRemove}
        onCancel={() => setPendingConfirm(null)}
      />
    );
  }

  if (pendingConfirm === 'reinstall') {
    return (
      <ConfirmDialog
        title="Re-install Spec N' Roll"
        message={`Remove and re-initialize Spec N' Roll in ${session.projectRoot}?`}
        onConfirm={runReinstall}
        onCancel={() => setPendingConfirm(null)}
      />
    );
  }

  return (
    <RouteContentLayout
      routeContentRows={props.routeContentRows}
      contextState={{ routeTitle: 'Global Home' }}
      staticContent={
        <Box flexDirection="column">
          {content == null ? (
            <Text color="gray">Loading global home content...</Text>
          ) : (
            <StaticContentBlock fields={content.fields} />
          )}
          {statusMessage != null ? <Text color="cyan">{statusMessage}</Text> : null}
          {errorMessage != null ? <Text color="red">{errorMessage}</Text> : null}
        </Box>
      }
      selection={
        <Box flexDirection="column">
          {content != null ? (
            <SelectableList items={menuItems} onSelect={handleMenuSelect} />
          ) : (
            <Text color="gray">Loading menu...</Text>
          )}
        </Box>
      }
    />
  );
}
