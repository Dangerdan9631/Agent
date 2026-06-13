import { Box } from 'ink';
import React, { createContext, useContext, useId, useLayoutEffect, useMemo, useRef } from 'react';

/**
 * Registry that aggregates row contributions from selection-region descendants.
 */
interface SelectionRowRegistry {
  /**
   * Records a row contribution for a stable contributor id.
   */
  register: (id: string, rows: number) => void;
  /**
   * Removes a row contribution when a contributor unmounts.
   */
  unregister: (id: string) => void;
}

/**
 * Context used by selection controls to report how many terminal rows they require.
 */
const SelectionRowRegistryContext = createContext<SelectionRowRegistry | null>(null);

/**
 * Props for the selection row aggregation provider.
 */
export interface SelectionRowProviderProps {
  /**
   * Called whenever the summed row count from registered contributors changes.
   */
  onRowCountChange: (rows: number) => void;
  /**
   * Descendant selection controls that report their row requirements.
   */
  children: React.ReactNode;
}

/**
 * Aggregates row contributions from selection-region descendants for shell layout.
 *
 * @param props - Row-count callback and descendants that may register contributions.
 * @returns React provider element for selection row reporting.
 */
export function SelectionRowProvider(props: SelectionRowProviderProps): React.ReactElement {
  const onRowCountChangeRef = useRef(props.onRowCountChange);
  onRowCountChangeRef.current = props.onRowCountChange;

  const registry = useMemo(() => {
    const counts = new Map<string, number>();
    let reportedTotal = 0;

    const notify = (): void => {
      if (counts.size === 0) {
        return;
      }

      let total = 0;
      for (const value of counts.values()) {
        total += value;
      }

      const normalizedTotal = Math.max(1, total);
      if (normalizedTotal === reportedTotal) {
        return;
      }

      reportedTotal = normalizedTotal;
      onRowCountChangeRef.current(normalizedTotal);
    };

    return {
      register(id: string, rows: number): void {
        counts.set(id, Math.max(0, Math.floor(rows)));
        notify();
      },
      unregister(id: string): void {
        counts.delete(id);
        notify();
      },
    };
  }, []);

  return (

    <Box borderStyle="single" paddingX={1}>
      <SelectionRowRegistryContext.Provider value={registry}>
        {props.children}
      </SelectionRowRegistryContext.Provider>
    </Box>
  );
}

/**
 * Reports how many terminal rows a selection-region contributor requires.
 *
 * @param rows - Non-negative integer row count for the contributor. Fractional values are floored.
 */
export function useSelectionRowContribution(rows: number): void {
  const registry = useContext(SelectionRowRegistryContext);
  const id = useId();
  const normalizedRows = Math.max(0, Math.floor(rows));

  useLayoutEffect(() => {
    if (registry == null) {
      return;
    }

    registry.register(id, normalizedRows);
    return () => registry.unregister(id);
  }, [registry, id, normalizedRows]);
}
