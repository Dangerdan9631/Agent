import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { describe, expect, it } from 'vitest';

import {
  listBundledAgentIds,
  getBundledAgentGenerator,
} from '../../src/agents/extension-loader.js';
import { extensionManifestSchema, parseExtensionManifest } from '../../src/extensions/manifest.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const extensionManifestSchemaPath = path.join(
  repoRoot,
  'specs/001-spec-n-roll-toolkit/contracts/extension-manifest.schema.json',
);

const extensionManifestJsonSchema = JSON.parse(
  readFileSync(extensionManifestSchemaPath, 'utf8'),
) as Record<string, unknown>;
delete extensionManifestJsonSchema.$schema;

const ajv = new Ajv({ allErrors: true, strict: false });
const validateAgainstJsonSchema = ajv.compile(extensionManifestJsonSchema);

describe('extension manifests', () => {
  it('validate against contracts/extension-manifest.schema.json and Zod', () => {
    for (const agentId of listBundledAgentIds()) {
      const generator = getBundledAgentGenerator(agentId);
      expect(generator).not.toBeNull();

      const manifest = generator!.manifest;
      const zodParsed = parseExtensionManifest(manifest);
      expect(zodParsed.id).toBe(agentId);

      const jsonSchemaValid = validateAgainstJsonSchema(manifest);
      expect(jsonSchemaValid, ajv.errorsText(validateAgainstJsonSchema.errors)).toBe(true);
      expect(extensionManifestSchema.parse(manifest).id).toBe(agentId);
    }
  });

  it('rejects before_update and after_update hook events', () => {
    expect(() =>
      parseExtensionManifest({
        manifestVersion: '1',
        id: 'bad-hooks',
        name: 'Bad Hooks',
        targetToolkitVersion: '0.1.0',
        hooks: [
          {
            id: 'before-update',
            event: 'before_update',
            entrypoint: './hook.mjs',
          },
        ],
      }),
    ).toThrow(/before_update|after_update|not supported/i);

    expect(() =>
      parseExtensionManifest({
        manifestVersion: '1',
        id: 'bad-hooks-after',
        name: 'Bad Hooks After',
        targetToolkitVersion: '0.1.0',
        hooks: [
          {
            id: 'after-update',
            event: 'after_update',
            entrypoint: './hook.mjs',
          },
        ],
      }),
    ).toThrow(/before_update|after_update|not supported/i);
  });
});
