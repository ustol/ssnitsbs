import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Network, Building2, Users2, MessageSquare,
  BarChart3, FolderOpen, Building, UserCheck, Users, Settings, LogOut,
  Activity, ClipboardList, Target, Database, type LucideIcon,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { getInitials } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

interface SidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  onMobileClose: () => void
}

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  badge?: number
}

function SidebarLink({ to, label, icon: Icon, badge }: NavItem) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 px-3.5 py-[0.35rem] rounded-md mx-1.5 text-[0.8125rem] transition-colors duration-100 relative',
          isActive
            ? 'bg-white/[0.08] text-white/95 font-medium'
            : 'text-white/65 hover:bg-white/[0.04] hover:text-white/88',
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Left accent bar */}
          {isActive && (
            <span className="absolute left-0 top-[20%] bottom-[20%] w-[3px] bg-brand rounded-r-sm -translate-x-1.5" />
          )}
          <Icon
            size={14}
            className={cn('shrink-0', isActive ? 'text-brand' : 'text-white/28')}
          />
          <span className="truncate">{label}</span>
          {badge != null && badge > 0 && (
            <span className="ml-auto text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-full bg-red-600 text-white leading-tight">
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <li className="px-3.5 pt-3 pb-1 text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-white/28 select-none">
      {children}
    </li>
  )
}



export default function Sidebar({ collapsed, mobileOpen, onMobileClose }: SidebarProps) {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const { data: pendingDDG = 0 } = useQuery({
    queryKey: ['ddg-pending-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('ddg_feedback')
        .select('*', { count: 'exact', head: true })
        .eq('is_actioned', false)
      return count ?? 0
    },
    refetchInterval: 60_000,
  })

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const sidebarStyle: React.CSSProperties = {
    position: 'fixed',
    top: '52px',
    left: 0,
    bottom: 0,
    width: '232px',
    backgroundColor: '#0c0c0e',
    borderRight: '1px solid rgba(255,255,255,0.055)',
    zIndex: 1030,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1)',
    transform: collapsed ? 'translateX(-232px)' : 'translateX(0)',
  }

  return (
    <>
      <aside
        className="sidebar-scroll"
        style={{
          ...sidebarStyle,
          // Override for mobile
        }}
        data-collapsed={collapsed}
        data-mobile-open={mobileOpen}
      >
        {/* Mobile/responsive transform override */}
        <style>{`
          @media (max-width: 991.98px) {
            aside[data-collapsed] { transform: ${mobileOpen ? 'translateX(0)' : 'translateX(-232px)'} !important; }
          }
        `}</style>

        {/* Orange top accent */}
        <div style={{ height: '2px', background: 'linear-gradient(90deg, #E8621A 0%, rgba(232,98,26,0.3) 100%)' }} />

        {/* Brand */}
        <div className="flex items-center gap-2.5 px-3.5 py-3 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.055)' }}>
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center text-white font-extrabold text-xs shrink-0"
            style={{ background: 'linear-gradient(135deg, #E8621A 0%, #C84E10 100%)', boxShadow: '0 0 12px rgba(232,98,26,0.4)' }}
          >S</div>
          <div>
            <div className="text-[0.8rem] font-semibold leading-tight" style={{ color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.01em' }}>SSNIT SBS</div>
            <div className="text-[0.65rem] leading-none mt-px" style={{ color: 'rgba(255,255,255,0.28)' }}>Strategic Business Support</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto sidebar-scroll py-2">
          <ul className="list-none p-0 m-0 space-y-px">
            <SidebarLink to="/dashboard" label="Dashboard" icon={LayoutDashboard} />

            <SectionLabel>Engagements</SectionLabel>
            <SidebarLink to="/partnerships" label="Partnerships" icon={Network} />
            <SidebarLink to="/meetings/external" label="External Meetings" icon={Building2} />
            <SidebarLink to="/meetings/internal" label="Internal Meetings" icon={Users2} />
            <SidebarLink to="/status-tracker" label="Status Tracker" icon={Activity} />
            <SidebarLink to="/performance-tracker" label="Performance Tracker" icon={Target} />

            <SectionLabel>Reporting</SectionLabel>
            <SidebarLink to="/feedback/ddg" label="DDG's Comments" icon={MessageSquare} badge={pendingDDG} />
            <SidebarLink to="/reports" label="Executive Reports" icon={BarChart3} />

            <SectionLabel>Resources</SectionLabel>
            <SidebarLink to="/documents" label="Document Library" icon={FolderOpen} />
            <SidebarLink to="/data-warehouse" label="Data Warehouse" icon={Database} />

            <SectionLabel>Admin</SectionLabel>
            <SidebarLink to="/stakeholders/external" label="External Stakeholders" icon={Building} />
            <SidebarLink to="/stakeholders/internal" label="Internal Stakeholders" icon={UserCheck} />
            <SidebarLink to="/users" label="Users" icon={Users} />
            <SidebarLink to="/audit" label="Audit Trail" icon={ClipboardList} />
            <SidebarLink to="/settings" label="Settings" icon={Settings} />
          </ul>
        </nav>

        {/* Footer */}
        <div
          className="flex items-center gap-2 px-3.5 py-2.5 shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.055)' }}
        >
          <div
            className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-white text-[0.65rem] font-bold shrink-0"
            style={{ background: 'linear-gradient(135deg, #E8621A 0%, #C84E10 100%)' }}
          >
            {getInitials(profile?.full_name ?? 'U')}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[0.75rem] font-medium truncate" style={{ color: 'rgba(255,255,255,0.75)' }}>{profile?.full_name}</div>
            <div className="text-[0.65rem] capitalize" style={{ color: 'rgba(255,255,255,0.28)', marginTop: '1px' }}>{profile?.role}</div>
          </div>
          <button
            onClick={handleSignOut}
            className="text-[0.875rem] transition-colors shrink-0"
            style={{ color: 'rgba(255,255,255,0.22)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.65)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.22)' }}
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </aside>
    </>
  )
}
