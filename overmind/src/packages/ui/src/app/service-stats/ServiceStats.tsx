import React from 'react';
import { useServiceStatsViewModel } from './use-service-stats-viewmodel.js';

export function ServiceStats(): React.ReactElement {
  const { stats } = useServiceStatsViewModel();

  return (
    <aside style={{ width: 180, borderLeft: '1px solid #333', padding: 12, fontSize: 12 }}>
      <strong>Service Stats</strong>
      {stats ? (
        <ul style={{ listStyle: 'none', padding: 0, marginTop: 8 }}>
          <li>Agents: {stats.agentCount}</li>
          <li>Uptime: {stats.uptime.toFixed(0)}s</li>
        </ul>
      ) : (
        <p style={{ color: '#888' }}>Not connected</p>
      )}
    </aside>
  );
}
