import type { OvermindApi, OvermindApiMethod, OvermindApiResponseMap } from 'overmind-api';
import { getServiceStatsController } from './get-service-stats.js';
import { shutdownController } from './shutdown.js';

type Controller<M extends OvermindApiMethod> = (
  service: OvermindApi,
  params: unknown,
) => Promise<OvermindApiResponseMap[M]>;

export const controllers: { [K in OvermindApiMethod]: Controller<K> } = {
  'service.shutdown': shutdownController,
  'service.stats': getServiceStatsController,
};