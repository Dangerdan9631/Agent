/**
 * Defines the base fixture contract for semantic graph analysis.
 */
export interface BaseContract {
  /**
   * Identifies one fixture value.
   */
  readonly id: string;
}

/**
 * Extends the base fixture contract to exercise inheritance graph edges.
 */
export interface DerivedContract extends BaseContract {}

/**
 * Categorizes fixture values for enum discovery.
 */
export enum FixtureKind {
  /**
   * Identifies the default fixture kind.
   */
  Default = 'default'
}

/**
 * Names the selected contract for type-alias graph discovery.
 */
export type ContractAlias = DerivedContract;
