import type { CatalogItemFactory } from '@atlas-example/domain';
import type { CatalogClock } from './CatalogClock.js';
import { CatalogImportReport } from './CatalogImportReport.js';
import type { CatalogRepository } from './CatalogRepository.js';
import type { CatalogSeedReader } from './CatalogSeedReader.js';

/**
 * Imports validated seed data through domain construction and repository ports.
 */
export class ImportCatalog {
  /**
   * Creates the use case from inward-facing domain and port dependencies.
   *
   * @param itemFactory - Creates valid domain item specializations.
   * @param repository - Persists each created item.
   * @param seedReader - Loads validated external drafts.
   * @param clock - Supplies the import timestamp.
   */
  public constructor(
    private readonly itemFactory: CatalogItemFactory,
    private readonly repository: CatalogRepository,
    private readonly seedReader: CatalogSeedReader,
    private readonly clock: CatalogClock,
  ) {}

  /**
   * Imports the current seed document as one application operation.
   *
   * @returns Report containing the persisted items and operation timestamp.
   */
  public execute(): CatalogImportReport {
    const items = this.seedReader
      .read()
      .map((draft) => this.itemFactory.create(draft));
    items.forEach((item) => this.repository.save(item));
    return new CatalogImportReport(this.clock.now(), items);
  }
}
