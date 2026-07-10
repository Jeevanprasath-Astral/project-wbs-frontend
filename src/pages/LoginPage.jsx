import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store'
import api from '../utils/api'

const SKIN = '#F5CBA7'

/* ─── Connectome Full Logo SVG ───────────────────────────────────────────────
   Left hemisphere: blue (#1d6ec6) with white PCB circuit traces
   Right hemisphere: orange (#e85d1a) with black neural-network nodes
   Text: CONNECT (blue) + OME (orange)
   Tagline: "Intelligent insights. Powerful Solutions"
────────────────────────────────────────────────────────────────────────────── */
function ConnectomeLogo({ width = 520, height = 152 }) {
  return (
    <svg viewBox="0 0 520 152" width={width} height={height} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="clL">
          <path d="M68,10 C55,10 41,15 30,26 C17,39 9,57 8,76 C7,93 13,112 27,124 C40,136 57,142 68,142 L68,10Z"/>
        </clipPath>
        <clipPath id="clR">
          <path d="M68,10 C81,10 95,15 106,26 C119,39 127,57 128,76 C129,93 123,112 109,124 C96,136 79,142 68,142 L68,10Z"/>
        </clipPath>
      </defs>

      {/* ── Left hemisphere (blue) ── */}
      <path d="M68,10 C55,10 41,15 30,26 C17,39 9,57 8,76 C7,93 13,112 27,124 C40,136 57,142 68,142 L68,10Z"
            fill="#1d6ec6"/>
      {/* PCB circuit traces (white) */}
      <g clipPath="url(#clL)" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Trace row 1 */}
        <polyline points="68,28 45,28 45,18 34,18"/>
        <rect x="40.5" y="23.5" width="9" height="9" fill="#fff" stroke="none" rx="1.5"/>
        {/* Trace row 2 */}
        <polyline points="68,48 16,48"/>
        <rect x="11.5" y="43.5" width="9" height="9" fill="#fff" stroke="none" rx="1.5"/>
        <rect x="39.5" y="43.5" width="9" height="9" fill="#fff" stroke="none" rx="1.5"/>
        {/* Trace row 3 — T down */}
        <polyline points="68,68 22,68 22,56"/>
        <rect x="17.5" y="51.5" width="9" height="9" fill="#fff" stroke="none" rx="1.5"/>
        <rect x="17.5" y="63.5" width="9" height="9" fill="#fff" stroke="none" rx="1.5"/>
        {/* Trace row 4 */}
        <polyline points="68,90 28,90 28,102 16,102"/>
        <rect x="11.5" y="97.5" width="9" height="9" fill="#fff" stroke="none" rx="1.5"/>
        <rect x="23.5" y="85.5" width="9" height="9" fill="#fff" stroke="none" rx="1.5"/>
        {/* Trace row 5 */}
        <polyline points="68,112 40,112 40,124 52,124"/>
        <rect x="47.5" y="119.5" width="9" height="9" fill="#fff" stroke="none" rx="1.5"/>
        <rect x="35.5" y="107.5" width="9" height="9" fill="#fff" stroke="none" rx="1.5"/>
      </g>

      {/* ── Right hemisphere (orange) ── */}
      <path d="M68,10 C81,10 95,15 106,26 C119,39 127,57 128,76 C129,93 123,112 109,124 C96,136 79,142 68,142 L68,10Z"
            fill="#e85d1a"/>
      {/* Neural network nodes (black) */}
      <g clipPath="url(#clR)">
        {/* Central cluster */}
        <circle cx="92"  cy="74" r="5.5" fill="#111"/>
        <circle cx="80"  cy="62" r="4.5" fill="#111"/>
        <circle cx="104" cy="60" r="4.5" fill="#111"/>
        <circle cx="110" cy="80" r="4.5" fill="#111"/>
        <circle cx="100" cy="92" r="4.5" fill="#111"/>
        <circle cx="82"  cy="90" r="4.5" fill="#111"/>
        {/* Hub connections */}
        <g stroke="#111" strokeWidth="1.8">
          <line x1="92"  y1="74" x2="80"  y2="62"/>
          <line x1="92"  y1="74" x2="104" y2="60"/>
          <line x1="92"  y1="74" x2="110" y2="80"/>
          <line x1="92"  y1="74" x2="100" y2="92"/>
          <line x1="92"  y1="74" x2="82"  y2="90"/>
          <line x1="80"  y1="62" x2="104" y2="60"/>
          <line x1="104" y1="60" x2="110" y2="80"/>
          <line x1="110" y1="80" x2="100" y2="92"/>
          <line x1="100" y1="92" x2="82"  y2="90"/>
          {/* Peripheral arms */}
          <line x1="80"  y1="62" x2="74"  y2="36"/>
          <line x1="104" y1="60" x2="112" y2="34"/>
          <line x1="110" y1="80" x2="124" y2="66"/>
          <line x1="110" y1="80" x2="124" y2="94"/>
          <line x1="100" y1="92" x2="106" y2="118"/>
          <line x1="82"  y1="90" x2="76"  y2="116"/>
          <line x1="80"  y1="62" x2="72"  y2="46"/>
        </g>
        {/* Peripheral nodes */}
        <circle cx="74"  cy="36"  r="5"   fill="#111"/>
        <circle cx="112" cy="34"  r="5"   fill="#111"/>
        <circle cx="124" cy="66"  r="4.5" fill="#111"/>
        <circle cx="124" cy="94"  r="4.5" fill="#111"/>
        <circle cx="106" cy="118" r="4"   fill="#111"/>
        <circle cx="76"  cy="116" r="4"   fill="#111"/>
        <circle cx="72"  cy="46"  r="4"   fill="#111"/>
      </g>

      {/* ── Centre dividing line ── */}
      <line x1="68" y1="10" x2="68" y2="142" stroke="#111" strokeWidth="3.5"/>

      {/* ── CONNECTOME text ── */}
      <text x="148" y="84" fontFamily="'Arial Black',Arial,sans-serif"
            fontSize="50" fontWeight="900" letterSpacing="-1.5">
        <tspan fill="#1d6ec6">CONNECT</tspan><tspan fill="#e85d1a">OME</tspan>
      </text>
      {/* ── Tagline ── */}
      <text x="149" y="112" fontFamily="Arial,sans-serif" fontSize="15.5" letterSpacing="0.2">
        <tspan fill="#cccccc">Intelligent insights. </tspan>
        <tspan fill="#e85d1a" fontWeight="700">Powerful Solutions</tspan>
      </text>
    </svg>
  )
}

