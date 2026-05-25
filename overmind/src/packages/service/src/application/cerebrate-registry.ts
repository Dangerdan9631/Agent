export interface RunningCerebrate {
  readonly name: string;
}

export class CerebrateRegistry<TCerebrate extends RunningCerebrate = RunningCerebrate> {
  private readonly cerebrates = new Map<string, TCerebrate>();

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
    return existing;
  }

  values(): TCerebrate[] {
    return Array.from(this.cerebrates.values());
  }

  clear(): void {
    this.cerebrates.clear();
  }
}
