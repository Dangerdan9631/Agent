/**
 * Renders browser script that persists architecture viewer dark-mode preference.
 */
export class ArchitectureViewerDarkModeScript {
  /**
   * localStorage key used to persist the viewer dark-mode preference.
   */
  static readonly storageKey = 'spec-n-roll-arch-dark-mode';

  /**
   * Renders shared dark-mode preference helpers for generated HTML pages.
   *
   * @returns JavaScript source embedded in architecture viewer HTML pages.
   */
  static render(): string {
    return `
      const darkModeStorageKey = ${JSON.stringify(this.storageKey)};

      function isDarkModeEnabled() {
        return document.body.classList.contains('dark-mode');
      }

      function setDarkMode(enabled) {
        document.body.classList.toggle('dark-mode', enabled);
        darkModeToggle.classList.toggle('active', enabled);
      }

      function loadDarkModePreference() {
        try {
          const stored = localStorage.getItem(darkModeStorageKey);
          if (stored === 'dark') {
            setDarkMode(true);
          } else if (stored === 'light') {
            setDarkMode(false);
          }
        } catch {
          // localStorage may be unavailable in restricted browsing contexts.
        }
      }

      function saveDarkModePreference() {
        try {
          localStorage.setItem(
            darkModeStorageKey,
            isDarkModeEnabled() ? 'dark' : 'light',
          );
        } catch {
          // Ignore write failures when localStorage is unavailable.
        }
      }`;
  }
}
