import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { SettingsProvider } from '@/contexts/SettingsContext'
import { ThemeProvider } from 'next-themes'
import { installDemoMocks } from '@/lib/mockData'

installDemoMocks()
createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </ThemeProvider>
);
