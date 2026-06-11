/**
 * Formats the additive task spec tag for a living spec scenario.
 *
 * @param taskSpecId - Zero-padded numeric task spec id (e.g. `001`).
 * @returns Gherkin tag such as `@spec-n-roll-001`.
 */
export function formatSpecNRollTag(taskSpecId: string): string {
  return `@spec-n-roll-${taskSpecId}`;
}

/**
 * Returns true when a tag is a spec-n-roll task tag for any task spec id.
 *
 * @param tag - Gherkin tag including the leading `@`.
 * @returns True when the tag matches the spec-n-roll task tag pattern.
 */
export function isSpecNRollTaskTag(tag: string): boolean {
  return /^@spec-n-roll-\d{3}$/.test(tag);
}

/**
 * Appends the current task tag to existing scenario tags without removing prior tags.
 *
 * @param existingTags - Tags already present on the scenario.
 * @param taskSpecId - Zero-padded numeric task spec id for the current implementation.
 * @returns Tag list with the current task tag appended when absent.
 */
export function applyAdditiveTaskTags(existingTags: string[], taskSpecId: string): string[] {
  const taskTag = formatSpecNRollTag(taskSpecId);
  if (existingTags.includes(taskTag)) {
    return [...existingTags];
  }

  return [...existingTags, taskTag];
}
