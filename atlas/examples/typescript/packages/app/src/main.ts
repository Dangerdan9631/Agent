import { CatalogApplication } from './composition/CatalogApplication.js';

/**
 * Starts the runnable TypeScript catalog with its concrete composition dependencies.
 */
const catalogApplication = CatalogApplication.createDefault();

catalogApplication.run();
