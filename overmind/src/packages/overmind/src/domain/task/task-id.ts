const TASK_ID_PATTERN = /^([A-Z]{4})-(\d{5})$/;

export class TaskId {
  private constructor(readonly value: string) {}

  static create(value: string): TaskId {
    if (!TASK_ID_PATTERN.test(value)) {
      throw new Error(`Invalid task ID "${value}". Expected format XXXX-NNNNN.`);
    }

    return new TaskId(value);
  }

  static fromParts(taskPrefix: string, taskNumber: number): TaskId {
    if (!/^[A-Z]{4}$/.test(taskPrefix)) {
      throw new Error(`Invalid task prefix "${taskPrefix}". Expected four uppercase letters.`);
    }
    if (!Number.isInteger(taskNumber) || taskNumber < 1) {
      throw new Error(`Invalid task number "${taskNumber}". Expected a positive integer.`);
    }

    return new TaskId(`${taskPrefix}-${String(taskNumber).padStart(5, '0')}`);
  }

  toString(): string {
    return this.value;
  }
}
