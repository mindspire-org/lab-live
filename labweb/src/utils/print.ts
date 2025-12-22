// Renderer-side helpers to call the preload-exposed print APIs
// Usage examples:
//   import { printCurrentWindow, printHTML, printURL } from './utils/print';
//   await printCurrentWindow();
//   await printHTML('<h1>Hello</h1>');
//   await printURL('http://localhost:5173/print/invoice/123');

export type PrintResult = { ok: boolean; error?: string };

export function printCurrentWindow(options?: any): Promise<PrintResult> {
  if (!window.electronAPI?.printCurrent) {
    return Promise.resolve({ ok: false, error: 'printCurrent not available' });
  }
  return window.electronAPI.printCurrent(options);
}

export function printHTML(html: string, options?: any): Promise<PrintResult> {
  if (!window.electronAPI?.printHTML) {
    return Promise.resolve({ ok: false, error: 'printHTML not available' });
  }
  return window.electronAPI.printHTML(html, options);
}

export function printURL(url: string, options?: any): Promise<PrintResult> {
  if (!window.electronAPI?.printURL) {
    return Promise.resolve({ ok: false, error: 'printURL not available' });
  }
  return window.electronAPI.printURL(url, options);
}
