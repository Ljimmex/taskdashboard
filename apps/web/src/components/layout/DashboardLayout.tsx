import { ReactNode, useState, useEffect } from 'react'
import { useLocation } from '@tanstack/react-router'
import { Sidebar } from '../dashboard/Sidebar'
import { Header } from '../dashboard/Header'

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  )
  const location = useLocation()

  // Close sidebar automatically on route change if on mobile
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }, [location.pathname])

  return (
    <div className="flex min-h-screen overflow-hidden bg-[var(--app-bg-deepest)] transition-colors duration-300">
      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[90] bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Content Area */}
      <div
        className={`flex h-screen flex-col transition-all ${sidebarOpen ? 'lg:ml-56 lg:w-[calc(100%-14rem)]' : 'lg:ml-0 lg:w-full'} w-full`}
      >
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {/* Page Content */}
        <main className="custom-scrollbar flex-1 overflow-auto p-4 pb-24 lg:p-6 lg:pb-6">
          {children}
        </main>
      </div>
    </div>
  )
}
