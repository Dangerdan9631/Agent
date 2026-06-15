import type { Logger } from '../../sdk/logging/index.js';

/**
 * Parses a comma-separated agent id list from a CLI argument or flag value.
 *
 * @param value - Comma-separated agent ids such as `cursor,claude-code`.
 * @returns Trimmed, de-duplicated agent ids in first-seen order.
 */
export function parseCommaSeparatedAgentList(value: string | undefined): string[] {
  if (value == null || value.trim().length === 0) {
    return [];
  }

  const seen = new Set<string>();
  const agents: string[] = [];

  for (const part of value.split(',')) {
    const agentId = part.trim();
    if (agentId.length === 0 || seen.has(agentId)) {
      continue;
    }
    seen.add(agentId);
    agents.push(agentId);
  }

  return agents;
}

/**
 * Logs a core mutation error and exits with code 1.
 *
 * @param error - Error thrown from a core-library operation.
 * @param logger - Logger used to write the error message.
 */
export function exitOnCoreError(error: unknown, logger: Logger): never {
  if (error instanceof Error) {
    logger.error(error.message);
    process.exit(1);
  }
  logger.error(String(error));
  process.exit(1);
}

/**
 * Parses repeated `key=value` CLI arguments into an object map.
 *
 * @param pairs - Raw key=value strings from Commander.
 * @returns Parsed key-value map.
 */
export function parseKeyValuePairs(pairs: string[] | undefined): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const pair of pairs ?? []) {
    const index = pair.indexOf('=');
    if (index === -1) {
      throw new Error(`Invalid pair "${pair}"; expected key=value`);
    }
    result[pair.slice(0, index)] = pair.slice(index + 1);
  }
  return result;
}
