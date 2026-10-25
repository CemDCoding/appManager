import { Outlet } from 'react-router-dom'
import { useT } from '@/i18n'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export const MAIN_CONTENT_ID = 'main-content'

/** Grundlayout: Seitenleiste links, Kopfzeile, Inhalt. */
export function Layout() {
  const t = useT()
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <a
        href={`#${MAIN_CONTENT_ID}`}
        onClick={(event) => {
          // HashRouter nutzt den Hash für Routen; daher Fokus direkt setzen.
          event.preventDefault()
          document.getElementById(MAIN_CONTENT_ID)?.focus()
        }}
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        {t('common.skipToContent')}
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main
          id={MAIN_CONTENT_ID}
          tabIndex={-1}
          className="flex-1 overflow-y-auto p-6 outline-none"
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