/* ─── Axon Full Logo SVG ──────────────────────────────────────────────────────
   Neuron cell body with glow + branching dendrites + long looping axon with
   myelin sheaths + orange terminal sparks.
   "AXON" bold text + "REQUIREMENT & TRACKING SYSTEM" subtitle.
   Background: dark navy #0d1935
────────────────────────────────────────────────────────────────────────────── */
function AxonLogoFull({ width = 480, height = 320 }) {
  return (
    <svg viewBox="0 0 480 320" width={width} height={height} xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Outer soma ambient glow */}
        <radialGradient id="axSomaGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#55aaff" stopOpacity="0.55"/>
          <stop offset="55%"  stopColor="#1155cc" stopOpacity="0.2"/>
          <stop offset="100%" stopColor="#0a2060" stopOpacity="0"/>
        </radialGradient>
        {/* Soma surface gradient */}
        <radialGradient id="axSomaFill" cx="38%" cy="32%" r="68%">
          <stop offset="0%"   stopColor="#4499ee"/>
          <stop offset="45%"  stopColor="#1a4db8"/>
          <stop offset="100%" stopColor="#0d2860"/>
        </radialGradient>
        {/* Nucleus gradient */}
        <radialGradient id="axNucleus" cx="30%" cy="28%" r="65%">
          <stop offset="0%"   stopColor="#ffffff"/>
          <stop offset="30%"  stopColor="#aaddff"/>
          <stop offset="100%" stopColor="#1a6de0"/>
        </radialGradient>
        {/* Axon gradient: blue → orange at terminal */}
        <linearGradient id="axAxonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#2288ff"/>
          <stop offset="65%"  stopColor="#3399ff"/>
          <stop offset="100%" stopColor="#ff8833"/>
        </linearGradient>
        {/* Blue glow filter */}
        <filter id="axGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        {/* Strong glow (nucleus) */}
        <filter id="axStrongGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="7" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        {/* Terminal spark glow */}
        <filter id="axOrangeGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" result="b" in="SourceGraphic"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* ── Dark navy background ── */}
      <rect width="480" height="320" rx="18" fill="#0d1935"/>

      {/* ═══ NEURON ILLUSTRATION ═══ */}

      {/* Outer ambient glow of soma */}
      <ellipse cx="170" cy="108" rx="72" ry="68" fill="url(#axSomaGlow)"/>

      {/* ── Dendrites (tree branches above soma) ── */}
      <g stroke="#2288ff" fill="none" strokeLinecap="round" filter="url(#axGlow)">
        {/* Main trunk */}
        <path d="M170,60 L170,22"  strokeWidth="2.5"/>
        {/* Left main branch */}
        <path d="M170,42 L144,14"  strokeWidth="2"/>
        <path d="M144,14 L132,4"   strokeWidth="1.5"/>
        <path d="M144,14 L136,2"   strokeWidth="1.4"/>
        {/* Left secondary */}
        <path d="M170,32 L152,10"  strokeWidth="1.6"/>
        <path d="M152,10 L145,2"   strokeWidth="1.3"/>
        {/* Right main branch */}
        <path d="M170,38 L196,10"  strokeWidth="2"/>
        <path d="M196,10 L206,2"   strokeWidth="1.5"/>
        <path d="M196,10 L200,-2"  strokeWidth="1.4"/>
        {/* Right secondary */}
        <path d="M170,48 L192,20"  strokeWidth="1.6"/>
        <path d="M192,20 L204,10"  strokeWidth="1.3"/>
        {/* Far right */}
        <path d="M170,55 L208,30"  strokeWidth="1.4"/>
      </g>
      {/* Branch tip glow dots */}
      <g fill="#66ddff" filter="url(#axGlow)">
        <circle cx="132" cy="4"   r="3"/>
        <circle cx="136" cy="2"   r="2.5"/>
        <circle cx="145" cy="2"   r="2.5"/>
        <circle cx="152" cy="10"  r="2.5"/>
        <circle cx="170" cy="22"  r="3.5"/>
        <circle cx="200" cy="-2"  r="2.5"/>
        <circle cx="206" cy="2"   r="2.5"/>
        <circle cx="204" cy="10"  r="2.5"/>
        <circle cx="208" cy="30"  r="2.5"/>
      </g>

      {/* ── Soma (cell body) ── */}
      {/* Body surface */}
      <ellipse cx="170" cy="102" rx="46" ry="52" fill="url(#axSomaFill)" filter="url(#axGlow)"/>
      {/* Secondary lobe detail */}
      <ellipse cx="174" cy="122" rx="28" ry="22" fill="#1248a8" opacity="0.55"/>
      <ellipse cx="166" cy="112" rx="22" ry="18" fill="#1a56c0" opacity="0.6"/>
      {/* Nucleus */}
      <circle cx="170" cy="92"  r="24" fill="url(#axNucleus)" filter="url(#axStrongGlow)"/>
      {/* Bright highlight on nucleus */}
      <circle cx="164" cy="86"  r="9"  fill="#c8eeff" opacity="0.85"/>
      <circle cx="162" cy="84"  r="4.5" fill="#ffffff"/>

      {/* ── Axon fibre — loops in an S-curve ── */}
      {/* Starts at bottom of soma, descends, curves right-down, loops back */}
      <path d="M 180,152
               C 195,165 228,174 255,182
               C 295,194 322,204 318,236
               C 314,265 282,278 258,272
               C 234,266 218,246 224,224"
            stroke="url(#axAxonGrad)" strokeWidth="9" fill="none"
            strokeLinecap="round" filter="url(#axGlow)"/>

      {/* ── Myelin sheaths (small ellipses perpendicular to axon) ── */}
      <g stroke="#88ccff" strokeWidth="2" fill="none" opacity="0.88">
        <ellipse cx="190" cy="158" rx="13" ry="4.5" transform="rotate(28,190,158)"/>
        <ellipse cx="206" cy="166" rx="13" ry="4.5" transform="rotate(20,206,166)"/>
        <ellipse cx="223" cy="173" rx="13" ry="4.5" transform="rotate(12,223,173)"/>
        <ellipse cx="240" cy="178" rx="13" ry="4.5" transform="rotate(4,240,178)"/>
        <ellipse cx="258" cy="183" rx="13" ry="4.5" transform="rotate(-5,258,183)"/>
        <ellipse cx="276" cy="188" rx="13" ry="4.5" transform="rotate(-14,276,188)"/>
        <ellipse cx="296" cy="196" rx="13" ry="4.5" transform="rotate(-28,296,196)"/>
        <ellipse cx="312" cy="207" rx="13" ry="4.5" transform="rotate(-52,312,207)"/>
        <ellipse cx="320" cy="222" rx="13" ry="4.5" transform="rotate(-78,320,222)"/>
        <ellipse cx="317" cy="240" rx="13" ry="4.5" transform="rotate(-105,317,240)"/>
        <ellipse cx="303" cy="258" rx="13" ry="4.5" transform="rotate(-130,303,258)"/>
        <ellipse cx="282" cy="270" rx="13" ry="4.5" transform="rotate(-150,282,270)"/>
        <ellipse cx="260" cy="273" rx="13" ry="4.5" transform="rotate(165,260,273)"/>
        <ellipse cx="240" cy="265" rx="13" ry="4.5" transform="rotate(142,240,265)"/>
        <ellipse cx="227" cy="248" rx="13" ry="4.5" transform="rotate(118,227,248)"/>
      </g>

      {/* ── Terminal (axon end) with orange glow sparks ── */}
      <circle cx="224" cy="224" r="7" fill="#ff9933" filter="url(#axOrangeGlow)"/>
      <circle cx="224" cy="224" r="3.5" fill="#ffdd88"/>
      <g stroke="#ffaa33" strokeWidth="2.2" strokeLinecap="round" filter="url(#axOrangeGlow)">
        <line x1="224" y1="213" x2="224" y2="208"/>
        <line x1="233" y1="216" x2="237" y2="213"/>
        <line x1="234" y1="230" x2="238" y2="234"/>
        <line x1="214" y1="230" x2="210" y2="234"/>
        <line x1="215" y1="216" x2="211" y2="213"/>
      </g>

      {/* ═══ AXON TEXT ═══ */}
      <text x="54" y="294"
            fontFamily="'Arial Black',Impact,Arial,sans-serif"
            fontSize="92" fontWeight="900" letterSpacing="8"
            fill="#1e6de8">AXON</text>

      {/* ── Subtitle (changed from original) ── */}
      <text x="57" y="316"
            fontFamily="Arial,sans-serif" fontSize="12.5"
            letterSpacing="3.8" fill="#4d6a9a">
        REQUIREMENT &amp; TRACKING SYSTEM
      </text>

      {/* ── Star sparkle (bottom-right, per original) ── */}
      <text x="458" y="316" fontSize="16" fill="#2a3d5e">✦</text>
    </svg>
  )
}

