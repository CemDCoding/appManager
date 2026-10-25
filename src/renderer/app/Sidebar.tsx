import { NavLink } from 'react-router-dom'
import { useT } from '@/i18n'
import { cn } from '@/lib/utils'
import { navRoutes, PATHS } from './routes'

/** Linke Seitenleiste mit allen Bereichen; aktiver Eintrag hervorgehoben. */
export function Sidebar() {
  const t = useT()
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="px-5 py-5 text-lg font-semibold">{t('common.appName')}</div>
      <nav aria-label={t('common.mainNavigation')} className="flex-1 overflow-y-auto px-3 pb-4">
        <ul className="flex flex-col gap-1">
          {navRoutes.map(({ path, titleKey, icon: Icon }) => (
            <li key={path}>
              <NavLink
                to={path}
                end={path === PATHS.home}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
                    isActive &&
                      'bg-sidebar-active text-sidebar-active-foreground hover:bg-sidebar-active'
                  )
                }
              >
                {Icon && <Icon aria-hidden="true" className="size-4 shrink-0" />}
                <span>{t(`nav.${titleKey}`)}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
