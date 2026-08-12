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
    const destinationPath = resolve('dist/config');
    await mkdir(destinationPath, { recursive: true });
    await cp(
      resolve('src/config/atlas.schema.json'),
      resolve(destinationPath, 'atlas.schema.json')
    );
    await cp(
      resolve('src/config/atlas-base.schema.json'),
      resolve(destinationPath, 'atlas-base.schema.json')
    );
    await cp(
      resolve('src/config/atlas-module-config.schema.json'),
      resolve(destinationPath, 'atlas-module-config.schema.json')
    );
    await cp(
      resolve('src/config/atlas-module.schema.json'),
      resolve(destinationPath, 'atlas-module.schema.json')
    );
    await cp(
      resolve('src/config/atlas-workspace.schema.json'),
      resolve(destinationPath, 'atlas-workspace.schema.json')
    );
  }
}

await new BuildAssetCopier().copy();
