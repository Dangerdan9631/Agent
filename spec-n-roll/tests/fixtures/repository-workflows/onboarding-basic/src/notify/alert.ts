/**
 * Builds an alert message shown to the user.
 *
 * @param message - Non-empty message text to display.
 * @returns Alert text shown to the user.
 */
export function alertUser(message: string): string {
  const trimmed = message.trim();
  if (trimmed.length === 0) {
    throw new Error('Message is required');
  }

  return `ALERT: ${trimmed}`;
}
