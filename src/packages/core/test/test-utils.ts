import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export function createTempDir(prefix = 'agentconfig-test-'): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function removeDir(dirPath: string): void {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

export function writeTree(rootDir: string, files: Record<string, string>): void {
  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(rootDir, ...relativePath.split('/'));
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, content, 'utf8');
  }
}

export function readText(rootDir: string, relativePath: string): string {
  const absolutePath = path.join(rootDir, ...relativePath.split('/'));
  return fs.readFileSync(absolutePath, 'utf8');
}

export function withTempHome(homeDir: string): () => void {
  const previousHome = process.env.HOME;
  const previousUserProfile = process.env.USERPROFILE;
  const previousHomeDrive = process.env.HOMEDRIVE;
  const previousHomePath = process.env.HOMEPATH;

  const parsedHome = path.parse(homeDir);

  process.env.HOME = homeDir;
  process.env.USERPROFILE = homeDir;
  process.env.HOMEDRIVE = parsedHome.root.replace(/\\$/, '');
  process.env.HOMEPATH = homeDir.slice(parsedHome.root.length - 1);

  return () => {
    if (previousHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = previousHome;
    }

    if (previousUserProfile === undefined) {
      delete process.env.USERPROFILE;
    } else {
      process.env.USERPROFILE = previousUserProfile;
    }

    if (previousHomeDrive === undefined) {
      delete process.env.HOMEDRIVE;
    } else {
      process.env.HOMEDRIVE = previousHomeDrive;
    }

    if (previousHomePath === undefined) {
      delete process.env.HOMEPATH;
    } else {
      process.env.HOMEPATH = previousHomePath;
    }
  };
}