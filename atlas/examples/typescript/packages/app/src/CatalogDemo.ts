import { CatalogQueryService, ImportCatalog } from '@atlas-example/application';
import { format } from 'date-fns';
import { startCase } from 'lodash-es';
import { RuntimeOutputWriter } from './RuntimeOutputWriter.js';

/**
 * Runs the catalog use cases and renders their results for a terminal user.
 */
export class CatalogDemo {
  /**
   * Creates the delivery workflow from application services and output boundary.
   *
   * @param importCatalog - Imports the configured catalog seed.
   * @param catalogQueries - Retrieves imported catalog items.
   * @param output - Writes intentionally user-facing output.
   */
  public constructor(
    private readonly importCatalog: ImportCatalog,
    private readonly catalogQueries: CatalogQueryService,
    private readonly output: RuntimeOutputWriter,
  ) {}

  /**
   * Imports and presents the complete example catalog.
   */
  public run(): void {
    const report = this.importCatalog.execute();
    const importedAt = format(report.importedAt, 'yyyy-MM-dd');
    this.output.writeLine(
      `Imported ${report.importedCount} catalog items on ${importedAt}.`,
    );
    this.catalogQueries.list().forEach((item) => {
      this.output.writeLine(`${startCase(item.kind)}: ${item.describe()}`);
    });
  }
}
