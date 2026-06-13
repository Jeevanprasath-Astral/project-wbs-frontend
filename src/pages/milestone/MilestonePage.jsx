import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { fmtDate } from '../../utils/helpers'
import api from '../../utils/api'
import clsx from 'clsx'
import { cache } from '../../utils/cache'
import { MilestoneSkeleton } from '../../components/common/SkeletonLoader'

const BADGE = { 'Completed':'badge-done','In Progress':'badge-prog','Overdue':'badge-over','Not Started':'badge-todo','On Hold':'badge-hold' }

function ResponseInput({ q, value, onChange }) {
  const base = 'text-xs text-violet-800 bg-violet-50 border-violet-200'
  if (q.input_type === 'yesno') return (
    <select className={clsx('select text-xs h-8 w-36', base)} value={value||''} onChange={e=>onChange(e.target.value)}>
      <option value="">Select</option>
      {['Yes','No','Pending'].map(o=><option key={o}>{o}</option>)}
    </select>
  )
  if (q.input_type === 'date') return <input type="date" className={clsx('input text-xs h-8 w-40', base)} value={value||''} onChange={e=>onChange(e.target.value)} />
  if (q.input_type === 'number') return <input type="number" className={clsx('input text-xs h-8 w-28 text-right', base)} value={value||''} onChange={e=>onChange(e.target.value)} placeholder="0" />
  if (q.input_type === 'long') return <textarea className={clsx('textarea text-xs w-full mt-1', base)} rows={2} value={value||''} onChange={e=>onChange(e.target.value)} placeholder="Enter details…" />
  if (q.input_type?.startsWith('dropdown_')) {
    const opts = {
      dropdown_hml: ['High','Medium','Low'],
      dropdown_freq: ['Daily','Weekly','Monthly','Quarterly','Ad-hoc'],
      dropdown_pf: ['Pass','Fail','Partial','N/A'],
      dropdown_mode: ['Online','Onsite','Hybrid'],
      dropdown_fmt: ['Excel','PDF','Dashboard','CSV'],
      dropdown_rev: ['Draft','Under Review','Approved','Rejected'],
      dropdown_sev: ['Critical','High','Medium','Low'],
      dropdown_test: ['Pass','Fail','Blocked','Not Tested'],
      dropdown_closure: ['Open','Closed','Deferred'],
      dropdown_auto: ['Batch','Real-time','Trigger-based','Scheduled'],
      dropdown_deploy: ['On-Premise','Cloud','Hybrid'],
      dropdown_int: ['REST API','SOAP API','Flat File','Database Link','Webhook'],
      dropdown_export: ['API','Flat File','Database Query','Manual Export'],
      dropdown_gen: ['System','Manual','Semi-automated'],
      dropdown_action: ['Replace','Enhance','Retire','Keep As-Is'],
      dropdown_yn_p: ['Yes','No','Partial'],
      dropdown_dash: ['Operational','Strategic','Tactical','Executive'],
      dropdown_support: ['Bug Fix','Enhancement','Query','Performance','Configuration'],
      dropdown_priority: ['P1-Critical','P2-High','P3-Medium','P4-Low'],
      dropdown_alert:    ['Email','SMS','In-App','WhatsApp'],
      dropdown_mode:     ['Online','Onsite','Hybrid'],
      dropdown_freq:     ['Daily','Weekly','Monthly','Quarterly','Ad-hoc'],
      dropdown_fmt:      ['Excel','PDF','Dashboard','Email Report','CSV'],
      dropdown_rev:      ['Draft','Under Review','Approved','Rejected'],
      dropdown_pf:       ['Pass','Fail','Partial','N/A'],
    }[q.input_type] || []
    return (
      <select className={clsx('select text-xs h-8 w-40', base)} value={value||''} onChange={e=>onChange(e.target.value)}>
        <option value="">Select</option>
        {opts.map(o=><option key={o}>{o}</option>)}
      </select>
    )
  }
  return <input type="text" className={clsx('input text-xs h-8 flex-1', base)} value={value||''} onChange={e=>onChange(e.target.value)} placeholder="Enter response…" />
}

