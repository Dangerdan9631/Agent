import { StrictMode } from 'react';
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';

/**
 * Renders the standalone viewer build shell used when Atlas viewer assets are hosted directly.
 */
class ViewerApplication {
  /**
   * Creates the standalone viewer shell.
   */
  public render(): ReactElement {
    return <main>Open a generated Atlas diagram from its artifact root.</main>;
  }
}

/**
 * Defines the mounted Atlas viewer application instance.
 */
const viewerApplication = new ViewerApplication();

createRoot(document.getElementById('root')!).render(
  <StrictMode>{viewerApplication.render()}</StrictMode>
);
