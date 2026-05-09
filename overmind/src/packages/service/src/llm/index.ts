import { LlmConfig } from '../config/overmind-config.js';
import { LlmChain } from './chain.js';
import { getLlmProvider } from './registry.js';

export * from './chain.js';
export * from './registry.js';
export * from './types.js';

export function createLlmChain(config: LlmConfig): LlmChain {
  return new LlmChain(config.chain.map((providerName) => getLlmProvider(providerName.agents[0].agent)));
}
