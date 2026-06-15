import { inject, injectable } from 'tsyringe';

import { RepositoryWorkflowReportViewService } from '../../../sdk/interactive/repository-workflows.js';

/**
 * Service bundle used by Ink screens for project data and mutations.
 */
export interface InteractiveAppServices {
  /**
   * SDK service that loads repository workflow report views.
   */
  repositoryWorkflowReports: RepositoryWorkflowReportViewService;
}

/**
 * Default service bundle resolved by the interactive application composition root.
 */
@injectable()
export class DefaultInteractiveAppServices implements InteractiveAppServices {
  /**
   * Creates the interactive application service bundle from SDK services.
   *
   * @param repositoryWorkflowReports - SDK service for repository workflow report views.
   */
  constructor(
    @inject(RepositoryWorkflowReportViewService)
    readonly repositoryWorkflowReports: RepositoryWorkflowReportViewService,
  ) {}
}

/**
 * Builds an interactive service bundle without relying on the global container.
 *
 * @returns Default service bundle for tests and direct component rendering.
 */
export function createDefaultInteractiveAppServices(): InteractiveAppServices {
  return new DefaultInteractiveAppServices(new RepositoryWorkflowReportViewService());
}
