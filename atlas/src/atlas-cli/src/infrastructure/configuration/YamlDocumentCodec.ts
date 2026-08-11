import { parse, stringify } from 'yaml';

/**
 * Parses and serializes deterministic YAML documents at Atlas filesystem boundaries.
 */
export class YamlDocumentCodec {
  /**
   * Parses one YAML document without applying application-specific validation.
   *
   * @param documentText - UTF-8 YAML document text.
   * @returns Parsed YAML value.
   */
  public parse(documentText: string): unknown {
    return parse(documentText) as unknown;
  }

  /**
   * Serializes one Atlas document with stable key order and a trailing newline.
   *
   * @param value - Plain object or collection to serialize.
   * @returns Deterministic YAML document text.
   */
  public stringify(value: unknown): string {
    return stringify(this.sortValue(value), { lineWidth: 0, sortMapEntries: true });
  }

  /** Recursively orders mapping keys while retaining meaningful collection order. */
  private sortValue(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((entry) => this.sortValue(entry));
    if (typeof value !== 'object' || value === null) return value;
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, this.sortValue(entry)])
    );
  }
}
