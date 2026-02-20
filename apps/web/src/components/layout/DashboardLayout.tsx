import { ReactNode, useState } from 'react'
import { Sidebar } from '../dashboard/Sidebar'
import { Header } from '../dashboard/Header'

interface DashboardLayoutProps {
    children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(true)

    return (
        <div className="min-h-screen bg-[#0a0a0f]">
            {/* Sidebar */}
            <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

            {/* Main Content Area */}
            <div className={`transition-all flex flex-col h-screen ${sidebarOpen ? 'ml-56' : 'ml-0'}`}>
                {/* Header */}
                <Header />

                {/* Page Content */}
                <main className="flex-1 overflow-auto custom-scrollbar p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}
