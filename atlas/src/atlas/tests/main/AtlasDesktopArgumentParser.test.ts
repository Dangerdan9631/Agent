import { describe, expect, it } from 'vitest';
import { AtlasDesktopArgumentParser } from '../../src/main/AtlasDesktopArgumentParser.js';

describe('AtlasDesktopArgumentParser', () => {
  it('accepts a direct configuration path used by the Atlas desktop command', () => {
    expect(new AtlasDesktopArgumentParser().parse(['examples/atlas.config.yml'])).toEqual({
      configurationPath: 'examples/atlas.config.yml'
    });
  });

  it('retains the legacy view command and its workspace options', () => {
    expect(
      new AtlasDesktopArgumentParser().parse([
        'view',
        '--workspace',
        'examples/typescript',
        '--config',
        'atlas.config.yml',
        '--output',
        'architecture',
        '--host',
        '127.0.0.1',
        '--port',
        '4173',
        '--open'
      ])
    ).toEqual({
      workspacePath: 'examples/typescript',
      configurationPath: 'atlas.config.yml',
      outputPath: 'architecture',
      host: '127.0.0.1',
      port: 4173
    });
  });

  it('rejects unknown arguments and ports outside the TCP range', () => {
    const parser = new AtlasDesktopArgumentParser();
    expect(() => parser.parse(['--unknown'])).toThrow("does not recognize argument '--unknown'");
    expect(() => parser.parse(['--port', '65536'])).toThrow(
      '--port must be an integer from 0 through 65535'
    );
  });
});
