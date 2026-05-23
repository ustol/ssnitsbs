import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { PanelLeft, Calendar, ChevronDown, User, Settings, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { getInitials } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNavigate } from 'react-router-dom'

interface TopbarProps {
  onToggleSidebar: () => void
}

export default function Topbar({ onToggleSidebar }: TopbarProps) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const today = format(new Date(), 'dd MMM yyyy')

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-[1050] flex items-center gap-2 px-3.5"
      style={{
        height: '52px',
        backgroundColor: '#0c0c0e',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Toggle */}
      <button
        onClick={onToggleSidebar}
        className="w-[34px] h-[34px] flex items-center justify-center rounded-md transition-colors shrink-0"
        style={{ color: 'rgba(255,255,255,0.45)', background: 'transparent', border: 'none', cursor: 'pointer' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}
      >
        <PanelLeft size={16} />
      </button>

      {/* Brand */}
      <Link to="/dashboard" className="flex items-center gap-2.5 no-underline mr-1">
        <div className="w-7 h-7 rounded-md bg-brand flex items-center justify-center text-white font-extrabold text-xs shrink-0">
          S
        </div>
        <div className="hidden md:block w-px h-4 shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }} />
        <span className="hidden md:block text-[0.76rem]" style={{ color: 'rgba(255,255,255,0.38)', letterSpacing: '0.01em' }}>
          Special Business Support
        </span>
      </Link>

      <div className="ml-auto flex items-center gap-2">
        {/* Date chip */}
        <div
          className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[0.72rem]"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.32)' }}
        >
          <Calendar size={10} />
          {today}
        </div>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 rounded-lg px-2 py-1 text-[0.775rem] font-medium transition-colors"
              style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.78)', cursor: 'pointer', maxWidth: '200px' }}
            >
              <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center text-white text-[0.7rem] font-bold shrink-0">
                {getInitials(profile?.full_name ?? 'U')}
              </div>
              <span className="hidden sm:block truncate">{profile?.full_name ?? 'User'}</span>
              <ChevronDown size={10} style={{ opacity: 0.45 }} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 mt-2">
            <DropdownMenuLabel>
              <div className="font-semibold text-sm">{profile?.full_name}</div>
              <div className="text-xs text-muted-foreground capitalize font-normal">{profile?.role}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <User size={14} className="mr-2 text-muted-foreground" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings size={14} className="mr-2 text-muted-foreground" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut size={14} className="mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  )
}
