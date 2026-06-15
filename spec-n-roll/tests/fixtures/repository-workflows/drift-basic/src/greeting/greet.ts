/**
 * Builds a greeting message for a user by name.
 *
 * @param name - Non-empty display name for the user.
 * @returns Greeting text shown to the user.
 */
export function greet(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new Error('Name is required');
  }

  return `Hello, ${trimmed}!`;
}
