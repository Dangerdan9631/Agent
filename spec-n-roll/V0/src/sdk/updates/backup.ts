import path from 'node:path';
import fse from 'fs-extra';

/**
 * Represents a backup conflict when a file has been modified from
 * its expected content and needs to be preserved.
 */
export interface BackupConflict {
  filePath: string;
  backupPath: string;
}

/**
 * Backs up a file if it has been modified from the expected content
 * to preserve user changes during toolkit updates.
 *
 * @param filePath - Absolute path to the file to check. Must be a valid path.
 * @param expectedContent - The expected content to compare against. Can be string or Buffer.
 * @returns BackupConflict if the file was modified, null otherwise.
 */
export async function backupIfModified(
  filePath: string,
  expectedContent: string | Buffer,
): Promise<BackupConflict | null> {
  if (!(await fse.pathExists(filePath))) {
    return null;
  }

  const current = await fse.readFile(filePath);
  const expected = Buffer.isBuffer(expectedContent)
    ? expectedContent
    : Buffer.from(expectedContent, 'utf8');

  if (current.equals(expected)) {
    return null;
  }

  const backupPath = `${filePath}.bak`;
  await fse.copy(filePath, backupPath, { overwrite: true });

  return { filePath, backupPath };
}

/**
 * Backs up multiple toolkit files if they have been modified to
 * preserve user changes during bulk toolkit updates.
 *
 * @param updates - Array of file paths and their expected contents to check.
 * @returns Array of BackupConflict objects for all modified files.
 */
export async function backupToolkitFilesIfModified(
  updates: Array<{ filePath: string; expectedContent: string | Buffer }>,
): Promise<BackupConflict[]> {
  const conflicts: BackupConflict[] = [];

  for (const update of updates) {
    const conflict = await backupIfModified(path.resolve(update.filePath), update.expectedContent);
    if (conflict != null) {
      conflicts.push(conflict);
    }
  }

  return conflicts;
}
