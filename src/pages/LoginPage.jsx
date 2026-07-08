import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store'
import api from '../utils/api'

const SKIN = '#F5CBA7'

/* ─── Role Avatar Components ─────────────────────────────────────────────── */

function AdminAvatar() {
  return (
    <svg viewBox="0 0 100 115" width="126" height="144" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#2d1065"/>
      <circle cx="50" cy="50" r="48" fill="none" stroke="#7c3aed" strokeWidth="2"/>
      <path d="M20 115 Q20 78 50 74 Q80 78 80 115Z" fill="#1e1b4b"/>
      <rect x="44" y="68" width="12" height="12" rx="2" fill="#fff" opacity=".9"/>
      <polygon points="50,70 47,76 50,82 53,76" fill="#dc2626"/>
      <path d="M35 80 Q22 90 24 104" stroke="#1e1b4b" strokeWidth="10" strokeLinecap="round" fill="none"/>
      <circle cx="23" cy="106" r="7" fill={SKIN}/>
      <g style={{transformOrigin:'65px 80px', animation:'waveArm 1.6s ease-in-out infinite'}}>
        <path d="M65 80 Q78 64 74 52" stroke="#1e1b4b" strokeWidth="10" strokeLinecap="round" fill="none"/>
        <circle cx="72" cy="49" r="8" fill={SKIN}/>
      </g>
      <rect x="45" y="62" width="10" height="10" rx="3" fill={SKIN}/>
      <g style={{animation:'headNod 2.4s ease-in-out infinite'}}>
        <circle cx="50" cy="42" r="22" fill={SKIN}/>
        <path d="M28 38 Q30 18 50 16 Q70 18 72 38 Q68 22 50 20 Q32 22 28 38Z" fill="#1a1a2e"/>
        <path d="M34 24 L37 14 L44 20 L50 12 L56 20 L63 14 L66 24Z" fill="#f59e0b"/>
        <rect x="34" y="22" width="32" height="5" rx="2" fill="#d97706"/>
        <circle cx="50" cy="12" r="3" fill="#fbbf24" style={{animation:'crownSpark 1.2s ease-in-out infinite'}}/>
        <circle cx="37" cy="14" r="2" fill="#fcd34d" style={{animation:'crownSpark 1.2s ease-in-out 0.4s infinite'}}/>
        <circle cx="63" cy="14" r="2" fill="#fcd34d" style={{animation:'crownSpark 1.2s ease-in-out 0.8s infinite'}}/>
        <path d="M40 33 Q45 30 48 33" stroke="#2c1810" strokeWidth="1.5" fill="none"/>
        <path d="M52 33 Q55 30 60 33" stroke="#2c1810" strokeWidth="1.5" fill="none"/>
        <circle cx="43" cy="39" r="3" fill="#2c1810"/>
        <circle cx="57" cy="39" r="3" fill="#2c1810"/>
        <circle cx="44" cy="38" r="1" fill="#fff"/>
        <circle cx="58" cy="38" r="1" fill="#fff"/>
        <path d="M43 50 Q50 56 57 50" stroke="#2c1810" strokeWidth="2" fill="none" strokeLinecap="round"/>
      </g>
    </svg>
  )
}