/* ─── Small Axon icon (mobile + form header) ──────────────────────────────── */
function AxonIcon({ size = 38 }) {
  return (
    <svg viewBox="0 0 76 76" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
      <circle cx="38" cy="38" r="36" fill="#0d1935"/>
      <circle cx="38" cy="38" r="36" fill="none" stroke="#1e6de8" strokeWidth="2.5"/>
      {/* Mini dendrites */}
      <g stroke="#2288ff" fill="none" strokeLinecap="round">
        <path d="M38,24 L38,12" strokeWidth="2"/>
        <path d="M38,16 L28,8"  strokeWidth="1.5"/>
        <path d="M38,16 L48,8"  strokeWidth="1.5"/>
        <path d="M38,20 L30,10" strokeWidth="1.2"/>
        <path d="M38,20 L46,10" strokeWidth="1.2"/>
      </g>
      {/* Soma */}
      <ellipse cx="38" cy="34" rx="11" ry="13" fill="#1a4db8"/>
      {/* Nucleus */}
      <circle cx="38" cy="30" r="6.5" fill="#66aaff"/>
      <circle cx="36" cy="28" r="3"   fill="#ffffff"/>
      {/* Axon loop */}
      <path d="M42,46 C52,50 58,58 54,66 C50,72 42,74 36,70"
            stroke="#2288ff" strokeWidth="4.5" fill="none" strokeLinecap="round"/>
      {/* 3 myelin sheaths */}
      <ellipse cx="48" cy="50" rx="6.5" ry="2.5" stroke="#88ccff" strokeWidth="1.5" fill="none" transform="rotate(20,48,50)"/>
      <ellipse cx="54" cy="57" rx="6.5" ry="2.5" stroke="#88ccff" strokeWidth="1.5" fill="none" transform="rotate(-25,54,57)"/>
      <ellipse cx="52" cy="65" rx="6.5" ry="2.5" stroke="#88ccff" strokeWidth="1.5" fill="none" transform="rotate(-65,52,65)"/>
      {/* Terminal spark */}
      <circle cx="36" cy="70" r="3.5" fill="#ff9933"/>
      <circle cx="36" cy="70" r="1.5" fill="#ffee88"/>
    </svg>
  )
}

