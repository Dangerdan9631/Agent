import { Two } from '@atlas-fixture/federation-two';

/**
 * Starts the fixture dependency chain.
 */
export class One {
  /**
   * References the next independently published artifact.
   *
   * @returns A new second fixture declaration.
   */
  public next(): Two {
    return new Two();
  }
}