function PMAvatar() {
  return (
    <svg viewBox="0 0 100 115" width="126" height="144" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#1a2f6b"/>
      <circle cx="50" cy="50" r="48" fill="none" stroke="#3b82f6" strokeWidth="2"/>
      <path d="M20 115 Q20 78 50 74 Q80 78 80 115Z" fill="#1e3a8a"/>
      <rect x="44" y="68" width="12" height="10" rx="2" fill="#dbeafe" opacity=".9"/>
      <path d="M35 80 Q20 88 18 100" stroke="#1e3a8a" strokeWidth="10" strokeLinecap="round" fill="none"/>
      <circle cx="17" cy="102" r="7" fill={SKIN}/>
      <rect x="4" y="88" width="20" height="26" rx="3" fill="#fff" stroke="#93c5fd" strokeWidth="1.5"/>
      <rect x="8" y="84" width="12" height="6" rx="2" fill="#93c5fd"/>
      <line x1="8" y1="97" x2="20" y2="97" stroke="#93c5fd" strokeWidth="1.5"/>
      <line x1="8" y1="103" x2="20" y2="103" stroke="#93c5fd" strokeWidth="1.5"/>
      <line x1="8" y1="109" x2="16" y2="109" stroke="#93c5fd" strokeWidth="1.5"/>
      <path d="M6 97 L8 99 L10 94" stroke="#3b82f6" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <g style={{transformOrigin:'65px 80px', animation:'waveArm 1.8s ease-in-out infinite'}}>
        <path d="M65 80 Q80 62 76 50" stroke="#1e3a8a" strokeWidth="10" strokeLinecap="round" fill="none"/>
        <circle cx="74" cy="47" r="8" fill={SKIN}/>
      </g>
      <rect x="45" y="62" width="10" height="10" rx="3" fill={SKIN}/>
      <g style={{animation:'headNod 3s ease-in-out infinite'}}>
        <circle cx="50" cy="42" r="22" fill={SKIN}/>
        <path d="M28 36 Q30 16 50 14 Q70 16 72 36 Q68 20 50 18 Q32 20 28 36Z" fill="#5c3317"/>
        <path d="M68 28 Q74 36 72 46" stroke="#5c3317" strokeWidth="5" strokeLinecap="round" fill="none"/>
        <path d="M40 33 Q45 30 48 33" stroke="#2c1810" strokeWidth="1.5" fill="none"/>
        <path d="M52 33 Q55 30 60 33" stroke="#2c1810" strokeWidth="1.5" fill="none"/>
        <circle cx="43" cy="39" r="3" fill="#2c1810"/>
        <circle cx="57" cy="39" r="3" fill="#2c1810"/>
        <circle cx="44" cy="38" r="1" fill="#fff"/>
        <circle cx="58" cy="38" r="1" fill="#fff"/>
        <path d="M43 50 Q50 56 57 50" stroke="#2c1810" strokeWidth="2" fill="none" strokeLinecap="round"/>
      </g>
    </svg>
  )
}

