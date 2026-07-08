import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store'

const CARDS = [
  {
    id: 'global',
    icon: '🌐',
    title: 'Global Hub',
    subtitle: 'Cross-project command center',
    desc: 'Manage tasks, deadlines, team workload, and analytics across all projects from one place.',
    path: '/global/dashboard',
    gradient: 'from-violet-600 via-purple-600 to-indigo-700',
    glow: 'rgba(124,58,237,0.4)',
    features: ['📌 Task Assignments', '📅 Upcoming Deadlines', '👥 Team Workload', '📊 Global Dashboard', '⏱️ Work Hours'],
    badge: 'Cross-project',
  },
  {
    id: 'projects',
    icon: '🏗️',
    title: 'Projects',
    subtitle: 'Project management & tracking',
    desc: 'Create and manage implementation projects with milestone tracking, requirement gathering, and sign-offs.',
    path: '/projects',
    gradient: 'from-blue-600 via-cyan-600 to-teal-600',
    glow: 'rgba(37,99,235,0.4)',
    features: ['🏁 10 Milestones', '📋 Requirement Forms', '✅ Sign-off Workflow', '📤 Excel & PDF Export', '🔔 Notifications'],
    badge: 'Project-level',
  },
]

const STATS = [
  { icon: '🚀', label: 'Built for scale', value: 'Multi-project' },
  { icon: '⚡', label: 'Real-time tracking', value: 'Live updates' },
  { icon: '🔒', label: 'Role-based access', value: '4 user roles' },
  { icon: '📊', label: 'Analytics ready', value: 'Full reports' },
]

export default function HomePage() {
  const navigate = useNavigate()
  const user = useAppStore(s => s.user)
  const logout = useAppStore(s => s.logout)

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col"
         style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #1a1040 40%, #0d1b3e 70%, #0a2a4a 100%)' }}>

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-5"
             style={{ backgroundImage: 'linear-gradient(rgba(139,92,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.3) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        {/* Floating orbs */}
        <div className="absolute top-20 left-20 w-96 h-96 rounded-full animate-float opacity-10"
             style={{ background: 'radial-gradient(circle, #7c3aed, transparent)', animationDelay: '0s' }} />
        <div className="absolute bottom-20 right-20 w-80 h-80 rounded-full opacity-10"
             style={{ background: 'radial-gradient(circle, #2563eb, transparent)', animation: 'float 4s ease-in-out infinite', animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full -translate-x-1/2 -translate-y-1/2 opacity-5"
             style={{ background: 'radial-gradient(circle, #10b981, transparent)', animation: 'float 5s ease-in-out infinite', animationDelay: '2s' }} />

        {/* Floating tech icons */}
        {['⚡','📊','🔮','💡','🛠️','📈','🔄','🧩'].map((icon, i) => (
          <div key={i} className="absolute text-2xl opacity-10 animate-float"
               style={{
                 left: `${10 + (i * 12)}%`,
                 top: `${15 + (i % 3) * 25}%`,
                 animationDelay: `${i * 0.5}s`,
                 animationDuration: `${3 + i * 0.4}s`
               }}>
            {icon}
          </div>
        ))}
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-8 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl"
               style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 4px 16px rgba(124,58,237,0.4)' }}>
            📋
          </div>
          <div>
            <div className="text-white font-bold text-sm">Project WBS</div>
            <div className="text-slate-400 text-xs">Requirement & Tracking System</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                 style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
              {user?.name?.slice(0,2).toUpperCase()}
            </div>
            <div>
              <div className="text-xs font-medium text-white">{user?.name}</div>
              <div className="text-xs text-slate-400">{user?.role}</div>
            </div>
          </div>
          <button onClick={logout}
            className="text-xs text-slate-400 hover:text-white border border-white/10 px-3 py-2 rounded-xl transition-colors hover:bg-white/5">
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="text-center mb-12 animate-fade-up">
          <div className="inline-flex items-center gap-2 bg-violet-500/20 border border-violet-500/30 rounded-full px-4 py-1.5 text-xs text-violet-300 font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Digital Transformation Platform
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Welcome back,{' '}
            <span style={{ background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {user?.name?.split(' ')[0]}
            </span>
            <span className="ml-2">👋</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Your intelligent project management platform for requirement gathering, milestone tracking, and team collaboration.
          </p>
        </div>

        {/* Main cards */}
        <div className="grid grid-cols-2 gap-6 max-w-4xl w-full mb-12 stagger">
          {CARDS.map((card) => (
            <div key={card.id}
              onClick={() => navigate(card.path)}
              className="group cursor-pointer rounded-3xl border border-white/10 p-6 hover:border-white/20 transition-all duration-300 hover:-translate-y-1 animate-fade-up relative overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)' }}>

              {/* Card glow on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl"
                   style={{ background: `radial-gradient(circle at 50% 0%, ${card.glow} 0%, transparent 70%)` }} />

              <div className="relative z-10">
                {/* Badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs bg-white/10 border border-white/10 text-white/60 px-2.5 py-1 rounded-full font-medium">
                    {card.badge}
                  </span>
                  <span className="text-xs text-white/40 group-hover:text-white/70 transition-colors">
                    Click to enter →
                  </span>
                </div>

                {/* Icon */}
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-3xl mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                     style={{ boxShadow: `0 8px 32px ${card.glow}` }}>
                  {card.icon}
                </div>

                {/* Title */}
                <h2 className="text-xl font-bold text-white mb-1">{card.title}</h2>
                <p className="text-sm text-slate-400 mb-1 font-medium">{card.subtitle}</p>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">{card.desc}</p>

                {/* Features */}
                <div className="space-y-1.5">
                  {card.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                      <span className="w-1 h-1 rounded-full bg-slate-500 group-hover:bg-violet-400 transition-colors flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className={`mt-5 w-full py-2.5 rounded-xl text-sm font-semibold text-white text-center bg-gradient-to-r ${card.gradient} opacity-80 group-hover:opacity-100 transition-all duration-200`}
                     style={{ boxShadow: `0 4px 16px ${card.glow}` }}>
                  Enter {card.title} →
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-8 animate-fade-up">
          {STATS.map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-xl mb-1">{s.icon}</div>
              <div className="text-white font-semibold text-sm">{s.value}</div>
              <div className="text-slate-500 text-xs">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom tag */}
      <div className="relative z-10 text-center py-4 border-t border-white/5">
        <p className="text-xs text-slate-600">
          🔒 Secure platform · Role-based access · Real-time collaboration
        </p>
      </div>
    </div>
  )
}
