import { Catalog } from "@atlas-example/library";
import { CatalogDemo } from "./CatalogDemo.js";
import { RuntimeOutputWriter } from "./RuntimeOutputWriter.js";

/**
 * Starts the runnable TypeScript example with concrete composition dependencies.
 */
const catalogDemo = new CatalogDemo(new Catalog(), new RuntimeOutputWriter());

catalogDemo.run();
