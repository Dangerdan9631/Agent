import { beforeEach, describe, expect, it } from 'vitest';

import { CliProgramFactory } from '../../../src/cli/cli-program-factory.js';
import {
  registerApplicationServices,
  resetApplicationContainer,
  rootContainer,
} from '../../../src/di/container.js';

describe('CLI command DI registration', () => {
  beforeEach(() => {
    resetApplicationContainer();
  });

  it('resolves CliProgramFactory and builds a program with expected top-level commands', () => {
    registerApplicationServices();

    const factory = rootContainer.resolve(CliProgramFactory);
    const program = factory.createProgram();

    const commandNames = program.commands.map((command) => command.name());
    expect(commandNames).toContain('init');
    expect(commandNames).toContain('update');
    expect(commandNames).toContain('set-list');
    expect(commandNames).toContain('repository-workflow');
    expect(commandNames).toContain('step');
  });
});
