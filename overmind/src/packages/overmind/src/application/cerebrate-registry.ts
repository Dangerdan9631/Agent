export interface RunningCerebrate {
  readonly name: string;
}

interface ActiveWorkflowEntry {
  run: {
    status: 'running' | 'completed' | 'failed';
  };
}

export class CerebrateRegistry<TCerebrate extends RunningCerebrate = RunningCerebrate> {
  private readonly cerebrates = new Map<string, TCerebrate>();
  private readonly activeWorkflows = new Map<string, ActiveWorkflowEntry>();

  add(cerebrate: TCerebrate): void {
    if (this.cerebrates.has(cerebrate.name)) {
      throw new Error(`Cerebrate "${cerebrate.name}" is already registered.`);
    }

    this.cerebrates.set(cerebrate.name, cerebrate);
  }

  get(name: string): TCerebrate | undefined {
    return this.cerebrates.get(name);
  }

  has(name: string): boolean {
    return this.cerebrates.has(name);
  }

  remove(name: string): TCerebrate | undefined {
    const existing = this.cerebrates.get(name);
    if (!existing) {
      return undefined;
    }

    this.cerebrates.delete(name);
    this.activeWorkflows.delete(name);
    return existing;
  }

  values(): TCerebrate[] {
    return Array.from(this.cerebrates.values());
  }

  clear(): void {
    this.cerebrates.clear();
    this.activeWorkflows.clear();
  }

  startWorkflow(name: string, run: ActiveWorkflowEntry['run']): void {
    if (this.activeWorkflows.has(name)) {
      throw new Error(`Workflow already running for cerebrate "${name}".`);
    }

    this.activeWorkflows.set(name, { run });
  }

  getActiveWorkflow(name: string): ActiveWorkflowEntry['run'] | undefined {
    return this.activeWorkflows.get(name)?.run;
  }

  finishWorkflow(name: string): void {
    this.activeWorkflows.delete(name);
  }
}
