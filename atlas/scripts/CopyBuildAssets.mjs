import { cp, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

/**
 * Copies runtime assets that TypeScript does not emit into the compiled distribution tree.
 */
class BuildAssetCopier {
  /**
   * Copies all package runtime assets required by compiled Atlas modules.
   *
   * @returns A promise that resolves after every asset has been copied.
   */
  async copy() {
    const destinationPath = resolve('dist/config/atlas.schema.json');
    await mkdir(dirname(destinationPath), { recursive: true });
    await cp(resolve('src/config/atlas.schema.json'), destinationPath);
  }
}

await new BuildAssetCopier().copy();
