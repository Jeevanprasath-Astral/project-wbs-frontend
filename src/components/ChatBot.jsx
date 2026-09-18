/**
 * AXON Assistant — floating chatbot panel
 *
 * Features:
 *  - Floating 🤖 button (bottom-right) toggles a sliding panel
 *  - Smart auto-scroll: only snaps to bottom when already near bottom
 *  - Copy button on every AI reply
 *  - Download full chat as .txt file
 *  - Sends messages to POST /api/chat with full conversation history
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import api from '../utils/api'

// ── Markdown-lite renderer ────────────────────────────────────────────────────
function RenderMarkdown({ text }) {
  if (!text) return null

  const lines = text.split('\n')
  const elements = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '') { i++; continue }

    if (/^[\s]*[-*•]\s/.test(line)) {
      const items = []
      while (i < lines.length && /^[\s]*[-*•]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[\s]*[-*•]\s/, '').trim())
        i++
      }
      elements.push(
        <ul key={i} className="list-disc pl-4 my-1 space-y-0.5">
          {items.map((item, idx) => (
            <li key={idx} className="text-sm" dangerouslySetInnerHTML={{ __html: boldify(item) }} />
          ))}
        </ul>
      )
      continue
    }

    if (/^\d+\.\s/.test(line)) {
      const items = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, '').trim())
        i++
      }
      elements.push(
        <ol key={i} className="list-decimal pl-4 my-1 space-y-0.5">
          {items.map((item, idx) => (
            <li key={idx} className="text-sm" dangerouslySetInnerHTML={{ __html: boldify(item) }} />
          ))}
        </ol>
      )
      continue
    }

    elements.push(
      <p key={i} className="text-sm my-0.5 leading-relaxed"
         dangerouslySetInnerHTML={{ __html: boldify(line) }} />
    )
    i++
  }

  return <div>{elements}</div>
}

function boldify(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1 rounded text-xs font-mono">$1</code>')
}


// ── Copy button ───────────────────────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handleCopy}
      title="Copy reply"
      className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-400 hover:text-violet-600 px-1.5 py-0.5 rounded-lg hover:bg-violet-50 flex-shrink-0 mt-1"
    >
      {copied ? '✓ Copied' : '⎘ Copy'}
    </button>
  )
}


// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-tr-sm text-sm text-white"
             style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
          {msg.text}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start mb-3 gap-2 group">
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-sm"
           style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
        🤖
      </div>
      <div className="flex flex-col max-w-[85%]">
        <div className="bg-gray-50 border border-gray-100 px-3 py-2 rounded-2xl rounded-tl-sm text-gray-800">
          {msg.loading ? (
            <div className="flex gap-1 items-center py-1">
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          ) : (
            <RenderMarkdown text={msg.text} />
          )}
        </div>
        {!msg.loading && msg.text && <CopyButton text={msg.text} />}
      </div>
    </div>
  )
}


// ── Suggestions ───────────────────────────────────────────────────────────────
const SUGGESTIONS = [
  { label: '📁 My projects',        prompt: 'Show me all my projects' },
  { label: '⏱️ My hours this week', prompt: 'How many hours have I logged this week?' },
  { label: '📋 My open tasks',      prompt: 'What tasks are currently assigned to me?' },
  { label: '👥 Team workload',      prompt: 'Show me the team workload for this week' },
  { label: '📊 Project summary',    prompt: 'Give me a dashboard summary of my active projects' },
  { label: '⚠️ Overdue items',      prompt: 'Are there any overdue milestones in my projects?' },
]


// ── Download chat as .txt ─────────────────────────────────────────────────────
function downloadChat(messages) {
  const lines = messages
    .filter(m => !m.loading)
    .map(m => {
      const who = m.role === 'user' ? 'You' : 'AXON Assistant'
      return `[${who}]\n${m.text}\n`
    })
    .join('\n---\n\n')

  const blob = new Blob(
    [`AXON Assistant — Chat Export\n${new Date().toLocaleString()}\n\n${'='.repeat(40)}\n\n${lines}`],
    { type: 'text/plain' }
  )
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `axon-chat-${new Date().toISOString().slice(0, 10)}.txt`
  a.click()
  URL.revokeObjectURL(url)
}


// ── Main ChatBot component ────────────────────────────────────────────────────
export default function ChatBot() {
  const [open, setOpen]       = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'model',
      text: "Hi! I'm your AXON Assistant 👋\n\nI can help you with project progress, team workload, timesheet summaries, assignments, and more.\n\nWhat would you like to know?",
    }
  ])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)

  const scrollRef    = useRef(null)   // the messages container div
  const messagesEndRef = useRef(null)
  const inputRef     = useRef(null)
  const atBottomRef  = useRef(true)   // track if user is near bottom

  // Track whether the user is near the bottom of the scroll area
  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    atBottomRef.current = distFromBottom < 80
  }

  // Smart auto-scroll — only snap to bottom if already near bottom
  useEffect(() => {
    if (!open) return
    if (atBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, open])

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      atBottomRef.current = true   // reset on open
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'instant' })
        inputRef.current?.focus()
      }, 150)
    }
  }, [open])

  const sendMessage = useCallback(async (text) => {
    const userText = (text || input).trim()
    if (!userText || loading) return

    setInput('')
    atBottomRef.current = true   // snap to bottom on new send

    const userMsg   = { role: 'user',  text: userText }
    const loadingMsg = { role: 'model', text: '', loading: true }
    setMessages(prev => [...prev, userMsg, loadingMsg])
    setLoading(true)

    const history = messages
      .filter(m => !m.loading)
      .slice(1)
      .map(m => ({ role: m.role, text: m.text }))

    try {
      const res = await api.post('/chat', {
        message: userText,
        conversation_history: history,
      })

      const replyText = res.data?.reply || 'Sorry, I got an empty response. Please try again.'
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'model', text: replyText }
        return updated
      })
    } catch (err) {
      const errMsg = err.response?.data?.detail
        || 'Sorry, I encountered an error. Please try again in a moment.'
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'model', text: `❌ ${errMsg}` }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([{
      role: 'model',
      text: "Chat cleared! How can I help you?",
    }])
  }

  const hasOnlyWelcome = messages.length === 1

  return (
    <>
      {/* ── Floating toggle button ──────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        title="AXON Assistant"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white text-2xl transition-all duration-300 hover:scale-105 active:scale-95"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
      >
        {open ? '✕' : '🤖'}
      </button>

      {/* ── Chat panel ─────────────────────────────────────────────────────── */}
      <div
        className={`fixed bottom-24 right-6 z-50 w-96 flex flex-col rounded-2xl shadow-2xl bg-white border border-gray-100 transition-all duration-300 ${
          open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        style={{ height: '560px' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 rounded-t-2xl flex-shrink-0"
             style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-lg">🤖</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white">AXON Assistant</div>
            <div className="text-xs text-violet-200">Powered by Groq AI</div>
          </div>

          {/* Download button — only shown when there are messages */}
          {messages.length > 1 && (
            <button
              onClick={() => downloadChat(messages)}
              title="Download chat as .txt"
              className="text-violet-200 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              ⬇ Save
            </button>
          )}

          <button onClick={clearChat} title="Clear chat"
                  className="text-violet-200 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-white/10 transition-colors">
            🗑 Clear
          </button>
          <button onClick={() => setOpen(false)} title="Close"
                  className="text-violet-200 hover:text-white text-lg leading-none hover:bg-white/10 w-7 h-7 flex items-center justify-center rounded-lg transition-colors">
            ✕
          </button>
        </div>

        {/* Messages — scrollable, tracks position */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-3 py-3 space-y-1"
        >
          {messages.map((msg, idx) => (
            <MessageBubble key={idx} msg={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions — shown only on welcome screen */}
        {hasOnlyWelcome && (
          <div className="px-3 pb-2 flex-shrink-0">
            <div className="text-xs text-gray-400 mb-1.5">Try asking:</div>
            <div className="grid grid-cols-2 gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.prompt}
                  onClick={() => sendMessage(s.prompt)}
                  disabled={loading}
                  className="text-xs text-left px-2.5 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50 transition-all disabled:opacity-40"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="flex items-end gap-2 px-3 py-3 border-t border-gray-100 flex-shrink-0">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about projects, hours, tasks..."
            disabled={loading}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 transition-all disabled:opacity-50"
            style={{ minHeight: '36px', maxHeight: '100px' }}
            onInput={e => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
            title="Send (Enter)"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span className="text-base">➤</span>
            )}
          </button>
        </div>
      </div>
    </>
  )
}