function FCAvatar() {
  return (
    <svg viewBox="0 0 100 115" width="126" height="144" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#064e3b"/>
      <circle cx="50" cy="50" r="48" fill="none" stroke="#10b981" strokeWidth="2"/>
      <path d="M20 115 Q20 78 50 74 Q80 78 80 115Z" fill="#065f46"/>
      <rect x="44" y="68" width="12" height="10" rx="2" fill="#d1fae5" opacity=".9"/>
      <path d="M35 80 Q24 92 26 106" stroke="#065f46" strokeWidth="10" strokeLinecap="round" fill="none"/>
      <circle cx="25" cy="108" r="7" fill={SKIN}/>
      <g style={{transformOrigin:'65px 80px', animation:'waveArm 1.4s ease-in-out infinite'}}>
        <path d="M65 80 Q80 60 75 48" stroke="#065f46" strokeWidth="10" strokeLinecap="round" fill="none"/>
        <circle cx="73" cy="45" r="8" fill={SKIN}/>
      </g>
      <rect x="45" y="62" width="10" height="10" rx="3" fill={SKIN}/>
      <g style={{animation:'headNod 2.6s ease-in-out infinite'}}>
        <circle cx="50" cy="42" r="22" fill={SKIN}/>
        <path d="M28 36 Q25 20 40 14 Q50 10 60 14 Q75 20 72 36 Q70 18 50 16 Q30 18 28 36Z" fill="#8B4513"/>
        <circle cx="32" cy="30" r="6" fill="#8B4513"/>
        <circle cx="28" cy="38" r="5" fill="#8B4513"/>
        <circle cx="68" cy="30" r="6" fill="#8B4513"/>
        <circle cx="72" cy="38" r="5" fill="#8B4513"/>
        <circle cx="38" cy="20" r="5" fill="#8B4513"/>
        <circle cx="62" cy="20" r="5" fill="#8B4513"/>
        <circle cx="43" cy="39" r="7" fill="none" stroke="#1a1a1a" strokeWidth="1.5"/>
        <circle cx="57" cy="39" r="7" fill="none" stroke="#1a1a1a" strokeWidth="1.5"/>
        <path d="M36 39 Q33 37 30 38" stroke="#1a1a1a" strokeWidth="1.5" fill="none"/>
        <path d="M64 39 Q67 37 70 38" stroke="#1a1a1a" strokeWidth="1.5" fill="none"/>
        <path d="M38 35 Q40 33 42 35" stroke="#10b981" strokeWidth="1" fill="none" opacity=".7" style={{animation:'glassShine 2s ease-in-out infinite'}}/>
        <path d="M52 35 Q54 33 56 35" stroke="#10b981" strokeWidth="1" fill="none" opacity=".7" style={{animation:'glassShine 2s ease-in-out 0.6s infinite'}}/>
        <circle cx="43" cy="39" r="2.5" fill="#2c1810"/>
        <circle cx="57" cy="39" r="2.5" fill="#2c1810"/>
        <circle cx="44" cy="38" r="1" fill="#fff"/>
        <circle cx="58" cy="38" r="1" fill="#fff"/>
        <path d="M43 50 Q50 57 57 50" stroke="#2c1810" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path d="M40 33 Q44 31 46 33" stroke="#2c1810" strokeWidth="1.2" fill="none"/>
        <path d="M54 33 Q56 31 60 33" stroke="#2c1810" strokeWidth="1.2" fill="none"/>
      </g>
    </svg>
  )
}

function TCAvatar() {
  return (
    <svg viewBox="0 0 100 115" width="126" height="144" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#0e3a50"/>
      <circle cx="50" cy="50" r="48" fill="none" stroke="#22d3ee" strokeWidth="2"/>
      <path d="M20 115 Q20 78 50 74 Q80 78 80 115Z" fill="#0c4a6e"/>
      <rect x="44" y="68" width="12" height="10" rx="2" fill="#cffafe" opacity=".9"/>
      <path d="M35 80 Q20 90 22 104" stroke="#0c4a6e" strokeWidth="10" strokeLinecap="round" fill="none"/>
      <g style={{transformOrigin:'21px 100px', animation:'thumbUp 2s ease-in-out infinite'}}>
        <circle cx="21" cy="102" r="7" fill={SKIN}/>
        <path d="M17 100 Q19 92 24 92 Q27 92 27 96 L27 104 Q22 106 17 104Z" fill={SKIN}/>
        <path d="M22 92 Q24 86 26 88" stroke={SKIN} strokeWidth="4" strokeLinecap="round" fill="none"/>
      </g>
      <g style={{transformOrigin:'65px 80px', animation:'waveArm 1.5s ease-in-out infinite'}}>
        <path d="M65 80 Q82 60 78 48" stroke="#0c4a6e" strokeWidth="10" strokeLinecap="round" fill="none"/>
        <circle cx="76" cy="45" r="8" fill={SKIN}/>
      </g>
      <rect x="45" y="62" width="10" height="10" rx="3" fill={SKIN}/>
      <g style={{animation:'headNod 2s ease-in-out infinite'}}>
        <circle cx="50" cy="42" r="22" fill={SKIN}/>
        <path d="M28 38 Q28 20 50 18 Q72 20 72 38" stroke="#0c4a6e" strokeWidth="5" fill="none" strokeLinecap="round"/>
        <circle cx="28" cy="38" r="5" fill="#0c4a6e" style={{animation:'earGlow 1.5s ease-in-out infinite'}}/>
        <circle cx="72" cy="38" r="5" fill="#0c4a6e" style={{animation:'earGlow 1.5s ease-in-out 0.5s infinite'}}/>
        <path d="M30 32 Q35 14 50 12 Q65 14 70 32 Q68 18 60 16 Q50 14 40 16 Q32 18 30 32Z" fill="#2c2c2c"/>
        <polygon points="38,26 35,14 42,22" fill="#2c2c2c"/>
        <polygon points="50,24 48,12 54,20" fill="#2c2c2c"/>
        <polygon points="62,26 65,14 58,22" fill="#2c2c2c"/>
        <path d="M40 33 Q44 30 47 33" stroke="#2c1810" strokeWidth="1.5" fill="none"/>
        <path d="M53 33 Q56 30 60 33" stroke="#2c1810" strokeWidth="1.5" fill="none"/>
        <circle cx="43" cy="39" r="3" fill="#2c1810"/>
        <circle cx="57" cy="39" r="3" fill="#2c1810"/>
        <circle cx="44" cy="38" r="1" fill="#fff"/>
        <circle cx="58" cy="38" r="1" fill="#fff"/>
        <path d="M43 50 Q50 56 57 50" stroke="#2c1810" strokeWidth="2" fill="none" strokeLinecap="round"/>
      </g>
    </svg>
  )
}

