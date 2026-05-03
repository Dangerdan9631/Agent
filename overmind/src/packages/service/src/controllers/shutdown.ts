import type { OvermindApi, ShutdownRequest, ShutdownResponse } from 'overmind-api';

export async function shutdownController(
  service: OvermindApi,
  params: unknown,
): Promise<ShutdownResponse> {
  return service.shutdown((params ?? {}) as ShutdownRequest);
}