// Global TypeScript declarations for the preload-exposed API
// Make sure "typeRoots" in tsconfig includes src/types or is picked up automatically

declare global {
  interface Window {
    electronAPI?: {
      openFolderDialog: () => Promise<string>;
      closeSplash: () => Promise<void>;
      printCurrent: (options?: Electron.WebviewTagPrintOptions | any) => Promise<{ ok: boolean; error?: string }>;
      printHTML: (html: string, options?: Electron.WebviewTagPrintOptions | any) => Promise<{ ok: boolean; error?: string }>;
      printURL: (url: string, options?: Electron.WebviewTagPrintOptions | any) => Promise<{ ok: boolean; error?: string }>;
    };
  }
}

export {};
