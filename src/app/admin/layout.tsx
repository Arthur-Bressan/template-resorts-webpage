'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  BedDouble,
  Mountain,
  ImageIcon,
  MessageSquareQuote,
  HelpCircle,
  Info,
  Settings,
  Mail,
  Inbox,
  CalendarCheck,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Link as LinkIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { adminApi, getToken, clearToken, getAdminUser } from '@/lib/admin-client'

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Quartos', href: '/admin/rooms', icon: BedDouble },
  { label: 'Experiências', href: '/admin/experiences', icon: Mountain },
  { label: 'Galeria', href: '/admin/gallery', icon: ImageIcon },
  { label: 'Depoimentos', href: '/admin/testimonials', icon: MessageSquareQuote },
  { label: 'FAQ', href: '/admin/faq', icon: HelpCircle },
  { label: 'Sobre', href: '/admin/about', icon: Info },
  { label: 'Navegação', href: '/admin/nav-links', icon: LinkIcon },
  { label: 'Configurações', href: '/admin/settings', icon: Settings },
  { label: 'Newsletter', href: '/admin/newsletter', icon: Mail },
  { label: 'Contatos', href: '/admin/contacts', icon: Inbox },
  { label: 'Reservas', href: '/admin/reservations', icon: CalendarCheck },
]

function SidebarContent({ pathname, onClose, onLogout }: { pathname: string; onClose: () => void; onLogout: () => void }) {
  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary)]">
          <BedDouble className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">Refúgio Admin</p>
          <p className="truncate text-xs text-gray-400">Painel de Gestão</p>
        </div>
      </div>
      <Separator className="bg-gray-700" />
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
              }`}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              <span>{item.label}</span>
              {active && <ChevronRight className="ml-auto h-4 w-4" />}
            </Link>
          )
        })}
      </nav>
      <Separator className="bg-gray-700" />
      <div className="p-3">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-400 transition-colors hover:bg-gray-800/50 hover:text-red-400"
        >
          <LogOut className="h-4.5 w-4.5" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<Record<string, string> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      router.replace('/admin/login')
      return
    }
    adminApi.auth.getSession().then((res) => {
      if (res) {
        setUser(res.user || getAdminUser())
      }
      setLoading(false)
    }).catch(() => {
      clearToken()
      router.replace('/admin/login')
    })
  }, [router])

  const handleLogout = () => {
    clearToken()
    router.replace('/admin/login')
  }

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent pathname={pathname} onClose={() => setSidebarOpen(false)} onLogout={handleLogout} />
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <h1 className="text-lg font-semibold text-gray-900">
              {navItems.find((i) => isActive(i.href))?.label || 'Admin'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-500 sm:inline">
              {user?.name || user?.email || 'Admin'}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-500 hover:text-red-600">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
