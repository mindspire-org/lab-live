export {};

declare global {
  interface Window {
    electron?: {
      getPrinters: () => Promise<{ name: string; displayName: string }[]>;
    };
  }
}