/* ─── Role Avatar Components (unchanged) ─────────────────────────────────── */
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
  return { ring:'#1d6ec6', grad:'linear-gradient(135deg,#1d6ec6,#e85d1a)', welcome:'Welcome back', emoji:'👋' }
}

/* ─── Animated Splash Screen ─────────────────────────────────────────────── */
function SplashScreen({ userName, userRole }) {
  const [phase, setPhase] = useState(0)
  const cfg = getRoleConfig(userRole)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 100)
    const t2 = setTimeout(() => setPhase(2), 2400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
         style={{
           background:'linear-gradient(135deg,#0a1628 0%,#0d2348 50%,#0a1628 100%)',
           opacity: phase === 2 ? 0 : 1,
           transition:'opacity 0.6s ease',
           pointerEvents:'none',
         }}>
      <div style={{position:'absolute',top:'15%',left:'10%',width:320,height:320,borderRadius:'50%',
        background:`radial-gradient(circle,${cfg.ring}40,transparent)`,animation:'splashFloat 6s ease-in-out infinite'}}/>
      <div style={{position:'absolute',bottom:'10%',right:'8%',width:400,height:400,borderRadius:'50%',
        background:'radial-gradient(circle,rgba(26,77,184,0.25),transparent)',animation:'splashFloat 8s ease-in-out infinite 1s'}}/>
      <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:0.04}}>
        {Array.from({length:20},(_,i)=><line key={`h${i}`} x1="0" y1={`${i*5}%`} x2="100%" y2={`${i*5}%`} stroke="#1a4db8" strokeWidth="1"/>)}
        {Array.from({length:20},(_,i)=><line key={`v${i}`} x1={`${i*5}%`} y1="0" x2={`${i*5}%`} y2="100%" stroke="#1a4db8" strokeWidth="1"/>)}
      </svg>
      <div style={{position:'relative',width:200,height:200,marginBottom:20}}>
        <div style={{position:'absolute',inset:-20,border:`1px solid ${cfg.ring}33`,borderRadius:'50%',animation:'splashPulse 2s ease-in-out infinite'}}/>
        <svg viewBox="0 0 200 200" style={{width:200,height:200,transform:'rotate(-90deg)',position:'absolute',inset:0}}>
          <circle cx="100" cy="100" r="92" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6"/>
          <circle cx="100" cy="100" r="92" fill="none" stroke="url(#spGrad)" strokeWidth="6"
            strokeLinecap="round" strokeDasharray="578" strokeDashoffset="578"
            style={{animation:'splashProgress 2s ease-out 0.2s forwards'}}/>
          <defs>
            <linearGradient id="spGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={cfg.ring}/>
              <stop offset="100%" stopColor="#e85d1a"/>
            </linearGradient>
          </defs>
        </svg>
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',
          animation:'splashLogoPop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.3s both'}}>
          {getRoleAvatar(userRole)}
        </div>
      </div>
      {/* Axon branding in splash */}
      <div style={{animation:'splashFadeUp 0.6s ease 0.4s both',textAlign:'center',marginBottom:6}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,marginBottom:3}}>
          <AxonIcon size={28}/>
          <span style={{fontSize:26,fontWeight:900,color:'#1e6de8',letterSpacing:2}}>AXON</span>
        </div>
        <p style={{color:'#475569',fontSize:11,margin:0,letterSpacing:'0.1em',textTransform:'uppercase'}}>
          Requirement &amp; Tracking System
        </p>
        <p style={{color:'#334155',fontSize:10,margin:'2px 0 0',letterSpacing:'0.06em'}}>by Connectome</p>
      </div>
      {userName && (
        <div style={{animation:'splashFadeUp 0.6s ease 0.7s both',color:cfg.ring,fontSize:13,marginBottom:28,fontWeight:500,textAlign:'center'}}>
          {cfg.emoji} {cfg.welcome}, <strong style={{color:'#fff'}}>{userName}</strong>!
        </div>
      )}
      <div style={{display:'flex',gap:8,animation:'splashFadeUp 0.6s ease 0.9s both'}}>
        {[0,1,2,3,4].map(i=>(
          <div key={i} style={{width:6,height:6,borderRadius:'50%',background:cfg.grad,animation:`splashDot 1.2s ease-in-out ${i*0.15}s infinite`}}/>
        ))}
      </div>
      <p style={{color:'#334155',fontSize:11,marginTop:14,animation:'splashFadeUp 0.6s ease 1s both',letterSpacing:'0.08em'}}>
        LOADING YOUR WORKSPACE…
      </p>
      <style>{`
        @keyframes splashFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-20px) scale(1.04)}}
        @keyframes splashPulse{0%,100%{transform:scale(1);opacity:0.4}50%{transform:scale(1.1);opacity:0.1}}
        @keyframes splashProgress{from{stroke-dashoffset:578}to{stroke-dashoffset:0}}
        @keyframes splashLogoPop{from{transform:scale(0) rotate(-15deg);opacity:0}to{transform:scale(1) rotate(0);opacity:1}}
        @keyframes splashFadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes splashDot{0%,100%{transform:translateY(0);opacity:0.3}50%{transform:translateY(-8px);opacity:1}}
        @keyframes waveArm{0%,100%{transform:rotate(-20deg)}50%{transform:rotate(25deg)}}
        @keyframes waveArmL{0%,100%{transform:rotate(20deg)}50%{transform:rotate(-25deg)}}
        @keyframes headNod{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
        @keyframes crownSpark{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.5)}}
        @keyframes earGlow{0%,100%{fill:#0c4a6e}50%{fill:#22d3ee}}
        @keyframes thumbUp{0%,100%{transform:rotate(0)}50%{transform:rotate(-15deg)}}
        @keyframes heartFloat{0%{transform:translateY(0);opacity:0.8}100%{transform:translateY(-30px);opacity:0}}
      `}</style>
    </div>
  )
}

