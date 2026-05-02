import { useState, useEffect } from 'react';
import { container } from 'tsyringe';
import { AgentGateway } from '../../gateway/agent-gateway.js';

interface ServiceStatsData {
  agentCount: number;
  uptime: number;
}

export function useServiceStatsViewModel() {
  const agentGateway = container.resolve(AgentGateway);
  const [stats, setStats] = useState<ServiceStatsData | null>(null);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const data = await agentGateway.getStats();
        if (!cancelled) setStats(data);
      } catch {
        // service may not be available yet
      }
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [agentGateway]);

  return { stats };
}