function HRAvatar() {
  return (
    <svg viewBox="0 0 100 115" width="126" height="144" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#831843"/>
      <circle cx="50" cy="50" r="48" fill="none" stroke="#ec4899" strokeWidth="2"/>
      <text x="12" y="28" fontSize="9" fill="#f9a8d4" style={{animation:'heartFloat 2s ease-out infinite'}}>♥</text>
      <text x="72" y="24" fontSize="7" fill="#fda4af" style={{animation:'heartFloat 2s ease-out 0.7s infinite'}}>♥</text>
      <text x="80" y="44" fontSize="6" fill="#f9a8d4" style={{animation:'heartFloat 2s ease-out 1.3s infinite'}}>♥</text>
      <path d="M20 115 Q20 78 50 74 Q80 78 80 115Z" fill="#9d174d"/>
      <rect x="44" y="68" width="12" height="10" rx="2" fill="#fce7f3" opacity=".9"/>
      <g style={{transformOrigin:'35px 80px', animation:'waveArmL 2s ease-in-out infinite'}}>
        <path d="M35 80 Q16 68 14 54" stroke="#9d174d" strokeWidth="10" strokeLinecap="round" fill="none"/>
        <circle cx="13" cy="51" r="8" fill={SKIN}/>
      </g>
      <g style={{transformOrigin:'65px 80px', animation:'waveArm 2s ease-in-out infinite'}}>
        <path d="M65 80 Q84 68 86 54" stroke="#9d174d" strokeWidth="10" strokeLinecap="round" fill="none"/>
        <circle cx="87" cy="51" r="8" fill={SKIN}/>
      </g>
      <rect x="45" y="62" width="10" height="10" rx="3" fill={SKIN}/>
      <g style={{animation:'headNod 2.8s ease-in-out infinite'}}>
        <circle cx="50" cy="42" r="22" fill={SKIN}/>
        <path d="M28 36 Q26 18 50 14 Q74 18 72 36 Q70 20 50 18 Q30 20 28 36Z" fill="#1a1a1a"/>
        <path d="M28 36 Q22 55 26 75" stroke="#1a1a1a" strokeWidth="8" strokeLinecap="round" fill="none"/>
        <path d="M72 36 Q78 55 74 75" stroke="#1a1a1a" strokeWidth="8" strokeLinecap="round" fill="none"/>
        <path d="M38 50 Q50 62 62 50" stroke="#2c1810" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <circle cx="36" cy="48" r="6" fill="#f9a8d4" opacity=".4"/>
        <circle cx="64" cy="48" r="6" fill="#f9a8d4" opacity=".4"/>
        <path d="M40 33 Q45 30 48 33" stroke="#2c1810" strokeWidth="1.5" fill="none"/>
        <path d="M52 33 Q55 30 60 33" stroke="#2c1810" strokeWidth="1.5" fill="none"/>
        <circle cx="43" cy="39" r="3" fill="#2c1810"/>
        <circle cx="57" cy="39" r="3" fill="#2c1810"/>
        <circle cx="44" cy="38" r="1" fill="#fff"/>
        <circle cx="58" cy="38" r="1" fill="#fff"/>
      </g>
    </svg>
  )
}

