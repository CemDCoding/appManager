import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from '@/app/Layout'
import { routes } from '@/app/routes'
import { ThemeProvider } from '@/app/ThemeProvider'
import { Toaster } from '@/components/ui/toast'
import { I18nProvider } from '@/i18n'

const layoutRoutes = routes.filter((route) => route.withLayout)
const bareRoutes = routes.filter((route) => !route.withLayout)

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <Toaster>
          <HashRouter>
            <Routes>
              <Route element={<Layout />}>
                {layoutRoutes.map(({ path, component: Page }) => (
                  <Route key={path} path={path} element={<Page />} />
                ))}
              </Route>
              {bareRoutes.map(({ path, component: Page }) => (
                <Route key={path} path={path} element={<Page />} />
              ))}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HashRouter>
        </Toaster>
      </I18nProvider>
    </ThemeProvider>
  )
}
