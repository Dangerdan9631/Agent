import { valueA } from './a.js';

/**
 * Exposes a fixture value that completes the dependency cycle.
 */
export const valueB: number = valueA;
