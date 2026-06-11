import path from 'node:path';
import fse from 'fs-extra';

/**
 * Writes JSON data atomically to prevent corruption when the process is interrupted.
 *
 * @param filePath - Absolute path to the destination file.
 * @param data - Serializable value written as pretty-printed JSON.
 */
export async function atomicWriteJson(filePath: string, data: unknown): Promise<void> {
  await fse.ensureDir(path.dirname(filePath));
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fse.writeJson(tempPath, data, { spaces: 2 });
  await fse.move(tempPath, filePath, { overwrite: true });
}

/**
 * Writes text data atomically to prevent partial writes on interruption.
 *
 * @param filePath - Absolute path to the destination file.
 * @param content - UTF-8 text content to persist.
 */
export async function atomicWriteText(filePath: string, content: string): Promise<void> {
  await fse.ensureDir(path.dirname(filePath));
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fse.writeFile(tempPath, content, 'utf8');
  await fse.move(tempPath, filePath, { overwrite: true });
}
