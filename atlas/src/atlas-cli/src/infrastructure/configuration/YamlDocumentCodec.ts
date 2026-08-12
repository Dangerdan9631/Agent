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
    return stringify(value, { lineWidth: 0, sortMapEntries: false });
  }
}
