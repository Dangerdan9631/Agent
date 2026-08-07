import { camelCase } from "lodash-es";
import { z } from "zod";

/**
 * Represents a validated catalog product with a stable identifier and display name.
 */
export class CatalogProduct {
  /**
   * Creates a catalog product from values already validated by the owning catalog.
   *
   * @param identifier - Stable product identifier using lowercase letters, digits, and dashes.
   * @param displayName - Human-readable product name with at least one visible character.
   */
  public constructor(
    public readonly identifier: string,
    public readonly displayName: string,
  ) {}
}

/**
 * Validates and normalizes catalog products before application code consumes them.
 */
export class Catalog {
  private readonly productSchema = z.object({
    identifier: z.string().min(1),
    displayName: z.string().min(1),
  });

  /**
   * Builds a product from an untrusted name.
   *
   * @param displayName - Product name that must contain at least one character.
   * @returns A validated product with a normalized identifier.
   */
  public createProduct(displayName: string): CatalogProduct {
    const parsedProduct = this.productSchema.parse({
      identifier: camelCase(displayName),
      displayName,
    });

    return new CatalogProduct(parsedProduct.identifier, parsedProduct.displayName);
  }
}