function getRoleAvatar(role) {
  const r = (role || '').toLowerCase()
  if (r.includes('admin'))                          return <AdminAvatar />
  if (r.includes('project') || r === 'pm')          return <PMAvatar />
  if (r.includes('fc') || r.includes('functional')) return <FCAvatar />
  if (r.includes('tc') || r.includes('technical'))  return <TCAvatar />
  if (r.includes('hr'))                             return <HRAvatar />
  return <AdminAvatar />
}

function getRoleConfig(role) {
  const r = (role || '').toLowerCase()
  if (r.includes('admin'))
    return { ring:'#7c3aed', grad:'linear-gradient(135deg,#7c3aed,#4f46e5)', welcome:'Welcome back, Commander', emoji:'👑' }
  if (r.includes('project') || r === 'pm')
    return { ring:'#3b82f6', grad:'linear-gradient(135deg,#3b82f6,#1d4ed8)', welcome:'Ready to manage your projects', emoji:'📋' }
  if (r.includes('fc') || r.includes('functional'))
    return { ring:'#10b981', grad:'linear-gradient(135deg,#10b981,#059669)', welcome:"Let's analyse something great", emoji:'📊' }
  if (r.includes('tc') || r.includes('technical'))
    return { ring:'#22d3ee', grad:'linear-gradient(135deg,#22d3ee,#0284c7)', welcome:"Systems online. Let's build", emoji:'⚙️' }
  if (r.includes('hr'))
    return { ring:'#ec4899', grad:'linear-gradient(135deg,#ec4899,#be185d)', welcome:"So glad you're here today!", emoji:'💗' }
  return { ring:'#a78bfa', grad:'linear-gradient(135deg,#a78bfa,#60a5fa)', welcome:'Welcome back', emoji:'👋' }
}

