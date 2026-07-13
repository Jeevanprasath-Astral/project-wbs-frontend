import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../../utils/api'
import AttachmentPanel from '../../components/AttachmentPanel'
import { useAppStore } from '../../store'
import { fmtHours } from '../../utils/helpers'
import clsx from 'clsx'

const MS_ICONS = ['🚀','🤝','🔍','📝','⚙️','🧪','📦','✅','🌟','🛡️','🎯','📊','🔧','💡','🏆']
const INPUT_TYPES = ['text','long','yesno','date','number','dropdown_hml','dropdown_freq','dropdown_pf']
const STATUSES = ['Not Started','In Progress','Completed','On Hold']
const REVISION_REASONS = ['New Requirements','Major Changes','Bug Fixes','Enhancements','Other']
const DROPDOWN_OPTS = {
  dropdown_hml:  ['High','Medium','Low'],
  dropdown_freq: ['Daily','Weekly','Monthly','Quarterly','Ad-hoc'],
  dropdown_pf:   ['Pass','Fail','Partial','N/A'],
}

// ── Answer input for a subtask's own question, rendered to match its
//    `input_type` — same idea as MilestonePage's ResponseInput, scoped to
//    the smaller set of types Custom Subtasks use. Bound to `draft.response`
//    (already a plain column on the subtask, already PATCHed by the
//    existing Save button — no extra wiring needed). ─────────────────────────
function ResponseField({ inputType, value, onChange }) {
  const base = 'input text-xs h-8 w-full bg-white'
  if (inputType === 'yesno') return (
    <select className="select text-xs h-8 w-full bg-white" value={value||''} onChange={e=>onChange(e.target.value)}>
      <option value="">Select…</option>
      {['Yes','No','Pending'].map(o=><option key={o}>{o}</option>)}
    </select>
  )
  if (inputType === 'date') return <input type="date" className={base} value={value||''} onChange={e=>onChange(e.target.value)} />
  if (inputType === 'number') return <input type="number" className={base} value={value||''} onChange={e=>onChange(e.target.value)} placeholder="0" />
  if (inputType === 'long') return <textarea className="textarea text-xs w-full bg-white" rows={2} value={value||''} onChange={e=>onChange(e.target.value)} placeholder="Enter details…" />
  if (inputType?.startsWith('dropdown_')) {
    const opts = DROPDOWN_OPTS[inputType] || []
    return (
      <select className="select text-xs h-8 w-full bg-white" value={value||''} onChange={e=>onChange(e.target.value)}>
        <option value="">Select…</option>
        {opts.map(o=><option key={o}>{o}</option>)}
      </select>
    )
  }
  return <input type="text" className={base} value={value||''} onChange={e=>onChange(e.target.value)} placeholder="Enter answer…" />
}

const dfmt = (v) => v ? String(v).slice(0,10) : ''

// Subtask/Activity API objects carry two different "estimated_hours"-shaped
// values: `estimated_hours` (the rollup total — own + all child Activities,
// used for read-only display at parent levels) and `own_estimated_hours`
// (the raw value actually stored on this row). Edit forms must always seed
// from the raw value — seeding from the rollup was the bug that made Total
// Estimated Hours balloon on every save (the rollup got written back as the
// raw column, then re-added to the children's hours next time around).
const seedHoursDraft = (obj) => ({ ...obj, estimated_hours: obj.own_estimated_hours ?? obj.estimated_hours })

// ── Tiny inline timeline/status editor used by Milestone + Task + Subtask +
//    Activity. `team` (project-scoped members) drives the Assignee dropdown
//    (req 1f — only members assigned to this project, never the full user
//    list). `showHours` exposes editable Estimated Hours (req 1d — hours are
//    entered at Subtask/Activity level only); higher levels still show the
//    computed Estimated/Actual rollup totals read-only. ──────────────────────
function TimelineFields({ value, onChange, team, showHours, showVarianceReason }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
      <div>
        <label className="block text-xs text-gray-400 mb-0.5">Status</label>
        <select className="select text-xs h-7 w-full" value={value.status||'Not Started'}
          onChange={e=>onChange({...value,status:e.target.value})}>
          {STATUSES.map(s=><option key={s}>{s}</option>)}
          {value.status==='Overdue' && <option>Overdue</option>}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-0.5">Assignee</label>
        {team && team.length > 0 ? (
          <select className="select text-xs h-7 w-full" value={value.assignee||''}
            onChange={e=>onChange({...value,assignee:e.target.value})}>
            <option value="">— Unassigned —</option>
            {team.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
          </select>
        ) : (
          <input className="input text-xs h-7 w-full" value={value.assignee||''} placeholder="Name"
            onChange={e=>onChange({...value,assignee:e.target.value})} />
        )}
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-0.5">Planned start</label>
        <input type="date" className="input text-xs h-7 w-full" value={dfmt(value.planned_start)}
          onChange={e=>{
            const v=e.target.value
            const shouldClear=v&&value.planned_end&&v>value.planned_end
            onChange({...value,planned_start:v,...(shouldClear?{planned_end:''}:{})})
          }} />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-0.5">Planned end</label>
        <input type="date" className="input text-xs h-7 w-full" value={dfmt(value.planned_end)}
          min={value.planned_start||undefined}
          onChange={e=>{
            const v=e.target.value
            if(value.planned_start&&v&&v<value.planned_start)return
            onChange({...value,planned_end:v})
          }} />
      </div>
      {value.total_days != null && (
        <div>
          <label className="block text-xs text-gray-400 mb-0.5">Total days</label>
          <div className="text-xs h-7 flex items-center px-2 bg-gray-50 rounded-lg border border-gray-100 text-gray-600">{value.total_days}</div>
        </div>
      )}
      {showHours ? (
        <>
          <div>
            <label className="block text-xs text-gray-400 mb-0.5">Estimated hours</label>
            <input type="number" min="0" step="0.5" className="input text-xs h-7 w-full"
              value={value.estimated_hours ?? ''}
              onChange={e=>onChange({...value,estimated_hours:parseFloat(e.target.value)||0})} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-0.5">Actual consumed hrs</label>
            <div className="text-xs h-7 flex items-center px-2 bg-gray-50 rounded-lg border border-gray-100 text-gray-600">{fmtHours(value.actual_hours ?? 0)}</div>
          </div>
        </>
      ) : value.estimated_hours != null && (
        <>
          <div>
            <label className="block text-xs text-gray-400 mb-0.5">Total estimated hrs</label>
            <div className="text-xs h-7 flex items-center px-2 bg-gray-50 rounded-lg border border-gray-100 text-gray-600">{fmtHours(value.estimated_hours)}</div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-0.5">Total actual hrs</label>
            <div className="text-xs h-7 flex items-center px-2 bg-gray-50 rounded-lg border border-gray-100 text-gray-600">{fmtHours(value.actual_hours ?? 0)}</div>
          </div>
        </>
      )}
      {showVarianceReason && (
        <div className="col-span-2 sm:col-span-4 mt-1">
          <label className="block text-xs text-gray-400 mb-0.5">📝 Schedule Variance Reason</label>
          <textarea rows={2} className="input text-xs w-full resize-none py-1" placeholder="Optional — describe any variance between planned and actual end date..."
            value={value.schedule_variance_reason || ''}
            onChange={e => onChange({...value, schedule_variance_reason: e.target.value})} />
        </div>
      )}
    </div>
  )
}

