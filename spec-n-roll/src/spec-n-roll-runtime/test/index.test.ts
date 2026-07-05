import { describe, expect, it, vi } from 'vitest';
import {
  RuntimeApplication,
  RuntimeInvocationParser,
  type RuntimeInvocationReader,
  type RuntimeOutputWriter,
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
 * Runtime output writer fixture that records emitted lines.
 */
class RecordingRuntimeOutputWriter implements RuntimeOutputWriter {
  /**
   * Lines written by the runtime application.
   */
  readonly lines: string[] = [];

  /**
   * Records a line of runtime output.
   *
   * @param text - Text emitted by the runtime application.
   */
  writeLine(text: string): void {
    this.lines.push(text);
  }
}

describe('spec-n-roll-runtime executable', () => {
  it('prints the runtime invocation payload received on stdin', () => {
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
    const writer = new RecordingRuntimeOutputWriter();

    new RuntimeApplication(
      new StringRuntimeInvocationReader(JSON.stringify(invocation)),
      new RuntimeInvocationParser(),
      writer,
    ).run();

    expect(writer.lines).toEqual([JSON.stringify(invocation, null, 2)]);
  });

  it('rejects empty stdin instead of printing invalid invocation data', () => {
    const writer = new RecordingRuntimeOutputWriter();

    expect(() =>
      new RuntimeApplication(
        new StringRuntimeInvocationReader(''),
        new RuntimeInvocationParser(),
        writer,
      ).run(),
    ).toThrow('Runtime invocation stdin was empty.');
    expect(writer.lines).toEqual([]);
  });

  it('rejects malformed invocation objects', () => {
    const writer = new RecordingRuntimeOutputWriter();
    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    try {
      expect(() =>
        new RuntimeApplication(
          new StringRuntimeInvocationReader(
            JSON.stringify({ argv: ['version'] }),
          ),
          new RuntimeInvocationParser(),
          writer,
        ).run(),
      ).toThrow(
        'Runtime invocation stdin did not match the dispatcher schema.',
      );
    } finally {
      errorSpy.mockRestore();
    }
  });
});
