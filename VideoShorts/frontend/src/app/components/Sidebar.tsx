import {
  LayoutDashboard,
  Sparkles,
  Clock,
  Settings,
  Video,
  Film,
} from 'lucide-react';

interface SidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  clipsCount: number;
  timeSavedH: number;
}

export function Sidebar({ activeSection, setActiveSection, clipsCount, timeSavedH }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'create',    label: 'Create Shorts', icon: Sparkles },
    { id: 'history',   label: 'History', icon: Clock },
    { id: 'settings',  label: 'Settings', icon: Settings },
  ];

  const timeSavedLabel = timeSavedH >= 1
    ? `${timeSavedH.toFixed(1)}h`
    : timeSavedH > 0
      ? `${Math.round(timeSavedH * 60)}m`
      : '—';

  return (
    <div className="w-64 h-screen bg-[#0a0a0f] border-r border-white/5 flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Video className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">VideoShorts</h1>
            <div className="text-[10px] px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded-full border border-cyan-500/20 inline-block mt-0.5">
              LOCAL AI TOOL
            </div>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300
                ${isActive
                  ? 'bg-gradient-to-r from-cyan-500/10 to-fuchsia-500/10 text-white shadow-lg shadow-cyan-500/10 border border-cyan-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-400' : ''}`} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Real Stats */}
      <div className="p-4 border-t border-white/5 space-y-3">
        <div className="bg-white/5 rounded-xl p-3 backdrop-blur-sm flex items-center gap-3">
          <Film className="w-5 h-5 text-cyan-400 shrink-0" />
          <div>
            <div className="text-xs text-gray-400">Clips générés</div>
            <div className="text-xl font-bold text-white">{clipsCount}</div>
          </div>
        </div>
        <div className="bg-white/5 rounded-xl p-3 backdrop-blur-sm flex items-center gap-3">
          <Clock className="w-5 h-5 text-fuchsia-400 shrink-0" />
          <div>
            <div className="text-xs text-gray-400">Temps généré</div>
            <div className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
              {timeSavedLabel}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
