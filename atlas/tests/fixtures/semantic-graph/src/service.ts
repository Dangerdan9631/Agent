import { readFile } from 'node:fs/promises';

import type { BaseContract, DerivedContract } from './contracts.js';

/**
 * Implements the derived fixture contract while referencing the base contract.
 */
export class FixtureService implements DerivedContract {
  /**
   * Creates the fixture service with a base contract dependency.
   *
   * @param dependency - Base contract used to expose the fixture identifier.
   */
  public constructor(private readonly dependency: BaseContract) {}

  /**
   * Returns the fixture identifier from the injected base contract.
   *
   * @returns Stable fixture identifier.
   */
  public get id(): string {
    return this.dependency.id;
  }
}

/**
 * Reads a fixture path to exercise a top-level module external dependency edge.
 *
 * @param filePath - Path to read through Node's built-in file API.
 * @returns File contents from the requested path.
 */
export async function loadFixture(filePath: string): Promise<string> {
  return readFile(filePath, 'utf8');
}

/**
 * Creates one service from a base contract to exercise module-to-class reference resolution.
 *
 * @param contract - Contract used by the returned service.
 * @returns Service implementing the derived fixture contract.
 */
export const createFixtureService = (contract: BaseContract): FixtureService =>
  new FixtureService(contract);
