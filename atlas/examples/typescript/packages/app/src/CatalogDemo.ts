import { Catalog } from "@atlas-example/library";
import { format } from "date-fns";
import { upperFirst } from "lodash-es";
import { RuntimeOutputWriter } from "./RuntimeOutputWriter.js";

/**
 * Demonstrates a directed package dependency through a small catalog workflow.
 */
export class CatalogDemo {
  /**
   * Creates an application workflow with its required package and output boundaries.
   *
   * @param catalog - Catalog package service responsible for product validation.
   * @param output - User-facing output boundary for the demo result.
   */
  public constructor(
    private readonly catalog: Catalog,
    private readonly output: RuntimeOutputWriter,
  ) {}

  /**
   * Creates and renders one catalog product.
   */
  public run(): void {
    const product = this.catalog.createProduct("atlas architecture guide");
    const generatedAt = format(new Date("2026-07-30T00:00:00.000Z"), "yyyy-MM-dd");

    this.output.writeLine(
      `${upperFirst(product.identifier)}: ${product.displayName} (${generatedAt})`,
    );
  }
}
