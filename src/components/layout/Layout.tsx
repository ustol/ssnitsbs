import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#f5f4f2]">
      {/* Topbar */}
      <Topbar
        onToggleSidebar={() => {
          if (window.innerWidth < 992) {
            setMobileOpen((v) => !v)
          } else {
            setSidebarOpen((v) => !v)
          }
        }}
      />

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[1029] bg-black/45 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        collapsed={!sidebarOpen}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main content */}
      <main
        className="transition-[margin-left] duration-200 ease-in-out"
        style={{
          paddingTop: '52px',
          marginLeft: sidebarOpen ? '232px' : '0px',
        }}
      >
        {/* Responsive: ignore margin-left on mobile */}
        <style>{`@media (max-width: 991.98px) { main { margin-left: 0 !important; } }`}</style>
        <div className="p-3 sm:p-4 md:p-6 max-w-[1440px]">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