/* ─── Animated Splash Screen (post-login, role-based avatar) ─────────────── */
function SplashScreen({ userName, userRole }) {
  const [phase, setPhase] = useState(0)
  const cfg = getRoleConfig(userRole)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 100)
    const t2 = setTimeout(() => setPhase(2), 2400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
        opacity: phase === 2 ? 0 : 1,
        transition: 'opacity 0.6s ease',
        pointerEvents: 'none',
      }}
    >
      <div style={{
        position:'absolute', top:'15%', left:'10%',
        width:320, height:320, borderRadius:'50%',
        background:`radial-gradient(circle, ${cfg.ring}40, transparent)`,
        animation:'splashFloat 6s ease-in-out infinite',
      }}/>
      <div style={{
        position:'absolute', bottom:'10%', right:'8%',
        width:400, height:400, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(79,70,229,0.2), transparent)',
        animation:'splashFloat 8s ease-in-out infinite 1s',
      }}/>
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.06 }}>
        {Array.from({length:20}, (_,i) => (
          <line key={`h${i}`} x1="0" y1={`${i*5}%`} x2="100%" y2={`${i*5}%`} stroke="#818cf8" strokeWidth="1"/>
        ))}
        {Array.from({length:20}, (_,i) => (
          <line key={`v${i}`} x1={`${i*5}%`} y1="0" x2={`${i*5}%`} y2="100%" stroke="#818cf8" strokeWidth="1"/>
        ))}
      </svg>
      <div style={{ position:'relative', width:200, height:200, marginBottom:24 }}>
        <div style={{
          position:'absolute', inset:-20,
          border:`1px solid ${cfg.ring}33`,
          borderRadius:'50%',
          animation:'splashPulse 2s ease-in-out infinite',
        }}/>
        <svg viewBox="0 0 200 200" style={{ width:200, height:200, transform:'rotate(-90deg)', position:'absolute', inset:0 }}>
          <circle cx="100" cy="100" r="92" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6"/>
          <circle cx="100" cy="100" r="92" fill="none"
            stroke="url(#splashGrad)" strokeWidth="6"
            strokeLinecap="round" strokeDasharray="578" strokeDashoffset="578"
            style={{ animation:'splashProgress 2s ease-out 0.2s forwards' }}
          />
          <defs>
            <linearGradient id="splashGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={cfg.ring}/>
              <stop offset="100%" stopColor="#60a5fa"/>
            </linearGradient>
          </defs>
        </svg>
        <div style={{
          position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
          animation:'splashLogoPop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.3s both',
        }}>
          {getRoleAvatar(userRole)}
        </div>
      </div>
      <div style={{ animation:'splashFadeUp 0.6s ease 0.4s both', textAlign:'center', marginBottom:8 }}>
        <h1 style={{ fontSize:28, fontWeight:700, color:'#fff', letterSpacing:'-0.02em', margin:0 }}>
          Project{' '}
          <span style={{ background:'linear-gradient(135deg,#a78bfa,#60a5fa)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>WBS</span>
        </h1>
        <p style={{ color:'#94a3b8', fontSize:13, margin:'4px 0 0', letterSpacing:'0.05em' }}>
          REQUIREMENT &amp; TRACKING SYSTEM
        </p>
      </div>
      {userName && (
        <div style={{
          animation:'splashFadeUp 0.6s ease 0.7s both',
          color: cfg.ring, fontSize:13, marginBottom:32, fontWeight:500, textAlign:'center',
        }}>
          {cfg.emoji} {cfg.welcome}, <strong style={{color:'#fff'}}>{userName}</strong>!
        </div>
      )}
      <div style={{ display:'flex', gap:8, animation:'splashFadeUp 0.6s ease 0.9s both' }}>
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{
            width:6, height:6, borderRadius:'50%',
            background: cfg.grad,
            animation:`splashDot 1.2s ease-in-out ${i*0.15}s infinite`,
          }}/>
        ))}
      </div>
      <p style={{ color:'#475569', fontSize:11, marginTop:16, animation:'splashFadeUp 0.6s ease 1s both', letterSpacing:'0.08em' }}>
        LOADING YOUR WORKSPACE…
      </p>
      <style>{`
        @keyframes splashFloat {
          0%,100% { transform:translateY(0) scale(1); }
          50%      { transform:translateY(-20px) scale(1.04); }
        }
        @keyframes splashPulse {
          0%,100% { transform:scale(1);   opacity:0.4; }
          50%      { transform:scale(1.1); opacity:0.1; }
        }
        @keyframes splashProgress {
          from { stroke-dashoffset:578; }
          to   { stroke-dashoffset:0; }
        }
        @keyframes splashLogoPop {
          from { transform:scale(0) rotate(-15deg); opacity:0; }
          to   { transform:scale(1) rotate(0deg);   opacity:1; }
        }
        @keyframes splashFadeUp {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes splashDot {
          0%,100% { transform:translateY(0);    opacity:0.3; }
          50%      { transform:translateY(-8px); opacity:1; }
        }
        @keyframes waveArm {
          0%,100% { transform:rotate(-20deg); }
          50%      { transform:rotate(25deg); }
        }
        @keyframes waveArmL {
          0%,100% { transform:rotate(20deg); }
          50%      { transform:rotate(-25deg); }
        }
        @keyframes headNod {
          0%,100% { transform:translateY(0); }
          50%      { transform:translateY(-3px); }
        }
        @keyframes crownSpark {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:0.5; transform:scale(1.5); }
        }
        @keyframes glassShine {
          0%,100% { opacity:0.3; }
          50%      { opacity:0.9; }
        }
        @keyframes earGlow {
          0%,100% { fill:#0c4a6e; }
          50%      { fill:#22d3ee; }
        }
        @keyframes thumbUp {
          0%,100% { transform:rotate(0deg); }
          50%      { transform:rotate(-15deg); }
        }
        @keyframes heartFloat {
          0%   { transform:translateY(0);     opacity:0.8; }
          100% { transform:translateY(-30px); opacity:0; }
        }
      `}</style>
    </div>
  )
}

