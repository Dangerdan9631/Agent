import path from 'node:path';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';

import { listBundledAgentIds } from '../../../../agents/extension-loader.js';
import { findToolkitPackageRoot } from '../../../../core/paths.js';
import { runProjectRemove } from '../../../commands/remove.js';
import { runUpdate, type UpdateResult } from '../../../commands/update.js';
import { resolveGlobalCliPath } from '../../../dispatcher.js';
import { installProjectBinaries } from '../../../local-binaries.js';
import { useSession } from '../../app/session-context.js';
import { ConfirmDialog } from '../../components/ConfirmDialog.js';
import { RouteContentLayout } from '../../components/RouteContentLayout.js';
import { SelectableList, type SelectableListItem } from '../../components/SelectableList.js';
import { StaticContentBlock } from '../../components/StaticContentBlock.js';
import type { RoutedScreenProps } from '../../app/routed-screen-props.js';
import {
  loadManageLocalContent,
  type ManageLocalContent,
} from '../../read-models/manage-local-content.js';
import { reloadInteractiveApp } from '../../reload.js';
import { UpdateConfirmPrompt } from '../../update-prompts.js';
import { applyInteractiveInit } from '../setup/setup-init.js';

/**
 * Destructive manage screen action awaiting confirmation.
 */
type PendingConfirmAction = 'remove' | 'reinstall';

/**
 * Manage local menu row with numeric shortcut activation.
 */
interface ManageLocalMenuItem extends SelectableListItem {
  /**
   * Number key that activates this menu option.
   */
  key: string;
  /**
   * Stable action identifier for selection handling.
   */
  actionId: 'update' | 'upgrade' | 'remove' | 'reinstall' | 'back';
}

/**
 * Props for the local installation manage screen.
 */
export type ManageLocalScreenProps = RoutedScreenProps;

/**
 * Resolves the globally installed toolkit package root for binary copy actions.
 *
 * @returns Absolute path to the global toolkit package root.
 */
function resolveGlobalToolkitRoot(): string {
  const globalCliPath = resolveGlobalCliPath();
  return findToolkitPackageRoot(path.dirname(globalCliPath));
}

/**
 * Builds manage-local menu rows with enablement derived from loaded content.
 *
 * @param content - Loaded manage screen read-model content.
 * @returns Menu items in numeric keyboard order.
 */
function buildMenuItems(content: ManageLocalContent | null): readonly ManageLocalMenuItem[] {
  return [
    {
      id: 'update',
      key: '1',
      actionId: 'update',
      label: "1 Update Spec N' Roll",
      description: 'Copy the global CLI binary into this project',
      disabled: content?.updateDisabled === true,
    },
    {
      id: 'upgrade',
      key: '2',
      actionId: 'upgrade',
      label: '2 Upgrade Project',
      description: 'Run the full project upgrade workflow',
      disabled: false,
    },
    {
      id: 'remove',
      key: '3',
      actionId: 'remove',
      label: "3 Remove Spec N' Roll",
      description: 'Remove managed project files',
      disabled: content?.removeDisabled === true,
    },
    {
      id: 'reinstall',
      key: '4',
      actionId: 'reinstall',
      label: "4 Re-install Spec N' Roll",
      description: 'Remove managed files then initialize again',
      disabled: content?.reinstallDisabled === true,
    },
    {
      id: 'back',
      key: '5',
      actionId: 'back',
      label: '5 Back',
      description: 'Return to local home',
      disabled: false,
    },
  ];
}

/**
 * Renders the local installation manage screen with static content and lifecycle actions.
 *
 * @param props - Route slot row budget from app scaffolding.
 * @returns React element for the manage-local screen.
 */
export function ManageLocalScreen(props: ManageLocalScreenProps): React.ReactElement {
  const session = useSession();
  const [content, setContent] = useState<ManageLocalContent | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmAction | null>(null);
  const [upgradePlan, setUpgradePlan] = useState<UpdateResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const menuItems = useMemo(() => buildMenuItems(content), [content]);

  useEffect(() => {
    let cancelled = false;

    void loadManageLocalContent({
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

  const runBinaryUpdate = useCallback((): void => {
    if (content == null || content.updateDisabled) {
      return;
    }

    setRunning(true);
    setErrorMessage(null);
    setStatusMessage('Updating local Spec N\' Roll binary...');

    void installProjectBinaries(session.projectRoot, resolveGlobalToolkitRoot())
      .then(() => {
        reloadInteractiveApp();
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

  const startUpgrade = useCallback((): void => {
    setRunning(true);
    setErrorMessage(null);
    setStatusMessage('Planning project upgrade...');

    void runUpdate({ projectRoot: session.projectRoot, dryRun: true })
      .then((plan) => {
        setStatusMessage(null);
        setUpgradePlan(plan);
      })
      .catch((unknownError: unknown) => {
        const text = unknownError instanceof Error ? unknownError.message : String(unknownError);
        setErrorMessage(text);
        setStatusMessage(null);
      })
      .finally(() => {
        setRunning(false);
      });
  }, [session.projectRoot]);

  const applyUpgrade = useCallback((): void => {
    setRunning(true);
    setErrorMessage(null);
    setStatusMessage('Upgrading project...');

    void runUpdate({ projectRoot: session.projectRoot, force: true })
      .then((result) => {
        setStatusMessage(
          `Upgraded ${result.previousToolkitVersion} -> ${result.targetToolkitVersion}.`,
        );
      })
      .catch((unknownError: unknown) => {
        const text = unknownError instanceof Error ? unknownError.message : String(unknownError);
        setErrorMessage(text);
        setStatusMessage(null);
      })
      .finally(() => {
        setRunning(false);
        setUpgradePlan(null);
      });
  }, [session.projectRoot]);

  const runRemove = useCallback((): void => {
    setRunning(true);
    setErrorMessage(null);
    setStatusMessage('Removing Spec N\' Roll...');

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
    setStatusMessage('Re-installing Spec N\' Roll...');

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
    (item: ManageLocalMenuItem): void => {
      if (running) {
        return;
      }

      switch (item.actionId) {
        case 'update':
          runBinaryUpdate();
          return;
        case 'upgrade':
          startUpgrade();
          return;
        case 'remove':
          setPendingConfirm('remove');
          return;
        case 'reinstall':
          setPendingConfirm('reinstall');
          return;
        case 'back':
          session.popRoute();
      }
    },
    [runBinaryUpdate, running, session, startUpgrade],
  );

  useInput((input) => {
    if (pendingConfirm != null || upgradePlan != null || running) {
      return;
    }

    const item = menuItems.find((candidate) => candidate.key === input);
    if (item != null) {
      handleMenuSelect(item);
    }
  });

  if (upgradePlan != null) {
    return (
      <UpdateConfirmPrompt
        input={{
          previousToolkitVersion: upgradePlan.previousToolkitVersion,
          targetToolkitVersion: upgradePlan.targetToolkitVersion,
          filesToOverwrite: upgradePlan.overwrittenFiles,
          backupConflicts: upgradePlan.backupConflicts,
          migrationCount: upgradePlan.configMigrations.length,
          extensionWarnings: upgradePlan.extensionWarnings,
        }}
        onConfirm={applyUpgrade}
        onCancel={() => {
          setUpgradePlan(null);
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
      contextState={{ routeTitle: "Manage Spec N' Roll" }}
      staticContent={
        <Box flexDirection="column">
          {content == null ? (
            <Text color="gray">Loading manage screen content...</Text>
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
