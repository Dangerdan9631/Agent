import { describe, expect, it } from 'vitest';

import { loadManageLocalContent } from '../../../../src/ink/read-models/manage-local-content.js';

describe('loadManageLocalContent', () => {
  it('disables refresh and update when local and unlinked global versions match', async () => {
    const content = await loadManageLocalContent(
      {
        projectRoot: 'C:/project',
        isInitialized: true,
      },
      {
        readCurrentVersion: () => '1.0.0',
        readGlobalInstallSource: () => ({
          kind: 'remote',
          markerPath: 'C:/global/.source-package-root',
        }),
        versionComparisonDeps: {
          readGlobalInstallVersion: () => '1.0.0',
        },
      },
    );

    expect(content.fields).toEqual([
      { label: 'Global Version', value: 'v1.0.0' },
      { label: 'Local Version', value: 'v1.0.0' },
      { label: 'Project', value: 'C:/project' },
    ]);
    expect(content.refreshProjectDisabled).toBe(true);
    expect(content.updateProjectDisabled).toBe(true);
  });

  it('enables refresh and update when the global version is newer', async () => {
    const content = await loadManageLocalContent(
      {
        projectRoot: 'C:/project',
        isInitialized: true,
      },
      {
        readCurrentVersion: () => '1.0.0',
        readGlobalInstallSource: () => ({
          kind: 'remote',
          markerPath: 'C:/global/.source-package-root',
        }),
        versionComparisonDeps: {
          readGlobalInstallVersion: () => '1.1.0',
        },
      },
    );

    expect(content.refreshProjectDisabled).toBe(false);
    expect(content.updateProjectDisabled).toBe(false);
  });

  it('disables refresh and update when the global version is older than local', async () => {
    const content = await loadManageLocalContent(
      {
        projectRoot: 'C:/project',
        isInitialized: true,
      },
      {
        readCurrentVersion: () => '1.1.0',
        readGlobalInstallSource: () => ({
          kind: 'remote',
          markerPath: 'C:/global/.source-package-root',
        }),
        versionComparisonDeps: {
          readGlobalInstallVersion: () => '1.0.0',
        },
      },
    );

    expect(content.refreshProjectDisabled).toBe(true);
    expect(content.updateProjectDisabled).toBe(true);
  });

  it('enables refresh and update when the global install is linked even if versions match', async () => {
    const content = await loadManageLocalContent(
      {
        projectRoot: 'C:/project',
        isInitialized: true,
      },
      {
        readCurrentVersion: () => '1.0.0',
        readGlobalInstallSource: () => ({
          kind: 'local',
          sourcePath: 'C:/repo',
          markerPath: 'C:/global/.source-package-root',
        }),
        versionComparisonDeps: {
          readGlobalInstallVersion: () => '1.0.0',
        },
      },
    );

    expect(content.versionComparison.isUpToDate).toBe(true);
    expect(content.refreshProjectDisabled).toBe(false);
    expect(content.updateProjectDisabled).toBe(false);
  });

  it('enables refresh and update when delegated env reports a linked global dispatcher', async () => {
    const content = await loadManageLocalContent(
      {
        projectRoot: 'C:/project',
        isInitialized: true,
      },
      {
        readCurrentVersion: () => '1.0.0',
        readGlobalInstallSource: () => ({
          kind: 'remote',
          markerPath: 'C:/local/.source-package-root',
        }),
        env: {
          SPEC_N_ROLL_DISPATCHED: '1',
          SPEC_N_ROLL_DISPATCHER_INSTALL_SOURCE: 'local',
        },
        versionComparisonDeps: {
          readGlobalInstallVersion: () => '1.0.0',
        },
      },
    );

    expect(content.refreshProjectDisabled).toBe(false);
    expect(content.updateProjectDisabled).toBe(false);
  });
});