/* ─── Login Page ─────────────────────────────────────────────────────────── */
export default function LoginPage() {
  const navigate = useNavigate()
  const setUser = useAppStore((s) => s.setUser)
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [splashUser, setSplashUser] = useState(null)
  const [splashRole, setSplashRole] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await api.post('/auth/login', form)
      setUser(res.data.user, res.data.token)
      setSplashRole(res.data.user.role)
      setSplashUser(res.data.user.name)
      setTimeout(() => navigate('/'), 2600)
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password')
      setLoading(false)
    }
  }

  return (
    <>

      {splashUser !== null && (
        <SplashScreen userName={splashUser} userRole={splashRole} />
      )}

      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
           style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>

        <div className="absolute top-20 left-20 w-72 h-72 rounded-full opacity-20 animate-float"
             style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
        <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full opacity-15"
             style={{ background: 'radial-gradient(circle, #4f46e5, transparent)', animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full opacity-10 animate-float"
             style={{ background: 'radial-gradient(circle, #818cf8, transparent)', transform: 'translate(-50%,-50%)', animationDelay: '2s' }} />

        <div className="w-full max-w-md relative z-10 animate-fade-up">

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-4 animate-float"
                 style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 20px 60px rgba(124,58,237,0.5)' }}>
              <span className="text-4xl">📋</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-1">
              Project{' '}
              <span style={{ background: 'linear-gradient(135deg, #a78bfa, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                WBS
              </span>
            </h1>
            <p className="text-slate-400 text-sm">Requirement &amp; Tracking System</p>
          </div>

          <div className="rounded-3xl p-6 border border-white/10 backdrop-blur-xl"
               style={{ background: 'rgba(255,255,255,0.07)' }}>

            <h2 className="text-white font-semibold text-lg mb-5">Welcome back 👋</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Email address</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">📧</span>
                  <input
                    className="w-full h-11 pl-9 pr-4 rounded-xl border border-white/10 bg-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    type="email" placeholder="you@company.com"
                    value={form.email} onChange={e => setForm({...form, email: e.target.value})} required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">🔐</span>
                  <input
                    className="w-full h-11 pl-9 pr-10 rounded-xl border border-white/10 bg-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                    type={showPass ? 'text' : 'password'} placeholder="••••••••"
                    value={form.password} onChange={e => setForm({...form, password: e.target.value})} required
                  />
                  <button type="button" onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors text-xs">
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-rose-300 bg-rose-500/20 border border-rose-500/30 px-3 py-2.5 rounded-xl">
                  <span>⚠️</span> {error}
                </div>
              )}

              <button type="submit" disabled={loading || splashUser !== null}
                className="w-full h-11 rounded-xl text-sm font-semibold text-white transition-all duration-200 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 8px 24px rgba(124,58,237,0.4)' }}>
                {loading ? <><span className="animate-spin">⟳</span> Signing in…</> : <><span>🚀</span> Sign in</>}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-600 mt-4">
            🔒 Secure login • Your data is protected
          </p>
        </div>
      </div>
    </>
  )
}
