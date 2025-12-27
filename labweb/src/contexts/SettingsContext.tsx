import React from 'react';
import { api } from '@/lab lib/api';

export type SettingsState = {
  hospitalName: string;
  labLogoUrl?: string | null;
  labSubtitle?: string | null;
};

const STORAGE_KEY = 'app_settings';

function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as SettingsState;
  } catch {}
  return { hospitalName: 'Hospital Name', labLogoUrl: null, labSubtitle: null };
}

function saveSettings(next: SettingsState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

export const SettingsContext = React.createContext<{
  settings: SettingsState;
  setSettings: (s: SettingsState) => void;
}>({
  settings: { hospitalName: 'Hospital Name', labLogoUrl: null, labSubtitle: null },
  setSettings: () => {},
});

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettingsState] = React.useState<SettingsState>(() => loadSettings());

  const setSettings = React.useCallback((next: SettingsState) => {
    setSettingsState(next);
    saveSettings(next);
  }, []);

  // On app startup, hydrate settings from backend lab settings so header/logo
  // and other consumers get database values immediately.
  React.useEffect(() => {
    const loadFromBackend = async () => {
      try {
        const res = await api.get('/settings');
        const data = res.data || {};
        const lab = data.lab || {};
        const labAny: any = lab;

        const subtitleText =
          (labAny?.accreditationBody && String(labAny.accreditationBody).trim()) ||
          (labAny?.accreditationText && String(labAny.accreditationText).trim()) ||
          null;

        setSettings({
          hospitalName: lab.labName || settings.hospitalName || 'Hospital Name',
          labLogoUrl: lab.logoUrl ?? settings.labLogoUrl ?? null,
          labSubtitle: subtitleText ?? settings.labSubtitle ?? null,
        });
      } catch (err) {
        // If backend settings fail to load, we keep whatever was in localStorage/defaults
        console.error('Failed to hydrate SettingsContext from backend', err);
      }
    };

    loadFromBackend();
  }, [setSettings]);

  return (
    <SettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export function useSettings() {
  return React.useContext(SettingsContext);
}
