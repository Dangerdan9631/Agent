import type { CatalogSeedReader } from '@atlas-example/application';
import {
  CATALOG_SCHEMA_VERSION,
  CatalogItemKind,
  type CatalogItemDraft,
} from '@atlas-example/domain';
import { trim } from 'lodash-es';
import { z } from 'zod';

/**
 * Validates and translates a JSON catalog seed document at the infrastructure boundary.
 */
export class JsonCatalogSeedReader implements CatalogSeedReader {
  private readonly schema = z.object({
    schemaVersion: z.literal(CATALOG_SCHEMA_VERSION),
    items: z.array(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1),
        kind: z.nativeEnum(CatalogItemKind),
        contributor: z.string().min(1),
      }),
    ),
  });

  /**
   * Creates a reader over one immutable JSON document.
   *
   * @param document - JSON text conforming to catalog seed schema version one.
   */
  public constructor(private readonly document: string) {}

  /**
   * Parses the document and normalizes boundary-owned text values.
   *
   * @returns Validated catalog item drafts.
   */
  public read(): readonly CatalogItemDraft[] {
    const seed = this.schema.parse(JSON.parse(this.document));
    return seed.items.map((item) => ({
      id: trim(item.id),
      title: trim(item.title),
      kind: item.kind,
      contributor: trim(item.contributor),
    }));
  }
}
