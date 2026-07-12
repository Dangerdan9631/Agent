import { describe, expect, it, vi } from 'vitest';
import {
  RuntimeApplication,
  RuntimeInvocationParser,
  TerminalLayoutAllocator,
  type RuntimeInvocationReader,
  type RuntimeUiMode,
  type RuntimeUiRenderer,
} from '#runtime/index.js';
import type { RuntimeInvocation } from 'spec-n-roll-api';

/**
 * Runtime invocation reader fixture backed by a string.
 */
class StringRuntimeInvocationReader implements RuntimeInvocationReader {
  /**
   * Creates a string-backed invocation reader.
   *
   * @param input - UTF-8 text returned by the reader.
   */
  constructor(private readonly input: string) {}

  /**
   * Reads fixture input text.
   *
   * @returns Fixture input text.
   */
  read(): string {
    return this.input;
  }
}

/**
 * Runtime UI renderer fixture that records selected modes.
 */
class RecordingRuntimeUiRenderer implements RuntimeUiRenderer {
  /**
   * Modes presented by the runtime application.
   */
  readonly modes: RuntimeUiMode[] = [];

  /**
   * Records one requested interactive mode.
   *
   * @param mode - Global or local mode selected by the application.
   */
  async render(mode: RuntimeUiMode): Promise<void> {
    this.modes.push(mode);
  }
}

describe('spec-n-roll-runtime executable', () => {
  it('gives extra terminal rows to route content while chrome stays fixed', () => {
    const allocator = new TerminalLayoutAllocator();
    const compact = allocator.allocate(20);
    const tall = allocator.allocate(30);

    expect(tall.statusRows).toBe(compact.statusRows);
    expect(tall.hintRows).toBe(compact.hintRows);
    expect(tall.contentRows - compact.contentRows).toBe(10);
  });

  it('requests a resize below the supported minimum', () => {
    const layout = new TerminalLayoutAllocator().allocate(5);

    expect(layout.requiresResize).toBe(true);
    expect(layout.contentRows).toBe(0);
  });

  it('launches the local home for a project invocation', async () => {
    const invocation: RuntimeInvocation = {
      argv: ['--root', 'project', 'version'],
      dispatcher: {
        installSource: 'remote',
        installDirectory: '/dispatcher/dist',
        packageVersion: '0.1.0',
      },
      projectRoot: '/workspace/project',
      cwd: '/workspace/project',
    };
    const renderer = new RecordingRuntimeUiRenderer();

    const result = new RuntimeApplication(
      new StringRuntimeInvocationReader(JSON.stringify(invocation)),
      new RuntimeInvocationParser(),
      renderer,
    ).run();

    await expect(result).resolves.toBeUndefined();
    expect(renderer.modes).toEqual(['local']);
  });

  it('rejects empty stdin instead of launching the UI', async () => {
    const renderer = new RecordingRuntimeUiRenderer();

    await expect(
      new RuntimeApplication(
        new StringRuntimeInvocationReader(''),
        new RuntimeInvocationParser(),
        renderer,
      ).run(),
    ).rejects.toThrow('Runtime invocation stdin was empty.');
    expect(renderer.modes).toEqual([]);
  });

  it('rejects malformed invocation objects', async () => {
    const renderer = new RecordingRuntimeUiRenderer();
    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    try {
      await expect(
        new RuntimeApplication(
          new StringRuntimeInvocationReader(
            JSON.stringify({ argv: ['version'] }),
          ),
          new RuntimeInvocationParser(),
          renderer,
        ).run(),
      ).rejects.toThrow(
        'Runtime invocation stdin did not match the dispatcher schema.',
      );
    } finally {
      errorSpy.mockRestore();
    }
  });
});
