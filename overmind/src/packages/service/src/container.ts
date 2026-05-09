import 'reflect-metadata';
import { container, type DependencyContainer, type InjectionToken } from 'tsyringe';
import { loadOvermindConfig, OvermindConfig } from './config/overmind-config.js';
import { createLlmChain, LlmChain } from './llm/index.js';

export const OvermindConfigToken: InjectionToken<OvermindConfig> = Symbol.for('OvermindService.CONFIG_DIR');

export function buildContainer(configDir: string): DependencyContainer {
  const child = container.createChildContainer();
  const overmindConfig = loadOvermindConfig(configDir);
  child.register(OvermindConfigToken, { useValue: overmindConfig });
  child.register(LlmChain, { useValue: createLlmChain(overmindConfig.llm) });
  return child;
}