function QuestionRow({ q, idx, response, onSave }) {
  const [val, setVal] = useState(response?.value || '')
  const [saved, setSaved] = useState(false)

  const save = useCallback(async (v) => {
    try {
      await onSave(q.id, v)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch {}
  }, [q.id, onSave])

  useEffect(() => {
    const t = setTimeout(() => { if (val !== (response?.value||'')) save(val) }, 800)
    return () => clearTimeout(t)
  }, [val])

  return (
    <div className={clsx('flex items-start gap-3 py-2 px-3 rounded-lg', idx%2===0 ? 'bg-gray-50' : 'bg-white')}>
      <span className="text-xs text-gray-400 font-medium w-5 pt-1.5 flex-shrink-0">{idx}</span>
      <div className="flex-1">
        <div className="text-xs font-medium text-gray-700 mb-1">{q.question_text}</div>
        <div className="flex items-start gap-2 flex-wrap">
          <ResponseInput q={q} value={val} onChange={setVal} />
          {saved && <span className="text-xs text-success-600 pt-1.5 flex-shrink-0">✓ Saved</span>}
        </div>
      </div>
    </div>
  )
}

function SubtaskBlock({ subtask, projectId, onSignOff }) {
  const [open, setOpen] = useState(false)
  const [responses, setResponses] = useState(subtask.responses || {})

  const saveResponse = async (questionId, value) => {
    await api.post(`/projects/${projectId}/responses`, { question_id: questionId, value })
    setResponses(r => ({ ...r, [questionId]: { value } }))
  }

  const saveDirectResponse = async (value) => {
    await api.post(`/projects/${projectId}/responses`, { subtask_id: subtask.id, value })
  }

  const answeredCount = subtask.questions?.length
    ? subtask.questions.filter(q => responses[q.id]?.value).length
    : (subtask.response ? 1 : 0)
  const totalCount = subtask.questions?.length || 1
  const completion = Math.round((answeredCount / totalCount) * 100)

  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden mb-2 hover:border-violet-100 transition-colors">
      <button
        onClick={() => setOpen(o=>!o)}
        className="w-full flex items-center gap-3 px-4 py-2.5 bg-white hover:bg-violet-50/20 transition-colors text-left"
      >
        <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', {
          'bg-success-400': subtask.status==='Completed',
          'bg-warning-400': subtask.status==='In Progress',
          'bg-danger-400':  subtask.status==='Overdue',
          'bg-gray-300':    !subtask.status || subtask.status==='Not Started',
        })} />
        <span className="text-xs font-medium text-gray-800 flex-1 text-left">{subtask.name}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-1.5 bg-primary-400 rounded-full" style={{ width: `${completion}%` }} />
          </div>
          <span className="text-xs text-gray-400 w-8 text-right">{completion}%</span>
          <span className={BADGE[subtask.status] || 'badge-todo'}>{subtask.status || 'Not Started'}</span>
          <i className={clsx('ti text-gray-300 text-base', open ? 'ti-chevron-up' : 'ti-chevron-down')} aria-hidden="true" />
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100">
          {subtask.is_format && subtask.questions?.length > 0 ? (
            <>
              <div className="bg-gradient-to-r from-violet-50 to-indigo-50 px-4 py-2 grid grid-cols-2 border-b border-violet-100">
                <span className="text-xs text-gray-500 font-medium">Field / Question</span>
                <span className="text-xs text-gray-500">Response / Input</span>
              </div>
              <div className="bg-white">
                {subtask.questions.map((q, i) => (
                  <QuestionRow
                    key={q.id}
                    q={q}
                    idx={i+1}
                    response={responses[q.id]}
                    onSave={saveResponse}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3 bg-white">
              <span className="text-xs font-medium text-gray-700 flex-1">{subtask.name}</span>
              <ResponseInput
                q={{ input_type: subtask.input_type || 'text' }}
                value={subtask.response || ''}
                onChange={saveDirectResponse}
              />
            </div>
          )}

          <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 border-t border-emerald-100">
            <i className="ti ti-writing text-success-600 text-sm" aria-hidden="true" />
            <span className="text-xs font-medium text-success-600 flex-1">Section sign-off</span>
            <span className="text-xs text-gray-400">Reviewed by: <span className="text-gray-600">{subtask.reviewer || '—'}</span></span>
            <span className="text-xs text-gray-400 ml-2">Date: <span className="text-gray-600">{fmtDate(subtask.signed_off_at) || '—'}</span></span>
            {subtask.status !== 'Completed' && (
              <button
                onClick={() => onSignOff(subtask.id)}
                className="btn btn-success text-xs py-1 px-2.5 shadow-sm"
              >
                Mark reviewed
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function TaskAccordion({ task, projectId, onSignOff }) {
  const [open, setOpen] = useState(true)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md mb-3 overflow-hidden transition-all duration-200">
      <button
        onClick={() => setOpen(o=>!o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 bg-white hover:bg-violet-50/30 transition-colors text-left"
      >
        <div className={clsx('w-2.5 h-2.5 rounded-full flex-shrink-0', {
          'bg-success-400': task.status==='Completed',
          'bg-warning-400': task.status==='In Progress',
          'bg-danger-400':  task.status==='Overdue',
          'bg-gray-200':    !task.status || task.status==='Not Started',
        })} />
        <span className="text-sm font-medium text-gray-800 flex-1">
          Task {String(task.num).padStart(2,'0')} — {task.name}
        </span>
        <div className="flex items-center gap-3 flex-shrink-0 text-xs text-gray-400">
          <span>{task.subtasks?.length || 0} subtasks</span>
          <span className={BADGE[task.status] || 'badge-todo'}>{task.status || 'Not Started'}</span>
          <span className="text-xs text-gray-300 hidden md:block">{task.responsibility}</span>
          <i className={clsx('ti text-gray-300 text-base', open ? 'ti-chevron-up' : 'ti-chevron-down')} aria-hidden="true" />
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 p-3">
          {task.subtasks && task.subtasks.length > 0 ? (
            task.subtasks.map((sub) => (
              <SubtaskBlock key={sub.id} subtask={sub} projectId={projectId} onSignOff={onSignOff} />
            ))
          ) : (
            <div className="text-xs text-gray-400 py-4 text-center">No subtasks found</div>
          )}
        </div>
      )}
    </div>
  )
}

export default function MilestonePage() {
  const { id, num } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async (force = false) => {
    const cacheKey = `milestone-${id}-${num}`
    // Show cached data instantly if available
    if (!force) {
      const cached = cache.get(cacheKey)
      if (cached) {
        setData(cached)
        setLoading(false)
        return
      }
    }
    try {
      setLoading(true)
      setError(null)
      const res = await api.get(`/projects/${id}/milestones/${num}`)
      setData(res.data)
      cache.set(cacheKey, res.data, 60) // cache for 60 seconds
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load milestone')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id, num])

  const handleSignOff = async (subtaskId) => {
    await api.post(`/projects/${id}/signoffs`, { subtask_id: subtaskId })
    load()
  }

  if (loading) return <MilestoneSkeleton />

  if (error) return (
    <div className="flex items-center justify-center h-64 animate-fade-up">
      <div className="text-center">
        <div className="text-5xl mb-3">⚠️</div>
        <p className="mt-2 text-sm text-danger-600">{error}</p>
        <button onClick={load} className="btn mt-3 text-xs">Try again</button>
      </div>
    </div>
  )

  if (!data) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <div className="text-center">
        <div className="text-5xl mb-3">📂</div>
        <p className="mt-2 text-sm">No milestone data found</p>
      </div>
    </div>
  )

  const allSubtasks = data.tasks?.flatMap(t => t.subtasks || []) || []
  const done = allSubtasks.filter(s => s.status === 'Completed').length
  const total = allSubtasks.length
  const pct = total ? Math.round((done / total) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-sm" style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)'}}>
            {String(num).padStart(2,'0')}
          </div>
          <div>
            <h1 className="text-base font-medium text-gray-900">
              Milestone {num} — {data.name}
            </h1>
            <div className="text-xs text-gray-400 mt-0.5">
              {data.tasks?.length || 0} tasks · {total} subtasks · {data.responsibility || 'Team'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">{pct}% complete</div>
            <div className="text-xs text-gray-400">{done}/{total} subtasks done</div>
          </div>
          <div className="w-28 h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-2.5 rounded-full transition-all" style={{background:'linear-gradient(90deg,#7c3aed,#4f46e5)'}} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {data.tasks?.map((t) => (
          <span key={t.id} className={clsx('text-xs px-2.5 py-1 rounded-full border', {
            'bg-success-50 text-success-600 border-green-200':   t.status==='Completed',
            'bg-warning-50 text-warning-600 border-yellow-200':  t.status==='In Progress',
            'bg-gray-50 text-gray-400 border-gray-200':          !t.status || t.status==='Not Started',
            'bg-danger-50 text-danger-600 border-red-200':       t.status==='Overdue',
          })}>
            {t.name}
          </span>
        ))}
      </div>

      {data.tasks && data.tasks.length > 0 ? (
        data.tasks.map((task) => (
          <TaskAccordion key={task.id} task={task} projectId={id} onSignOff={handleSignOff} />
        ))
      ) : (
        <div className="card text-center py-16 text-gray-400">
          <i className="ti ti-list-check text-4xl" aria-hidden="true" />
          <p className="mt-3 text-sm">No tasks found for this milestone</p>
        </div>
      )}

      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs font-medium text-success-600">Milestone sign-off</div>
            <div className="text-xs text-gray-500 mt-0.5">Complete all tasks before milestone sign-off</div>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
            <span>Reviewed by: <span className="text-gray-700">{data.reviewer || '—'}</span></span>
            <span>Approved by: <span className="text-gray-700">{data.approver || '—'}</span></span>
            <span>Date: <span className="text-gray-700">{fmtDate(data.signed_off_at) || '—'}</span></span>
            {pct === 100 && !data.signed_off_at && (
              <button
                onClick={() => api.post(`/projects/${id}/milestones/${num}/signoff`).then(load)}
                className="btn btn-success text-xs"
              >
                <i className="ti ti-check text-sm" aria-hidden="true" /> Sign off milestone
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
