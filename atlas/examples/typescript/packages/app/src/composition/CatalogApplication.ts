import { CatalogQueryService, ImportCatalog } from '@atlas-example/application';
import {
  CatalogItemFactory,
  DefaultCatalogTitlePolicy,
} from '@atlas-example/domain';
import {
  DEFAULT_CATALOG_SEED,
  FixedCatalogClock,
  InMemoryCatalogRepository,
  JsonCatalogSeedReader,
} from '@atlas-example/infrastructure';
import { CatalogDemo } from '../CatalogDemo.js';
import { RuntimeOutputWriter } from '../RuntimeOutputWriter.js';

/**
 * Owns concrete dependency composition for the runnable catalog application.
 */
export class CatalogApplication {
  /**
   * Creates the executable application around its delivery workflow.
   *
   * @param demo - Fully composed catalog presentation workflow.
   */
  private constructor(private readonly demo: CatalogDemo) {}

  /**
   * Composes the deterministic example adapters and use cases.
   *
   * @returns Ready-to-run catalog application.
   */
  public static createDefault(): CatalogApplication {
    const repository = new InMemoryCatalogRepository();
    const itemFactory = new CatalogItemFactory(new DefaultCatalogTitlePolicy());
    const seedReader = new JsonCatalogSeedReader(DEFAULT_CATALOG_SEED);
    const clock = new FixedCatalogClock(new Date('2026-07-30T12:00:00.000Z'));
    const importCatalog = new ImportCatalog(
      itemFactory,
      repository,
      seedReader,
      clock,
    );
    const queryService = new CatalogQueryService(repository);
    return new CatalogApplication(
      new CatalogDemo(importCatalog, queryService, new RuntimeOutputWriter()),
    );
  }

  /**
   * Runs the composed catalog workflow.
   */
  public run(): void {
    this.demo.run();
  }
}