// ── Activity row (optional, nested under a subtask) ──────────────────────────
function ActivityRow({ a, projectId, msId, taskId, subId, onUpdate, team }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(() => seedHoursDraft(a))

  const save = async () => {
    await api.patch(`/projects/${projectId}/custom-milestones/${msId}/tasks/${taskId}/subtasks/${subId}/activities/${a.id}`, draft)
    setEditing(false)  // optimistic — no full reload needed
  }
  const del = async () => {
    if (!window.confirm('Delete this activity?')) return
    await api.delete(`/projects/${projectId}/custom-milestones/${msId}/tasks/${taskId}/subtasks/${subId}/activities/${a.id}`)
    onUpdate()
  }
  return (
    <div className="p-2 bg-white rounded-lg border border-gray-100 mb-1.5">
      <div className="flex items-center gap-2">
        <span className="text-xs">🔹</span>
        {editing ? (
          <input className="input text-xs h-6 flex-1" value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} autoFocus />
        ) : (
          <span className="text-xs text-gray-700 flex-1">{a.name}</span>
        )}
        <span className={clsx('text-xs px-1.5 py-0.5 rounded-md',
          a.status==='Completed' ? 'bg-emerald-50 text-emerald-600' : a.status==='In Progress' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500')}>
          {a.status}
        </span>
        {editing ? (
          <>
            <button onClick={save} className="btn btn-primary text-xs py-0.5 px-1.5">✓</button>
            <button onClick={()=>{setEditing(false);setDraft(seedHoursDraft(a))}} className="btn text-xs py-0.5 px-1.5">✕</button>
          </>
        ) : (
          <>
            <button onClick={()=>setEditing(true)} className="btn text-xs py-0.5 px-1.5 hover:text-violet-600">✏️</button>
            <button onClick={del} className="btn text-xs py-0.5 px-1.5 hover:text-rose-600">🗑️</button>
          </>
        )}
      </div>
      {editing && <TimelineFields value={draft} onChange={setDraft} team={team} showHours />}
      <AttachmentPanel entityType="activity" entityId={a.id} />
    </div>
  )
}

// ── Subtask row ────────────────────────────────────────────────────────────────
// ── One question + answer row, nested inside an expanded Subtask. Mirrors the
// standard Milestone system's per-question buffered-answer + explicit Save
// pattern (QuestionRow in MilestonePage.jsx), so a Subtask that has grown
// multiple questions behaves the same way that system always has. ───────────
function SubtaskQuestionRow({ q, projectId, msId, taskId, subId, onUpdate }) {
  const [editingText, setEditingText] = useState(false)
  const [textDraft, setTextDraft] = useState({ question_text: q.question_text, input_type: q.input_type })
  const [answer, setAnswer] = useState(q.response || '')
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)

  const saveAnswer = async () => {
    await api.patch(`/projects/${projectId}/custom-milestones/${msId}/tasks/${taskId}/subtasks/${subId}/questions/${q.id}`, { response: answer })
    setDirty(false); setSaved(true); setTimeout(() => setSaved(false), 1500)
  }
  const saveText = async () => {
    await api.patch(`/projects/${projectId}/custom-milestones/${msId}/tasks/${taskId}/subtasks/${subId}/questions/${q.id}`, textDraft)
    setEditingText(false)
  }
  const del = async () => {
    if (!window.confirm('Delete this question?')) return
    await api.delete(`/projects/${projectId}/custom-milestones/${msId}/tasks/${taskId}/subtasks/${subId}/questions/${q.id}`)
    onUpdate()
  }

  return (
    <div className="mb-2 p-2.5 bg-white rounded-xl border border-violet-100">
      <div className="flex items-center gap-2 mb-1.5">
        {editingText ? (
          <div className="flex items-center gap-2 flex-1">
            <input className="input text-xs h-7 flex-1" value={textDraft.question_text}
              onChange={e => setTextDraft({...textDraft, question_text: e.target.value})} autoFocus />
            <select className="select text-xs h-7 w-24" value={textDraft.input_type}
              onChange={e => setTextDraft({...textDraft, input_type: e.target.value})}>
              {INPUT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <button onClick={saveText} className="btn btn-primary text-xs py-0.5 px-1.5">✓</button>
            <button onClick={() => {setEditingText(false); setTextDraft({question_text:q.question_text, input_type:q.input_type})}} className="btn text-xs py-0.5 px-1.5">✕</button>
          </div>
        ) : (
          <>
            <label className="text-xs font-medium text-violet-700 flex-1">{q.question_text}</label>
            <button onClick={() => setEditingText(true)} className="btn text-xs py-0.5 px-1.5 hover:text-violet-600">✏️</button>
            <button onClick={del} className="btn text-xs py-0.5 px-1.5 hover:text-rose-600">🗑️</button>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <ResponseField inputType={q.input_type} value={answer} onChange={v => {setAnswer(v); setDirty(true)}} />
        </div>
        <button onClick={saveAnswer} disabled={!dirty} className={clsx('btn text-xs py-1 px-2 flex-shrink-0', dirty && 'btn-primary')}>
          {saved ? '✅' : '💾 Save'}
        </button>
      </div>
    </div>
  )
}

// ── Report row (optional, multiple per Milestone) ─────────────────────────────
// Reports are associated at the Milestone level — identified by Report Number /
// Report Name / Department, plus Status / Assigned To / Due Date — letting
// several reports point at the same Milestone without needing separate
// task/subtask structure per report.
function ReportRow({ r, projectId, msId, onUpdate, team }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(r)
  const [error, setError] = useState('')

  const save = async () => {
    setError('')
    try {
      await api.patch(`/projects/${projectId}/custom-milestones/${msId}/reports/${r.id}`, draft)
      setEditing(false)  // optimistic — no full reload needed
    } catch (e) { setError(e.response?.data?.detail || 'Failed to save report') }
  }
  const del = async () => {
    if (!window.confirm('Delete this report?')) return
    await api.delete(`/projects/${projectId}/custom-milestones/${msId}/reports/${r.id}`)
    onUpdate()
  }

  if (editing) {
    return (
      <div className="p-2 bg-white rounded-lg border border-gray-100 mb-1.5">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div>
            <label className="block text-xs text-gray-400 mb-0.5">Report Number</label>
            <input className="input text-xs h-7 w-full" value={draft.report_number||''} onChange={e=>setDraft({...draft,report_number:e.target.value})} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-400 mb-0.5">Report Name</label>
            <input className="input text-xs h-7 w-full" value={draft.report_name||''} onChange={e=>setDraft({...draft,report_name:e.target.value})} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-0.5">Department</label>
            <input className="input text-xs h-7 w-full" value={draft.department||''} onChange={e=>setDraft({...draft,department:e.target.value})} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-0.5">Status</label>
            <select className="select text-xs h-7 w-full" value={draft.status||'Not Started'} onChange={e=>setDraft({...draft,status:e.target.value})}>
              {STATUSES.map(st=><option key={st}>{st}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-0.5">Assigned To</label>
            {team?.length > 0 ? (
              <select className="select text-xs h-7 w-full" value={draft.assigned_to||''} onChange={e=>setDraft({...draft,assigned_to:e.target.value})}>
                <option value="">— Unassigned —</option>
                {team.map(m=><option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            ) : (
              <input className="input text-xs h-7 w-full" value={draft.assigned_to||''} onChange={e=>setDraft({...draft,assigned_to:e.target.value})} />
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-0.5">Due Date</label>
            <input type="date" className="input text-xs h-7 w-full" value={dfmt(draft.due_date)} onChange={e=>setDraft({...draft,due_date:e.target.value})} />
          </div>
        </div>
        {error && <div className="text-xs text-rose-600 mt-1.5">{error}</div>}
        <div className="flex items-center gap-2 mt-2">
          <button onClick={save} className="btn btn-primary text-xs py-0.5 px-1.5">✓ Save</button>
          <button onClick={()=>{setEditing(false);setDraft(r);setError('')}} className="btn text-xs py-0.5 px-1.5">✕</button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-2 bg-white rounded-lg border border-gray-100 mb-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs">📄</span>
        <span className="text-xs font-medium text-gray-700">{r.report_number}</span>
        <span className="text-xs text-gray-600 flex-1 truncate min-w-[6rem]">{r.report_name}</span>
        {r.department && <span className="text-xs text-gray-400 flex-shrink-0">{r.department}</span>}
        {r.assigned_to && <span className="text-xs text-violet-500 flex-shrink-0">👤 {r.assigned_to}</span>}
        {r.due_date && <span className="text-xs text-gray-400 flex-shrink-0">📆 {dfmt(r.due_date)}</span>}
        <span className={clsx('text-xs px-1.5 py-0.5 rounded-md flex-shrink-0',
          r.status==='Completed' ? 'bg-emerald-50 text-emerald-600' : r.status==='In Progress' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500')}>
          {r.status}
        </span>
        <button onClick={()=>setEditing(true)} className="btn text-xs py-0.5 px-1.5 hover:text-violet-600">✏️</button>
        <button onClick={del} className="btn text-xs py-0.5 px-1.5 hover:text-rose-600">🗑️</button>
      </div>
      <AttachmentPanel entityType="report" entityId={r.id} />
    </div>
  )
}

function SubtaskRow({ s, msId, taskId, projectId, onUpdate, team }) {
  const [editing, setEditing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft] = useState(() => seedHoursDraft(s))
  const [addingActivity, setAddingActivity] = useState(false)
  const [newActivity, setNewActivity] = useState('')
  const [addingQuestion, setAddingQuestion] = useState(false)
  const [newQuestion, setNewQuestion] = useState({ question_text: '', input_type: 'text' })

  const save = async () => {
    await api.patch(`/projects/${projectId}/custom-milestones/${msId}/tasks/${taskId}/subtasks/${s.id}`, draft)
    setEditing(false)  // optimistic — no full reload
  }
  const del = async () => {
    if (!window.confirm('Delete this subtask?')) return
    await api.delete(`/projects/${projectId}/custom-milestones/${msId}/tasks/${taskId}/subtasks/${s.id}`)
    onUpdate()
  }
  const saveActivity = async () => {
    if (!newActivity.trim()) return
    await api.post(`/projects/${projectId}/custom-milestones/${msId}/tasks/${taskId}/subtasks/${s.id}/activities`, { name: newActivity })
    setNewActivity(''); setAddingActivity(false); onUpdate()
  }
  const saveQuestion = async () => {
    if (!newQuestion.question_text.trim()) return
    await api.post(`/projects/${projectId}/custom-milestones/${msId}/tasks/${taskId}/subtasks/${s.id}/questions`, newQuestion)
    setNewQuestion({ question_text: '', input_type: 'text' }); setAddingQuestion(false); onUpdate()
  }
  // Time Management (and the answer area below it) only opens via the small
  // 📅 icon — not by clicking anywhere on the row — matching how the old
  // Milestone system behaved.
  const toggleExpanded = () => setExpanded(e => !e)

  return (
    <div className="py-2 px-3 bg-gray-50 rounded-xl mb-1.5 group">
      <div className="flex items-center gap-2">
        <span className="text-gray-400 text-xs w-5 flex-shrink-0">{s.num}</span>
        {editing ? (
          <div className="flex items-center gap-2 flex-1">
            <input className="input text-xs h-7 flex-1" value={draft.name} onChange={e => setDraft({...draft,name:e.target.value})} autoFocus />
            <select className="select text-xs h-7 w-28" value={draft.input_type} onChange={e => setDraft({...draft,input_type:e.target.value})}>
              {INPUT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <button onClick={save} className="btn btn-primary text-xs py-1 px-2">✓</button>
            <button onClick={() => {setEditing(false);setDraft(seedHoursDraft(s))}} className="btn text-xs py-1 px-2">✕</button>
          </div>
        ) : (
          <>
            <span className="text-xs text-gray-700 flex-1">{s.name}</span>
            <span className="text-xs bg-violet-50 text-violet-600 px-2 py-0.5 rounded-lg border border-violet-100 flex-shrink-0">{s.input_type}</span>
            <span className={clsx('text-xs px-1.5 py-0.5 rounded-md flex-shrink-0',
              s.status==='Completed' ? 'bg-emerald-50 text-emerald-600' : s.status==='In Progress' ? 'bg-amber-50 text-amber-600' : 'bg-gray-200 text-gray-500')}>
              {s.status}
            </span>
            {s.questions?.length > 0 && (
              <span className="text-xs text-gray-400 flex-shrink-0">❓{s.questions.length}</span>
            )}
            {s.activities?.length > 0 && (
              <span className="text-xs text-gray-400 flex-shrink-0">🔹{s.activities.length}</span>
            )}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 flex-shrink-0">
              <button onClick={toggleExpanded} className="btn text-xs py-0.5 px-1.5 hover:text-violet-600">{expanded?'▲':'📅'}</button>
              <button onClick={() => setEditing(true)} className="btn text-xs py-0.5 px-1.5 hover:text-violet-600">✏️</button>
              <button onClick={del} className="btn text-xs py-0.5 px-1.5 hover:text-rose-600">🗑️</button>
            </div>
          </>
        )}
      </div>

      {expanded && (
        <div className="mt-2 pl-7">
          {/* Question(s) & answer(s) — a Subtask starts with one implicit
              question (its own input_type/response) and can grow more, same
              as a Subtask in the old Milestone system could carry several
              Questions. */}
          {s.questions?.length > 0 ? (
            <div className="mb-3">
              {s.questions.map(q => (
                <SubtaskQuestionRow key={q.id} q={q} projectId={projectId} msId={msId} taskId={taskId} subId={s.id} onUpdate={onUpdate} />
              ))}
            </div>
          ) : (
            <div className="mb-3 p-2.5 bg-white rounded-xl border border-violet-100">
              <label className="block text-xs font-medium text-violet-700 mb-1.5">{s.name} — your answer</label>
              <ResponseField inputType={s.input_type} value={draft.response} onChange={v => setDraft({...draft, response: v})} />
            </div>
          )}
          {addingQuestion ? (
            <div className="flex items-center gap-2 mb-3">
              <input className="input text-xs h-7 flex-1" placeholder="Question text..." value={newQuestion.question_text}
                onChange={e=>setNewQuestion({...newQuestion, question_text: e.target.value})} onKeyDown={e=>e.key==='Enter'&&saveQuestion()} autoFocus />
              <select className="select text-xs h-7 w-24" value={newQuestion.input_type} onChange={e=>setNewQuestion({...newQuestion, input_type: e.target.value})}>
                {INPUT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <button onClick={saveQuestion} className="btn btn-primary text-xs py-1 px-2">✓ Add</button>
              <button onClick={()=>setAddingQuestion(false)} className="btn text-xs py-1 px-2">✕</button>
            </div>
          ) : (
            <button onClick={()=>setAddingQuestion(true)} className="text-xs text-violet-600 hover:text-violet-800 font-medium mb-3 block">➕ Add question</button>
          )}

          <div className="text-xs text-gray-500 font-medium mb-1">Time Management</div>
          <TimelineFields value={draft} team={team} showHours onChange={setDraft} />
          <div className="flex items-center gap-2 mt-2">
            <button onClick={save} className="btn btn-primary text-xs py-1 px-2">💾 Save</button>
            <button onClick={()=>setDraft(seedHoursDraft(s))} className="btn text-xs py-1 px-2">Cancel</button>
          </div>

          {/* Activities (optional) */}
          <div className="mt-3">
            <div className="text-xs text-gray-500 font-medium mb-1">Activities (optional)</div>
            {s.activities?.map(a => (
              <ActivityRow key={a.id} a={a} projectId={projectId} msId={msId} taskId={taskId} subId={s.id} onUpdate={onUpdate} team={team} />
            ))}
            {addingActivity ? (
              <div className="flex items-center gap-2">
                <input className="input text-xs h-7 flex-1" placeholder="Activity name..." value={newActivity}
                  onChange={e=>setNewActivity(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveActivity()} autoFocus />
                <button onClick={saveActivity} className="btn btn-primary text-xs py-1 px-2">✓ Add</button>
                <button onClick={()=>setAddingActivity(false)} className="btn text-xs py-1 px-2">✕</button>
              </div>
            ) : (
              <button onClick={()=>setAddingActivity(true)} className="text-xs text-violet-600 hover:text-violet-800 font-medium">➕ Add activity</button>
            )}
          </div>

          <AttachmentPanel entityType="subtask" entityId={s.id} />
        </div>
      )}
    </div>
  )
}

// ── Add-from-template inline picker (used for both Task and Subtask levels) ─
function FromTemplatePicker({ items, labelKey, onPick, onClose, title }) {
  return (
    <div className="p-2 bg-violet-50 rounded-xl border border-violet-100 mb-2">
      <div className="text-xs font-medium text-violet-700 mb-1.5">{title}</div>
      {items.length === 0 ? (
        <div className="text-xs text-gray-400">Nothing left to add from the standard template.</div>
      ) : (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {items.map(it => (
            <button key={it.num} onClick={()=>onPick(it)}
              className="w-full text-left text-xs px-2 py-1.5 rounded-lg bg-white border border-gray-100 hover:border-violet-300 hover:bg-violet-50 flex items-center justify-between">
              <span>{it[labelKey]}</span>
              <span className="text-violet-500">➕</span>
            </button>
          ))}
        </div>
      )}
      <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 mt-1.5">Close</button>
    </div>
  )
}

// ── Task block ─────────────────────────────────────────────────────────────────
// Layout (updated per testing feedback): clicking a Task selects it (accordion
// — one Task open per Milestone at a time, driven by `isOpen`/`onSelect` from
// the parent MilestoneCard). When open, the body shows: 1) the Date & Time
// Management section right next to the Task's own text/status fields — same
// placement pattern as the Milestone level (toggle in the header, content
// directly below) and the Subtask level (calendar icon in the row, content
// directly below that row) — then 2) the Subtask forms underneath. This
// replaces the earlier layout where Time Management sat below the Subtasks,
// which testers found confusing.
function TaskBlock({ t, ms, projectId, onUpdate, team, isOpen, onSelect }) {
  const [addSub, setAddSub] = useState(false)
  const [newSub, setNewSub] = useState({ name:'', input_type:'text' })
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState(t)
  const [showTplSubs, setShowTplSubs] = useState(false)
  const [tplSubs, setTplSubs] = useState(null)
  // Time Management is collapsed behind an icon on the Task row itself —
  // same pattern as the 📅 toggle on Subtask rows — instead of always
  // rendering inline, which took up space whenever a Task was opened.
  const [showTimeline, setShowTimeline] = useState(false)

  const saveSubtask = async () => {
    if (!newSub.name) return
    setSaving(true)
    await api.post(`/projects/${projectId}/custom-milestones/${ms.id}/tasks/${t.id}/subtasks`, newSub)
    setNewSub({ name:'', input_type:'text' }); setAddSub(false); setSaving(false); onUpdate()
  }
  const delTask = async () => {
    if (!window.confirm('Delete this task and all its subtasks?')) return
    await api.delete(`/projects/${projectId}/custom-milestones/${ms.id}/tasks/${t.id}`)
    onUpdate()
  }
  const saveTimeline = async () => {
    await api.patch(`/projects/${projectId}/custom-milestones/${ms.id}/tasks/${t.id}`, draft)
    setShowTimeline(false)  // optimistic — no full reload
  }
  const openTplSubs = async () => {
    setShowTplSubs(true)
    try {
      const res = await api.get(`/projects/${projectId}/custom-milestones/templates/${ms.num}/detail`)
      const stdTask = res.data.tasks.find(x => x.num === t.num)
      setTplSubs((stdTask?.subtasks || []).filter(s => !t.subtasks?.some(es => es.num === s.num)))
    } catch { setTplSubs([]) }
  }
  const pickTplSub = async (sub) => {
    try {
      await api.post(`/projects/${projectId}/custom-milestones/${ms.id}/tasks/${t.id}/subtasks/from-template`, null, { params: { subtask_num: sub.num } })
      setShowTplSubs(false); onUpdate()
    } catch (e) { /* ignore dup */ }
  }

  return (
    <div className={clsx('border rounded-2xl overflow-hidden mb-3 transition-colors',
      isOpen ? 'border-violet-200' : 'border-gray-100')}>
      <div className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-violet-50/20 cursor-pointer" onClick={onSelect}>
        <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', isOpen ? 'bg-violet-600' : 'bg-violet-400')} />
        <span className="text-sm font-semibold text-gray-800 flex-1">Task {String(t.num).padStart(2,'0')} — {t.name}</span>
        <span className="text-xs text-gray-400">{t.subtasks?.length||0} subtasks</span>
        <span className={clsx('text-xs px-1.5 py-0.5 rounded-md',
          t.status==='Completed' ? 'bg-emerald-50 text-emerald-600' : t.status==='In Progress' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500')}>
          {t.status||'Not Started'}
        </span>
        {t.responsibility && <span className="text-xs text-gray-400">{t.responsibility}</span>}
        <div className="flex gap-1 flex-shrink-0" onClick={e=>e.stopPropagation()}>
          <button onClick={()=>setShowTimeline(v=>!v)}
            className={clsx('btn text-xs py-0.5 px-1.5 hover:text-violet-600 hover:border-violet-200', showTimeline && 'text-violet-600 border-violet-200 bg-violet-50')}
            title="Time Management">📅</button>
          <button onClick={delTask} className="btn text-xs py-0.5 px-1.5 hover:text-rose-600">🗑️</button>
        </div>
        <span className="text-gray-300 text-xs">{isOpen?'▲':'▼'}</span>
      </div>

      {isOpen && (
        <div className="border-t border-gray-50 p-3" onClick={e=>e.stopPropagation()}>
          {/* Step 1: Date & Time Management — toggled via the 📅 icon on the
              Task row above (same pattern as Milestone + Subtask level)
              instead of always rendering inline. */}
          {showTimeline && (
            <div className="mb-2">
              <div className="text-xs font-semibold text-violet-700 mb-2 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-violet-600 text-white flex items-center justify-center text-[10px]">1</span>
                Date &amp; Time Management
              </div>
              <TimelineFields value={draft} onChange={setDraft} team={team} />
              <div className="flex items-center gap-2 mt-2">
                <button onClick={saveTimeline} className="btn btn-primary text-xs py-1 px-2">💾 Save</button>
                <button onClick={()=>setDraft(t)} className="btn text-xs py-1 px-2">Cancel</button>
              </div>
            </div>
          )}

          {/* Step 2: all Subtask forms for the selected Task */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="text-xs font-semibold text-violet-700 mb-2 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-violet-600 text-white flex items-center justify-center text-[10px]">2</span>
              Subtasks
            </div>
            {t.subtasks?.map(s => <SubtaskRow key={s.id} s={s} msId={ms.id} taskId={t.id} projectId={projectId} onUpdate={onUpdate} team={team} />)}
            {addSub ? (
              <div className="flex items-center gap-2 mt-2 p-2 bg-violet-50 rounded-xl border border-violet-100">
                <input className="input text-xs h-7 flex-1" placeholder="Subtask name..." value={newSub.name}
                  onChange={e=>setNewSub({...newSub,name:e.target.value})} onKeyDown={e=>e.key==='Enter'&&saveSubtask()} autoFocus />
                <select className="select text-xs h-7 w-28" value={newSub.input_type} onChange={e=>setNewSub({...newSub,input_type:e.target.value})}>
                  {INPUT_TYPES.map(tp=><option key={tp}>{tp}</option>)}
                </select>
                <button onClick={saveSubtask} disabled={saving} className="btn btn-primary text-xs py-1 px-2">{saving?'⟳':'✓ Add'}</button>
                <button onClick={()=>setAddSub(false)} className="btn text-xs py-1 px-2">✕</button>
              </div>
            ) : (
              <div className="flex items-center gap-3 mt-2">
                <button onClick={()=>setAddSub(true)} className="text-xs text-violet-600 hover:text-violet-800 flex items-center gap-1 font-medium">➕ Add subtask</button>
                <button onClick={openTplSubs} className="text-xs text-gray-400 hover:text-violet-600 flex items-center gap-1 font-medium">📋 From template</button>
              </div>
            )}
            {showTplSubs && (
              <div className="mt-2">
                <FromTemplatePicker items={tplSubs||[]} labelKey="name" title="Add subtask from standard template"
                  onPick={pickTplSub} onClose={()=>setShowTplSubs(false)} />
              </div>
            )}
          </div>

          <AttachmentPanel entityType="task" entityId={t.id} />
        </div>
      )}
    </div>
  )
}

// ── Revisit Modal ──────────────────────────────────────────────────────────────
// Opens when the user clicks "🔁 Revisit" on a milestone. Captures the reason
// + optional description, then POSTs to the revisit endpoint which clones the
// task/subtask structure into a new iteration row while preserving history.
function RevisitModal({ ms, projectId, onClose, onDone }) {
  const [reason, setReason] = useState(REVISION_REASONS[0])
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setSaving(true); setError('')
    try {
      await api.post(`/projects/${projectId}/custom-milestones/${ms.id}/revisit`, { reason, description: description || null })
      onDone()
      onClose()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to create revision')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-fade-up max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔁</span>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Revisit Milestone</h2>
              <p className="text-xs text-gray-400">M{String(ms.num).padStart(2,'0')} — {ms.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-xl">✕</button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3.5 py-2.5 text-xs text-indigo-800">
            This will create a new iteration of this milestone (Revision {(ms.iteration||1)+1}) with
            a fresh copy of its task structure — existing history is preserved unchanged.
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reason for revisit <span className="text-rose-500">*</span></label>
            <select className="select text-sm w-full" value={reason} onChange={e=>setReason(e.target.value)}>
              {REVISION_REASONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description (optional)</label>
            <textarea className="textarea text-sm w-full" rows={3}
              placeholder="Describe the changes or scope of this revision..."
              value={description} onChange={e=>setDescription(e.target.value)} />
          </div>

          {error && <div className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{error}</div>}
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
          <button className="btn text-xs" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary text-xs" disabled={saving} onClick={submit}>
            {saving ? <><span className="animate-spin">⟳</span> Creating revision…</> : <>🔁 Create Revision</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Milestone card ─────────────────────────────────────────────────────────────
// `forceOpen` (set when this card is shown via its own dedicated tab in the
// Milestone Configuration tab strip, instead of the "All milestones" list
// view) skips the extra click needed to expand it, since in tab view this is
// the only milestone on screen anyway.
function MilestoneCard({ ms, projectId, onUpdate, onDelete, team, forceOpen }) {
  const [open, setOpen] = useState(!!forceOpen)
  const [addTask, setAddTask] = useState(false)
  const [newTask, setNewTask] = useState({ name:'', responsibility:'' })
  const [editName, setEditName] = useState(false)
  const [msName, setMsName] = useState(ms.name)
  const [saving, setSaving] = useState(false)
  const [showTplTasks, setShowTplTasks] = useState(false)
  const [tplTasks, setTplTasks] = useState(null)
  const [showTimeline, setShowTimeline] = useState(false)
  const [showRevisit, setShowRevisit] = useState(false)
  const [draft, setDraft] = useState(ms)
  // Step-driven flow (req 2): Select Milestone (this card) → click a Task to
  // select it → its Subtasks + Time Management appear below. Only one Task
  // is open per Milestone at a time, like an accordion.
  const [activeTaskId, setActiveTaskId] = useState(null)
  // Milestone-level Reports state
  const [addingReport, setAddingReport] = useState(false)
  const [newReport, setNewReport] = useState({ report_number: '', report_name: '', department: '', status: 'Not Started', assigned_to: '', due_date: '' })
  const [reportError, setReportError] = useState('')
  // Report Templates state
  const [templates, setTemplates] = useState([])
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')

  const saveTask = async () => {
    if (!newTask.name) return
    setSaving(true)
    await api.post(`/projects/${projectId}/custom-milestones/${ms.id}/tasks`, newTask)
    setNewTask({name:'',responsibility:''}); setAddTask(false); setSaving(false); onUpdate()
  }
  const saveName = async () => {
    await api.patch(`/projects/${projectId}/custom-milestones/${ms.id}`, { name: msName })
    setEditName(false)
  }
  // Requirement 1(c): Milestone-level Time Management — Status, Assignee,
  // Planned Start/End, Actual Start/End (+ time-of-day, total days, rollup hrs).
  const saveMsTimeline = async () => {
    await api.patch(`/projects/${projectId}/custom-milestones/${ms.id}`, draft)
    setShowTimeline(false)
  }
  const openTplTasks = async () => {
    setShowTplTasks(true)
    try {
      const res = await api.get(`/projects/${projectId}/custom-milestones/templates/${ms.num}/detail`)
      setTplTasks(res.data.tasks.filter(t => !t.already_added))
    } catch { setTplTasks([]) }
  }
  const pickTplTask = async (task) => {
    try {
      await api.post(`/projects/${projectId}/custom-milestones/${ms.id}/tasks/from-template`, null,
        { params: { task_num: task.num } })
      setShowTplTasks(false); onUpdate()
    } catch (e) { /* ignore dup */ }
  }
  const saveMsReport = async () => {
    if (!newReport.report_number.trim() || !newReport.report_name.trim()) return
    setReportError('')
    try {
      await api.post(`/projects/${projectId}/custom-milestones/${ms.id}/reports`, newReport)
      setNewReport({ report_number: '', report_name: '', department: '', status: 'Not Started', assigned_to: '', due_date: '' })
      setAddingReport(false); onUpdate()
    } catch (e) { setReportError(e.response?.data?.detail || 'Failed to add report') }
  }
  const loadTemplates = async () => {
    try { const r = await api.get('/report-templates'); setTemplates(r.data) } catch { setTemplates([]) }
  }
  const saveAsTemplate = async () => {
    if (!templateName.trim() || !ms.reports?.length) return
    setSavingTemplate(true)
    try {
      await api.post('/report-templates', {
        name: templateName.trim(),
        description: `Created from Milestone M${String(ms.num).padStart(2,'0')} — ${ms.name}`,
        items: ms.reports.map(r => ({ report_number: r.report_number, report_name: r.report_name, department: r.department || '' })),
      })
      setShowSaveTemplate(false); setTemplateName('')
    } catch (e) { alert(e.response?.data?.detail || 'Failed to save template') }
    finally { setSavingTemplate(false) }
  }
  const applyTemplate = async (t) => {
    try {
      const res = await api.post(`/report-templates/${t.id}/apply/${ms.id}`, null, { params: { project_id: projectId } })
      setShowTemplatePicker(false)
      onUpdate()
      if (res.data.created === 0) alert('All reports from this template already exist on this milestone.')
    } catch (e) { alert(e.response?.data?.detail || 'Failed to apply template') }
  }

  const taskCount = ms.tasks?.length||0
  const subCount = ms.tasks?.reduce((a,t)=>a+(t.subtasks?.length||0),0)||0

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-up">
      <div className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-violet-50/20 transition-colors" onClick={()=>setOpen(o=>!o)}>
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl flex-shrink-0" style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)'}}>
          {MS_ICONS[(ms.num-1)%MS_ICONS.length]}
        </div>
        <div className="flex-1 min-w-0">
          {editName ? (
            <div className="flex items-center gap-2" onClick={e=>e.stopPropagation()}>
              <input className="input text-sm h-7 flex-1" value={msName} onChange={e=>setMsName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveName()} autoFocus />
              <button onClick={saveName} className="btn btn-primary text-xs py-1 px-2">✓ Save</button>
              <button onClick={()=>setEditName(false)} className="btn text-xs py-1 px-2">✕</button>
            </div>
          ) : (
            <div className="font-semibold text-gray-900 text-sm flex items-center gap-2 flex-wrap">
              M{String(ms.num).padStart(2,'0')} — {ms.name}
              {(ms.iteration||1) > 1 && (
                <span className="inline-flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-lg font-medium">
                  🔁 Rev. {ms.iteration}
                </span>
              )}
            </div>
          )}
          <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
            <span>{taskCount} tasks · {subCount} subtasks{ms.reports?.length > 0 ? ` · 📄 ${ms.reports.length} report${ms.reports.length !== 1 ? 's' : ''}` : ''}{ms.responsible&&` · ${ms.responsible}`}</span>
            {ms.assignee && <span className="text-violet-500">👤 {ms.assignee}</span>}
            {ms.status && (
              <span className={clsx('px-1.5 py-0.5 rounded-md',
                ms.status==='Completed' ? 'bg-emerald-50 text-emerald-600'
                  : ms.status==='Overdue' ? 'bg-rose-50 text-rose-600'
                  : ms.status==='In Progress' ? 'bg-amber-50 text-amber-600'
                  : 'bg-gray-100 text-gray-500')}>
                {ms.status}
              </span>
            )}
            {(ms.iteration||1) > 1 && ms.revision_reason && (
              <span className="text-indigo-400 italic">{ms.revision_reason}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0" onClick={e=>e.stopPropagation()}>
          <button onClick={()=>setShowTimeline(v=>!v)} className="btn text-xs py-1 px-2 hover:text-violet-600 hover:border-violet-200">📅 Time Management</button>
          <button onClick={()=>setEditName(true)} className="btn text-xs py-1 px-2 hover:text-violet-600 hover:border-violet-200">✏️ Rename</button>
          <button onClick={()=>setShowRevisit(true)} className="btn text-xs py-1 px-2 hover:text-indigo-600 hover:border-indigo-200" title="Create a new revision of this milestone">🔁 Revisit</button>
          <button onClick={()=>onDelete(ms.id)} className="btn text-xs py-1 px-2 hover:text-rose-600 hover:border-rose-200">🗑️ Remove</button>
          <span className="text-gray-300 text-xs">{open?'▲':'▼'}</span>
        </div>
      </div>

      {showTimeline && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3" onClick={e=>e.stopPropagation()}>
          <div className="text-xs font-semibold text-gray-600 mb-1">Time Management</div>
          <TimelineFields value={draft} onChange={setDraft} team={team} showVarianceReason />
          <div className="flex items-center gap-2 mt-2">
            <button onClick={saveMsTimeline} className="btn btn-primary text-xs py-1 px-2">💾 Save</button>
            <button onClick={()=>setDraft(ms)} className="btn text-xs py-1 px-2">Cancel</button>
          </div>
        </div>
      )}

      {open && (
        <div className="border-t border-gray-100 p-4">

          {/* ── Reports (optional, multiple per Milestone) ─────────────────
              Displayed directly below the Milestone header so reports can be
              associated with the whole Milestone rather than a specific
              subtask. Tasks and Subtasks follow below. */}
          <div className="mb-4 pb-4 border-b border-gray-100">
            <div className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5 flex-wrap">
              <span>📄</span> Reports <span className="text-gray-400 font-normal">(optional)</span>
              {ms.reports?.length > 0 && (
                <span className="ml-1 bg-violet-50 text-violet-600 text-[10px] px-1.5 py-0.5 rounded-md font-medium">{ms.reports.length}</span>
              )}
              <div className="ml-auto flex items-center gap-1.5">
                {ms.reports?.length > 0 && (
                  <button
                    onClick={()=>{ setShowSaveTemplate(s=>!s); setShowTemplatePicker(false) }}
                    className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-0.5 hover:bg-emerald-100 font-medium"
                  >💾 Save as Template</button>
                )}
                <button
                  onClick={()=>{ setShowTemplatePicker(s=>!s); setShowSaveTemplate(false); if(!showTemplatePicker) loadTemplates() }}
                  className="text-[10px] text-violet-700 bg-violet-50 border border-violet-200 rounded-lg px-2 py-0.5 hover:bg-violet-100 font-medium"
                >📋 Apply Template</button>
              </div>
            </div>

            {/* Save as Template form */}
            {showSaveTemplate && (
              <div className="mb-2 p-2 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2">
                <input
                  className="input text-xs h-7 flex-1"
                  placeholder="Template name…"
                  value={templateName}
                  onChange={e=>setTemplateName(e.target.value)}
                  autoFocus
                />
                <button
                  onClick={saveAsTemplate}
                  disabled={savingTemplate || !templateName.trim()}
                  className="btn btn-primary text-xs py-1 px-2 disabled:opacity-50"
                >{savingTemplate ? '…' : '✓ Save'}</button>
                <button onClick={()=>{ setShowSaveTemplate(false); setTemplateName('') }} className="btn text-xs py-1 px-2">✕</button>
              </div>
            )}

            {/* Apply Template picker */}
            {showTemplatePicker && (
              <div className="mb-2 p-2 bg-violet-50 rounded-xl border border-violet-200">
                {templates.length === 0
                  ? <p className="text-xs text-gray-400">No templates saved yet. Save one from a milestone that already has reports.</p>
                  : templates.map(t => (
                    <div key={t.id} className="flex items-center justify-between py-1 border-b border-violet-100 last:border-0">
                      <div>
                        <span className="text-xs font-medium text-violet-800">{t.name}</span>
                        {t.description && <span className="text-[10px] text-gray-400 ml-1.5">{t.description}</span>}
                        <span className="text-[10px] text-gray-400 ml-1.5">({t.items?.length ?? 0} reports)</span>
                      </div>
                      <button
                        onClick={()=>applyTemplate(t)}
                        className="text-[10px] text-violet-700 bg-violet-100 border border-violet-200 rounded-lg px-2 py-0.5 hover:bg-violet-200 font-medium ml-2"
                      >Apply</button>
                    </div>
                  ))
                }
                <button onClick={()=>setShowTemplatePicker(false)} className="text-[10px] text-gray-400 mt-1.5 hover:text-gray-600">✕ Close</button>
              </div>
            )}

            {ms.reports?.map(r => (
              <ReportRow key={r.id} r={r} projectId={projectId} msId={ms.id} onUpdate={onUpdate} team={team} />
            ))}
            {addingReport ? (
              <div className="p-2 bg-violet-50 rounded-xl border border-violet-100">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-0.5">Report Number</label>
                    <input className="input text-xs h-7 w-full" placeholder="e.g. RPT-01" value={newReport.report_number}
                      onChange={e=>setNewReport({...newReport,report_number:e.target.value})} autoFocus />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-400 mb-0.5">Report Name</label>
                    <input className="input text-xs h-7 w-full" placeholder="Report name" value={newReport.report_name}
                      onChange={e=>setNewReport({...newReport,report_name:e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-0.5">Department</label>
                    <input className="input text-xs h-7 w-full" placeholder="Department" value={newReport.department}
                      onChange={e=>setNewReport({...newReport,department:e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-0.5">Status</label>
                    <select className="select text-xs h-7 w-full" value={newReport.status}
                      onChange={e=>setNewReport({...newReport,status:e.target.value})}>
                      {STATUSES.map(st=><option key={st}>{st}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-0.5">Assigned To</label>
                    {team?.length > 0 ? (
                      <select className="select text-xs h-7 w-full" value={newReport.assigned_to}
                        onChange={e=>setNewReport({...newReport,assigned_to:e.target.value})}>
                        <option value="">— Unassigned —</option>
                        {team.map(m=><option key={m.id} value={m.name}>{m.name}</option>)}
                      </select>
                    ) : (
                      <input className="input text-xs h-7 w-full" placeholder="Name" value={newReport.assigned_to}
                        onChange={e=>setNewReport({...newReport,assigned_to:e.target.value})} />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-0.5">Due Date</label>
                    <input type="date" className="input text-xs h-7 w-full" value={newReport.due_date}
                      onChange={e=>setNewReport({...newReport,due_date:e.target.value})} />
                  </div>
                </div>
                {reportError && <div className="text-xs text-rose-600 mt-1.5">{reportError}</div>}
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={saveMsReport} className="btn btn-primary text-xs py-1 px-2">✓ Add</button>
                  <button onClick={()=>{setAddingReport(false);setReportError('')}} className="btn text-xs py-1 px-2">✕</button>
                </div>
              </div>
            ) : (
              <button onClick={()=>setAddingReport(true)} className="text-xs text-violet-600 hover:text-violet-800 font-medium">➕ Add report</button>
            )}
          </div>

          {/* ── Tasks ──────────────────────────────────────────────────────── */}
          {taskCount > 0 && (
            <div className="text-xs text-gray-400 mb-2">👉 Click a task below to fill in its subtasks and time management.</div>
          )}
          {ms.tasks?.map(t => (
            <TaskBlock key={t.id} t={t} ms={ms} projectId={projectId} onUpdate={onUpdate} team={team}
              isOpen={activeTaskId === t.id}
              onSelect={() => setActiveTaskId(id => id === t.id ? null : t.id)} />
          ))}
          {addTask ? (
            <div className="flex items-center gap-2 p-3 bg-violet-50 rounded-xl border border-violet-100">
              <input className="input text-xs h-7 flex-1" placeholder="Task name..." value={newTask.name}
                onChange={e=>setNewTask({...newTask,name:e.target.value})} onKeyDown={e=>e.key==='Enter'&&saveTask()} autoFocus />
              <select className="select text-xs h-7 w-36" value={newTask.responsibility}
                onChange={e=>setNewTask({...newTask,responsibility:e.target.value})}>
                <option value="">Responsible (optional)</option>
                {(team||[]).map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
              <button onClick={saveTask} disabled={saving} className="btn btn-primary text-xs py-1 px-2">{saving?'⟳':'✓ Add'}</button>
              <button onClick={()=>setAddTask(false)} className="btn text-xs py-1 px-2">✕</button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button onClick={()=>setAddTask(true)} className="text-xs text-violet-600 hover:text-violet-800 flex items-center gap-1 font-medium">➕ Add task</button>
              <button onClick={openTplTasks} className="text-xs text-gray-400 hover:text-violet-600 flex items-center gap-1 font-medium">📋 From template</button>
            </div>
          )}
          {showTplTasks && (
            <div className="mt-2">
              <FromTemplatePicker items={tplTasks||[]} labelKey="name" title="Add task from standard template"
                onPick={pickTplTask} onClose={()=>setShowTplTasks(false)} />
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-gray-100">
            <AttachmentPanel entityType="milestone" entityId={ms.id} />
          </div>
        </div>
      )}

      {/* Revisit modal — rendered inside this card so it has access to ms + showRevisit state */}
      {showRevisit && (
        <RevisitModal
          ms={ms}
          projectId={projectId}
          onClose={() => setShowRevisit(false)}
          onDone={onUpdate}
        />
      )}
    </div>
  )
}

// ── Milestone picker — Select Milestone → Select Task(s) → Select Subtask(s) ──
function MilestonePicker({ templates, projectId, onConfirm, onClose, onReset, hasExisting }) {
  const [step, setStep] = useState(1)
  const [selected, setSelected] = useState([])
  const [detail, setDetail] = useState({})
  const [selection, setSelection] = useState({})
  const [loadingDetail, setLoadingDetail] = useState(false)

  const toggle = (num) => {
    setSelected(prev => prev.includes(num) ? prev.filter(n=>n!==num) : [...prev, num])
  }
  const selectAll = () => setSelected(templates.filter(t=>!t.already_added).map(t=>t.num))
  const clearAll  = () => setSelected([])

  // Fast path: confirm everything as-is (whole milestones, all tasks/subtasks)
  const confirmAllSelected = () => {
    if (selected.length === 0) return
    onConfirm(selected.map(num => ({ num, body: null })))
  }

  // Drill into Task/Subtask selection for fine-grained control
  const goToRefine = async () => {
    if (selected.length === 0) return
    setLoadingDetail(true)
    const newDetail = {}, newSelection = {}
    for (const num of selected) {
      try {
        const res = await api.get(`/projects/${projectId}/custom-milestones/templates/${num}/detail`)
        newDetail[num] = res.data
        const taskSel = {}
        for (const t of res.data.tasks) {
          if (t.already_added) continue
          taskSel[t.num] = new Set(t.subtasks.filter(s=>!s.already_added).map(s=>s.num))
        }
        newSelection[num] = taskSel
      } catch { /* skip */ }
    }
    setDetail(newDetail); setSelection(newSelection)
    setLoadingDetail(false); setStep(2)
  }

  const toggleTask = (msNum, tNum, allSubNums) => {
    setSelection(prev => {
      const ms = {...(prev[msNum]||{})}
      if (ms[tNum]) delete ms[tNum]
      else ms[tNum] = new Set(allSubNums)
      return {...prev, [msNum]: ms}
    })
  }
  const toggleSub = (msNum, tNum, sNum) => {
    setSelection(prev => {
      const ms = {...(prev[msNum]||{})}
      const subs = new Set(ms[tNum] || [])  // auto-selects parent task if not yet selected
      if (subs.has(sNum)) subs.delete(sNum); else subs.add(sNum)
      ms[tNum] = subs
      return {...prev, [msNum]: ms}
    })
  }

  const confirmRefined = () => {
    const items = selected.map(num => {
      const det = detail[num]
      const taskSel = selection[num] || {}
      const taskEntries = Object.entries(taskSel)
      const allTasksAvailable = (det?.tasks||[]).filter(t=>!t.already_added)
      const fullySelected = taskEntries.length === allTasksAvailable.length &&
        taskEntries.every(([tNum, subs]) => {
          const t = allTasksAvailable.find(x => String(x.num)===String(tNum))
          const availSubs = (t?.subtasks||[]).filter(s=>!s.already_added).map(s=>s.num)
          return subs.size === availSubs.length
        })
      if (fullySelected) return { num, body: null }
      const task_nums = taskEntries.map(([t]) => parseInt(t))
      const subtask_nums = {}
      for (const [tNum, subs] of taskEntries) {
        const t = allTasksAvailable.find(x => String(x.num)===String(tNum))
        const availSubs = (t?.subtasks||[]).filter(s=>!s.already_added).map(s=>s.num)
        if (subs.size !== availSubs.length) subtask_nums[tNum] = Array.from(subs)
      }
      return { num, body: { task_nums, subtask_nums: Object.keys(subtask_nums).length ? subtask_nums : null } }
    })
    onConfirm(items)
  }

  if (step === 2) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl animate-fade-up max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-xl">🧩</span>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Select Task(s) and Subtask(s)</h2>
                <p className="text-xs text-gray-400">Selecting a subtask automatically selects its Task and Milestone.</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-xl">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {selected.map(num => {
              const det = detail[num]
              if (!det) return null
              return (
                <div key={num} className="border border-gray-100 rounded-2xl p-3">
                  <div className="text-sm font-semibold text-gray-800 mb-2">M{String(num).padStart(2,'0')} — {det.name}</div>
                  {det.tasks.filter(t=>!t.already_added).map(t => {
                    const taskSel = selection[num]?.[t.num]
                    const taskChecked = !!taskSel
                    const availSubs = t.subtasks.filter(s=>!s.already_added)
                    return (
                      <div key={t.num} className="mb-2 pl-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={taskChecked}
                            onChange={()=>toggleTask(num, t.num, availSubs.map(s=>s.num))} />
                          <span className="text-xs font-medium text-gray-700">Task {t.num} — {t.name}</span>
                        </label>
                        <div className="pl-6 mt-1 space-y-0.5">
                          {availSubs.map(s => (
                            <label key={s.num} className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={taskSel?.has(s.num) || false}
                                onChange={()=>toggleSub(num, t.num, s.num)} />
                              <span className="text-xs text-gray-500">{s.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-between p-5 border-t border-gray-100 bg-gray-50 rounded-b-3xl">
            <button onClick={()=>setStep(1)} className="btn text-xs">← Back</button>
            <button onClick={confirmRefined} className="btn btn-primary text-xs">✓ Confirm & Add</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl animate-fade-up max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Select milestones for this project</h2>
              <p className="text-xs text-gray-400">
                {selected.length > 0
                  ? `${selected.length} milestone${selected.length>1?'s':''} selected`
                  : 'Choose which milestones apply to this project'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasExisting && (
              <button onClick={onReset}
                className="text-xs text-rose-500 hover:text-rose-700 border border-rose-100 hover:border-rose-200 px-2.5 py-1 rounded-lg">
                🔄 Reset all
              </button>
            )}
            <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-xl">✕</button>
          </div>
        </div>

        {/* Select all / clear */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <span className="text-xs text-gray-500">
            {templates.filter(t=>!t.already_added).length} available · {templates.filter(t=>t.already_added).length} already added
          </span>
          <div className="flex gap-2">
            <button onClick={selectAll} className="text-xs text-violet-600 hover:underline font-medium">Select all</button>
            <span className="text-gray-300">|</span>
            <button onClick={clearAll} className="text-xs text-gray-400 hover:underline">Clear</button>
          </div>
        </div>

        {/* All 10 milestones grid — always shown */}
        <div className="px-5 pb-2 flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            {templates.map((t) => {
              const isSelected = selected.includes(t.num)
              const isAdded = t.already_added
              return (
                <button key={t.num}
                  onClick={() => !isAdded && toggle(t.num)}
                  disabled={isAdded}
                  className={clsx('flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                    isAdded
                      ? 'border-emerald-200 bg-emerald-50 cursor-default'
                      : isSelected
                        ? 'border-violet-400 bg-violet-50'
                        : 'border-gray-100 bg-white hover:border-violet-200 hover:bg-violet-50/30 cursor-pointer')}>
                  <div className={clsx('w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all',
                    isAdded
                      ? 'bg-emerald-500 border-emerald-500'
                      : isSelected
                        ? 'bg-violet-600 border-violet-600'
                        : 'border-gray-300')}>
                    {(isAdded || isSelected) && <span className="text-white text-xs">✓</span>}
                  </div>
                  <span className="text-2xl flex-shrink-0">{MS_ICONS[t.num-1]||'🎯'}</span>
                  <div className="flex-1 min-w-0">
                    <div className={clsx('text-xs font-semibold truncate',
                      isAdded ? 'text-emerald-700' : isSelected ? 'text-violet-700' : 'text-gray-800')}>
                      M{String(t.num).padStart(2,'0')} — {t.name}
                    </div>
                    <div className={clsx('text-xs', isAdded?'text-emerald-500':'text-gray-400')}>
                      {isAdded ? 'Already active' : `${t.task_count} tasks · ${t.subtask_count} subtasks`}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-gray-100 bg-gray-50 rounded-b-3xl mt-2">
          <button onClick={onClose} className="btn text-xs">Cancel</button>
          <div className="flex items-center gap-2">
            {selected.length > 0 && (
              <span className="text-xs text-violet-600 font-medium mr-1">
                {selected.length} new milestone{selected.length>1?'s':''}
              </span>
            )}
            <button onClick={goToRefine} disabled={selected.length===0 || loadingDetail}
              className={clsx('btn text-xs', selected.length===0 && 'opacity-40 cursor-not-allowed')}>
              {loadingDetail ? '⟳ Loading…' : '🧩 Select Task/Subtask →'}
            </button>
            <button onClick={confirmAllSelected}
              disabled={selected.length === 0}
              className={clsx('btn btn-primary text-xs', selected.length===0 && 'opacity-40 cursor-not-allowed')}>
              ✓ Confirm & Add (all)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Custom milestone creator ───────────────────────────────────────────────────
function CustomMilestoneForm({ onSave, onClose, team }) {
  const [form, setForm] = useState({ num:'', name:'', description:'', responsible:'' })
  const [saving, setSaving] = useState(false)
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-fade-up">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2"><span className="text-xl">✨</span><h2 className="text-sm font-semibold">Create custom milestone</h2></div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-xl">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1"># Number <span className="text-rose-500">*</span></label>
              <input type="number" className="input text-sm" placeholder="e.g. 11" value={form.num} onChange={e=>setForm({...form,num:e.target.value})} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Name <span className="text-rose-500">*</span></label>
              <input className="input text-sm" placeholder="e.g. Data Migration" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea className="textarea text-sm" rows={2} placeholder="What will be achieved?" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Responsible team / member</label>
            <select className="select text-sm" value={form.responsible} onChange={e=>setForm({...form,responsible:e.target.value})}>
              <option value="">— Select responsible member (optional) —</option>
              {(team||[]).map(m => <option key={m.id} value={m.name}>{m.name} ({m.role})</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
          <button className="btn text-xs" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary text-xs" disabled={!form.num||!form.name||saving}
            onClick={async()=>{setSaving(true);await onSave({...form,num:parseInt(form.num)});setSaving(false);onClose()}}>
            {saving?<><span className="animate-spin">⟳</span> Creating…</>:<>✨ Create</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Quick-add subtask ──────────────────────────────────────────────────────────
// "MILESTONE" icon (Milestone Configuration header): the old sidebar
// "Milestones" shortcut list — header with count, loading skeleton, empty
// state, and per-milestone shortcut buttons — moved here unchanged, just
// triggered by a button instead of always being shown in the sidebar.
function MilestonePanel({ milestones, loading, activeMilestone, onPick, onClose }) {
  return (
    <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl border border-gray-100 shadow-2xl z-50 p-3 animate-fade-up">
      <div className="flex items-center justify-between px-1 pb-2">
        <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Milestones</span>
        <span className="text-xs bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded-md font-medium">{milestones.length}</span>
      </div>

      {loading ? (
        <div className="space-y-1.5 px-1">
          {[1,2,3].map(i => <div key={i} className="h-7 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : milestones.length === 0 ? (
        <div className="px-1 py-2">
          <p className="text-xs text-gray-400 mb-1">No milestones selected yet.</p>
          <button onClick={onClose} className="text-xs text-violet-600 hover:underline font-medium">Configure milestones →</button>
        </div>
      ) : (
        <div className="space-y-0.5 max-h-72 overflow-y-auto">
          {milestones.map((ms, i) => {
            const active = activeMilestone === ms.num
            return (
              <button key={ms.id} onClick={() => onPick(ms)}
                className={clsx('w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left transition-all duration-200',
                  active ? 'bg-violet-50 text-violet-700' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50')}>
                <span className="text-sm">{MS_ICONS[i % MS_ICONS.length]}</span>
                <span className="text-xs font-medium w-5 text-gray-400">{String(ms.num).padStart(2,'0')}</span>
                <span className="text-xs flex-1 truncate">{ms.name}</span>
                {(ms.iteration||1) > 1 && (
                  <span className="text-[10px] bg-indigo-100 text-indigo-600 rounded px-0.5 flex-shrink-0">R{ms.iteration}</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 mt-2 px-1">Close</button>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function CustomMilestonesPage() {
  const { id } = useParams()
  const { bumpMilestonesVersion, activeMilestone, setActiveMilestone } = useAppStore()
  const [milestones, setMilestones] = useState([])
  const [templates, setTemplates] = useState([])
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showMsPanel, setShowMsPanel] = useState(false)
  const [msg, setMsg] = useState(null)
  // Tab/icon view (testing feedback): each Milestone gets its own tab so the
  // form, details, and manual time entries for that one Milestone can be
  // worked on in a focused view, instead of scrolling a long stacked list.
  // 'all' keeps the original list view available too.
  const [activeTab, setActiveTab] = useState('all')

  const load = async () => {
    setLoading(true)
    try {
      const [mRes, tRes, teamRes] = await Promise.all([
        api.get(`/projects/${id}/custom-milestones`),
        api.get(`/projects/${id}/custom-milestones/templates`),
        api.get(`/projects/${id}/team`).catch(() => ({ data: [] })),
      ])
      setMilestones(mRes.data)
      setTemplates(tRes.data)
      setTeam(teamRes.data)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  const showMsg = (text, type='success') => {
    setMsg({text,type}); setTimeout(()=>setMsg(null),3500)
  }

  // Targeted single-milestone refresh — no loading flash, no full reload.
  // Called by MilestoneCard after any save so that changes appear instantly
  // without re-fetching all milestones.
  const updateOneMilestone = async (msId) => {
    try {
      const res = await api.get(`/projects/${id}/custom-milestones/${msId}`)
      setMilestones(prev => prev.map(m => m.id === msId ? res.data : m))
    } catch(e) { console.error('updateOneMilestone failed', e) }
  }

  // items: [{ num, body }] — body is null for "add everything", or
  // { task_nums, subtask_nums } for a selective Task/Subtask copy.
  const handleConfirm = async (items) => {
    setAdding(true); setShowPicker(false)
    let added = 0
    for (const { num, body } of items) {
      try { await api.post(`/projects/${id}/custom-milestones/from-template/${num}`, body); added++ }
      catch(e) { /* skip duplicates */ }
    }
    showMsg(`✅ ${added} milestone${added>1?'s':''} added! They now appear in the sidebar, Dashboard, and Deadlines.`)
    setAdding(false)
    await load()
    bumpMilestonesVersion()
  }

  const handleReset = async () => {
    if (!window.confirm('Remove all milestones from this project? You can re-select them after.')) return
    await api.delete(`/projects/${id}/custom-milestones/reset`)
    showMsg('Milestones reset. Select new ones with ➕ Add milestones.', 'success')
    await load()
    bumpMilestonesVersion()
  }

  const createCustom = async (data) => {
    try {
      await api.post(`/projects/${id}/custom-milestones`, data)
      showMsg('Custom milestone created! ✅')
      await load()
      bumpMilestonesVersion()
    } catch(e) { showMsg(e.response?.data?.detail||'Failed','error') }
  }

  const deleteMilestone = async (msId) => {
    if (!window.confirm('Remove this milestone from the project?')) return
    await api.delete(`/projects/${id}/custom-milestones/${msId}`)
    showMsg('Milestone removed')
    await load()
    bumpMilestonesVersion()
  }

  const availableCount = templates.filter(t=>!t.already_added).length

  return (
    <div className="animate-fade-up">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl" style={{background:'linear-gradient(135deg,#7c3aed,#4f46e5)'}}>🏁</div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Milestone Configuration</h1>
            <p className="text-xs text-gray-400">
              {milestones.length > 0
                ? `${milestones.length} milestone${milestones.length>1?'s':''} active · timelines, status & hours are tracked down to Task / Subtask / Activity level`
                : 'No milestones selected — Dashboard and sidebar will show empty until you add some'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowMsPanel(v => !v)} title="Jump to a milestone"
              className={clsx('btn text-xs hover:border-violet-200 hover:text-violet-600', showMsPanel && 'border-violet-300 text-violet-600 bg-violet-50')}>
              🏁 MILESTONE
            </button>
            {showMsPanel && (
              <MilestonePanel
                milestones={milestones}
                loading={loading}
                activeMilestone={activeMilestone}
                onPick={(ms) => { setActiveMilestone(ms.num); setActiveTab(ms.id); setShowMsPanel(false) }}
                onClose={() => setShowMsPanel(false)}
              />
            )}
          </div>
          <button onClick={() => setShowPicker(true)} disabled={adding} className="btn btn-primary text-xs">
            {adding ? <><span className="animate-spin">⟳</span> Adding…</> : <>➕ Add milestones</>}
          </button>
          <button onClick={() => setShowCreate(true)} className="btn text-xs hover:border-violet-200 hover:text-violet-600">
            ✨ Create custom
          </button>
        </div>
      </div>

      {/* Message */}
      {msg && (
        <div className={clsx('mb-4 px-4 py-2.5 rounded-xl text-sm animate-fade-up flex items-center gap-2',
          msg.type==='error' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100')}>
          {msg.text}
        </div>
      )}

      {/* Empty state */}
      {!loading && milestones.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200 shadow-sm mb-5">
          <div className="text-6xl mb-4 animate-float">🏁</div>
          <h2 className="text-base font-bold text-gray-700 mb-2">No milestones configured yet</h2>
          <p className="text-xs text-gray-400 mb-1 max-w-md mx-auto">
            Click <strong>➕ Add milestones</strong> to choose from the 10 standard milestones, then optionally drill into specific Tasks and Subtasks.
          </p>
          <p className="text-xs text-gray-400 mb-6 max-w-md mx-auto">
            Only selected milestones will appear in the sidebar, Dashboard, and Deadlines page.
          </p>
          <button onClick={() => setShowPicker(true)}
            className="btn btn-primary text-xs mx-auto">
            ➕ Add milestones
          </button>
        </div>
      )}

      {/* ── Milestone tab strip ─────────────────────────────────────────── */}
      {!loading && milestones.length > 0 && (
        <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('all')}
            className={clsx('flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
              activeTab === 'all'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-500 hover:border-violet-200 hover:text-violet-600')}>
            All ({milestones.length})
          </button>
          {milestones.map((ms, i) => (
            <button key={ms.id}
              onClick={() => { setActiveTab(ms.id); setActiveMilestone(ms.num) }}
              className={clsx('flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
                activeTab === ms.id
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-500 hover:border-violet-200 hover:text-violet-600')}>
              <span>{MS_ICONS[i % MS_ICONS.length]}</span>
              <span>M{String(ms.num).padStart(2,'0')}</span>
              {(ms.iteration||1) > 1 && (
                <span className={clsx('text-[10px] rounded px-0.5', activeTab===ms.id ? 'bg-white/30 text-white' : 'bg-indigo-100 text-indigo-600')}>
                  R{ms.iteration}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Milestone cards ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
        </div>
      ) : activeTab === 'all' ? (
        <div>
          {milestones.map(ms => (
            <MilestoneCard key={ms.id} ms={ms} projectId={id} onUpdate={() => updateOneMilestone(ms.id)} team={team}
              onDelete={() => deleteMilestone(ms.id)} forceOpen={false} />
          ))}
        </div>
      ) : (
        <div>
          {milestones.filter(ms => ms.id === activeTab).map(ms => (
            <MilestoneCard key={ms.id} ms={ms} projectId={id} onUpdate={() => updateOneMilestone(ms.id)} team={team}
              onDelete={() => deleteMilestone(ms.id)} forceOpen />
          ))}
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {showPicker && (
        <MilestonePicker
          templates={templates}
          projectId={id}
          onConfirm={handleConfirm}
          onClose={() => setShowPicker(false)}
          onReset={() => { setShowPicker(false); handleReset() }}
          hasExisting={milestones.length > 0}
        />
      )}
      {showCreate && (
        <CustomMilestoneForm
          team={team}
          onSave={createCustom}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  )
}
