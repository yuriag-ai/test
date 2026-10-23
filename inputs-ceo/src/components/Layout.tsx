import clsx from 'clsx'
import { CalendarDays, FilePlus2, ListTodo, Settings2, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const ITENS = [
  { para: '/', rotulo: 'Inputs', icone: ListTodo },
  { para: '/reunioes', rotulo: 'Reuniões', icone: CalendarDays },
  { para: '/importar', rotulo: 'Importar', icone: FilePlus2, destaque: true },
  { para: '/pessoas', rotulo: 'Pessoas', icone: Users },
  { para: '/ajustes', rotulo: 'Ajustes', icone: Settings2 },
]

export function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const esconderNav = pathname.startsWith('/captura')
  return (
    <div className="mx-auto min-h-[100dvh] max-w-xl">
      <main className={clsx(!esconderNav && 'pb-seguro')}>{children}</main>
      {!esconderNav && (
        <nav className="nao-imprimir fixed inset-x-0 bottom-0 z-30 border-t border-regua bg-papel/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur">
          <div className="mx-auto flex max-w-xl items-end justify-around px-2 pt-1.5">
            {ITENS.map(({ para, rotulo, icone: Icone, destaque }) =>
              destaque ? (
                <NavLink key={para} to={para} className="-mt-6 flex flex-col items-center pb-1.5" aria-label="Importar material">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-aqua text-black ring-4 ring-papel">
                    <Icone size={24} strokeWidth={2} />
                  </span>
                  <span className="mt-1 text-[11px] font-bold text-tinta">{rotulo}</span>
                </NavLink>
              ) : (
                <NavLink
                  key={para}
                  to={para}
                  end={para === '/'}
                  className={({ isActive }) =>
                    clsx('flex w-16 flex-col items-center gap-0.5 py-1.5 text-[11px]', isActive ? 'font-bold text-tinta' : 'font-medium text-nevoa')
                  }
                >
                  <Icone size={21} strokeWidth={1.8} />
                  {rotulo}
                </NavLink>
              ),
            )}
          </div>
        </nav>
      )}
    </div>
  )
}
