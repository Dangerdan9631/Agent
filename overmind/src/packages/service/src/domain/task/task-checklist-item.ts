export interface TaskChecklistItem {
  text: string;
  done: boolean;
}

export function createTaskChecklistItems(items: readonly string[] = []): TaskChecklistItem[] {
  return items.map((text) => ({ text, done: false }));
}