/* ─── Login Page ─────────────────────────────────────────────────────────── */
export default function LoginPage() {
  const navigate = useNavigate()
  const setUser = useAppStore(s => s.setUser)
  const [form, setForm] = useState({ email:'', password:'' })
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
      {splashUser !== null && <SplashScreen userName={splashUser} userRole={splashRole}/>}

      <div className="min-h-screen flex" style={{background:'#eef2f7'}}>

        {/* ════════════════ LEFT PANEL — Branding ════════════════ */}
        <div className="hidden lg:flex flex-col justify-between w-[56%] relative overflow-hidden p-10"
             style={{background:'linear-gradient(160deg,#091525 0%,#0c1e3a 45%,#0f2448 100%)'}}>

          {/* Circuit-grid background decoration */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{opacity:0.05}}>
            {[12,24,36,48,60,72,84].map((y,i)=>
              <line key={`h${i}`} x1="0" y1={`${y}%`} x2="100%" y2={`${y}%`} stroke="#1d6ec6" strokeWidth="1"/>
            )}
            {[10,22,34,46,58,70,82,94].map((x,i)=>
              <line key={`v${i}`} x1={`${x}%`} y1="0" x2={`${x}%`} y2="100%" stroke="#1d6ec6" strokeWidth="1"/>
            )}
            {[12,36,60,84].map(y=>[10,34,58,82].map(x=>
              <circle key={`n${x}${y}`} cx={`${x}%`} cy={`${y}%`} r="3" fill="#1d6ec6"/>
            ))}
          </svg>

          {/* Radial glows */}
          <div style={{position:'absolute',top:'28%',left:'35%',width:520,height:520,borderRadius:'50%',
            transform:'translate(-50%,-50%)',pointerEvents:'none',
            background:'radial-gradient(circle,rgba(29,110,198,0.22) 0%,transparent 68%)'}}/>
          <div style={{position:'absolute',bottom:'6%',right:'-4%',width:280,height:280,borderRadius:'50%',
            pointerEvents:'none',
            background:'radial-gradient(circle,rgba(232,93,26,0.12) 0%,transparent 70%)'}}/>

          {/* ── Top: Connectome company logo ── */}
          <div className="relative z-10">
            <ConnectomeLogo width={380} height={112}/>
          </div>

          {/* ── Centre: Axon product logo ── */}
          <div className="relative z-10 flex flex-col items-start">
            <AxonLogoFull width={440} height={293}/>
            <p style={{color:'#4a6080',fontSize:13,lineHeight:1.75,maxWidth:400,margin:'16px 0 0'}}>
              Manage milestones, assignments, and project timelines in one intelligent workspace — built for cross-functional teams.
            </p>
          </div>

          {/* ── Bottom: copyright ── */}
          <div className="relative z-10">
            <div style={{borderTop:'1px solid rgba(255,255,255,0.07)',paddingTop:18}}>
              <p style={{color:'#253040',fontSize:11,letterSpacing:'0.08em',textTransform:'uppercase',margin:0}}>
                Connectome &copy; {new Date().getFullYear()} &nbsp;·&nbsp; All rights reserved
              </p>
            </div>
          </div>
        </div>

        {/* ════════════════ RIGHT PANEL — Login form ════════════════ */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12">

          {/* Mobile only: Axon icon + name */}
          <div className="flex lg:hidden flex-col items-center mb-8">
            <div className="flex items-center gap-3 mb-1">
              <AxonIcon size={42}/>
              <div>
                <div style={{fontSize:26,fontWeight:900,color:'#0f172a',letterSpacing:1}}>AXON</div>
                <div style={{fontSize:10,color:'#e85d1a',fontWeight:700,letterSpacing:'0.08em'}}>by Connectome</div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-sm">
            {/* Header */}
            <div className="mb-8">
              <h2 style={{fontSize:26,fontWeight:800,color:'#0f172a',letterSpacing:'-0.02em',margin:'0 0 6px'}}>
                Welcome back
              </h2>
              <p style={{color:'#64748b',fontSize:14,margin:0}}>Sign in to your Axon workspace</p>
            </div>

            {/* Form card */}
            <div style={{background:'#fff',borderRadius:20,padding:28,
              boxShadow:'0 4px 24px rgba(0,0,0,0.08),0 1px 4px rgba(0,0,0,0.04)',
              border:'1px solid #e2e8f0'}}>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>
                    Email address
                  </label>
                  <div style={{position:'relative'}}>
                    <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#9ca3af',fontSize:14}}>✉</span>
                    <input
                      style={{width:'100%',height:44,paddingLeft:34,paddingRight:14,borderRadius:10,
                        border:'1.5px solid #e2e8f0',background:'#f8fafc',color:'#0f172a',fontSize:14,
                        outline:'none',boxSizing:'border-box',transition:'border-color 0.15s,box-shadow 0.15s'}}
                      onFocus={e=>{e.target.style.borderColor='#1d6ec6';e.target.style.boxShadow='0 0 0 3px rgba(29,110,198,0.14)'}}
                      onBlur={e=>{e.target.style.borderColor='#e2e8f0';e.target.style.boxShadow='none'}}
                      type="email" placeholder="you@company.com"
                      value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required
                    />
                  </div>
                </div>
                {/* Password */}
                <div>
                  <label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>
                    Password
                  </label>
                  <div style={{position:'relative'}}>
                    <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#9ca3af',fontSize:14}}>🔐</span>
                    <input
                      style={{width:'100%',height:44,paddingLeft:34,paddingRight:44,borderRadius:10,
                        border:'1.5px solid #e2e8f0',background:'#f8fafc',color:'#0f172a',fontSize:14,
                        outline:'none',boxSizing:'border-box',transition:'border-color 0.15s,box-shadow 0.15s'}}
                      onFocus={e=>{e.target.style.borderColor='#1d6ec6';e.target.style.boxShadow='0 0 0 3px rgba(29,110,198,0.14)'}}
                      onBlur={e=>{e.target.style.borderColor='#e2e8f0';e.target.style.boxShadow='none'}}
                      type={showPass?'text':'password'} placeholder="••••••••"
                      value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required
                    />
                    <button type="button" onClick={()=>setShowPass(s=>!s)}
                      style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',
                        background:'none',border:'none',cursor:'pointer',color:'#9ca3af',fontSize:13,padding:0}}>
                      {showPass?'🙈':'👁️'}
                    </button>
                  </div>
                </div>

                {error && (
                  <div style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'#dc2626',
                    background:'#fef2f2',border:'1px solid #fecaca',padding:'10px 12px',borderRadius:10}}>
                    <span>⚠️</span> {error}
                  </div>
                )}

                <button type="submit" disabled={loading||splashUser!==null}
                  style={{width:'100%',height:46,borderRadius:10,border:'none',cursor:'pointer',
                    background:'linear-gradient(135deg,#1d6ec6,#0d3e7a)',color:'#fff',
                    fontSize:15,fontWeight:700,letterSpacing:'0.01em',
                    boxShadow:'0 4px 16px rgba(29,110,198,0.38)',
                    display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginTop:8,
                    opacity:(loading||splashUser!==null)?0.6:1,transition:'opacity 0.15s'}}>
                  {loading
                    ? <><span style={{display:'inline-block',animation:'spin 0.8s linear infinite'}}>⟳</span> Signing in…</>
                    : 'Sign in to Axon'}
                </button>
              </form>
            </div>

            <p style={{textAlign:'center',fontSize:11,color:'#cbd5e1',marginTop:20,letterSpacing:'0.04em'}}>
              🔒 Secure login &nbsp;·&nbsp; Protected by Connectome
            </p>
          </div>
        </div>

      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  )
}
