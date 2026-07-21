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

// ── Task Form Field row ────────────────────────────────────────────────────────
// One form field (question + answer) under a Task. Fields are grouped visually
// by section_name — a header is shown when the section_name changes.
function FormFieldRow({ f, projectId, msId, taskId, onUpdate, isFirst, showSection }) {
  const [editingText, setEditingText] = useState(false)
  const [textDraft, setTextDraft] = useState({ question_text: f.question_text, input_type: f.input_type })
  const [answer, setAnswer] = useState(f.response || '')
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)

  const saveAnswer = async () => {
    await api.patch(`/projects/${projectId}/custom-milestones/${msId}/tasks/${taskId}/form-fields/${f.id}`, { response: answer })
    setDirty(false); setSaved(true); setTimeout(() => setSaved(false), 1500)
  }
  const saveText = async () => {
    await api.patch(`/projects/${projectId}/custom-milestones/${msId}/tasks/${taskId}/form-fields/${f.id}`, textDraft)
    setEditingText(false)
  }
  const del = async () => {
    if (!window.confirm('Delete this form field?')) return
    await api.delete(`/projects/${projectId}/custom-milestones/${msId}/tasks/${taskId}/form-fields/${f.id}`)
    onUpdate()
  }

  return (
    <>
      {showSection && f.section_name && (
        <div className={clsx('text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100', isFirst ? 'mt-0 mb-2' : 'mt-4 mb-2')}>
          📁 {f.section_name}
        </div>
      )}
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
              <button onClick={() => {setEditingText(false); setTextDraft({question_text:f.question_text, input_type:f.input_type})}} className="btn text-xs py-0.5 px-1.5">✕</button>
            </div>
          ) : (
            <>
              <label className="text-xs font-medium text-violet-700 flex-1">{f.question_text}</label>
              <span className="text-[10px] text-gray-400 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded">{f.input_type}</span>
              <button onClick={() => setEditingText(true)} className="btn text-xs py-0.5 px-1.5 hover:text-violet-600" title="Edit question">✏️</button>
              <button onClick={del} className="btn text-xs py-0.5 px-1.5 hover:text-rose-600" title="Delete field">🗑️</button>
            </>
          )}
        </div>
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <ResponseField inputType={f.input_type} value={answer} onChange={v => { setAnswer(v); setDirty(true) }} />
          </div>
          <button onClick={saveAnswer} disabled={!dirty} className={clsx('btn text-xs py-1 px-2 flex-shrink-0 mt-0.5', dirty && 'btn-primary')}>
            {saved ? '✅' : '💾'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Task Form Panel — replaces the old Subtask+Question hierarchy ─────────────
// Shows all form_fields for a Task, grouped by section_name (= former Subtask
// name). Admins and PMs can add new fields and edit/delete existing ones.
// Fields are fetched lazily from the API when this panel opens — the initial
// milestone list load uses compact=true (no form_fields) to prevent OOM crashes.
function TaskFormPanel({ t, ms, projectId, onUpdate }) {
  const [fields, setFields] = useState(null)   // null = not yet loaded
  const [loadingFields, setLoadingFields] = useState(false)
  const [addingField, setAddingField] = useState(false)
  const [newField, setNewField] = useState({ question_text: '', input_type: 'text', section_name: '' })
  const [saving, setSaving] = useState(false)

  // Fetch form fields from API on mount (lazy — avoids loading 6000+ rows upfront)
  useEffect(() => {
    const fetchFields = async () => {
      setLoadingFields(true)
      try {
        const res = await api.get(`/projects/${projectId}/custom-milestones/${ms.id}/tasks/${t.id}/form-fields`)
        setFields(res.data)
      } catch(e) { console.error('form-fields load failed', e); setFields([]) }
      finally { setLoadingFields(false) }
    }
    fetchFields()
  }, [t.id, ms.id, projectId])

  // Refresh only the local fields list (after add/delete) without triggering a
  // full milestone reload — keeps the panel open and state stable.
  const refreshFields = async () => {
    try {
      const res = await api.get(`/projects/${projectId}/custom-milestones/${ms.id}/tasks/${t.id}/form-fields`)
      setFields(res.data)
    } catch(e) { console.error(e) }
  }

  const saveField = async () => {
    if (!newField.question_text.trim()) return
    setSaving(true)
    try {
      await api.post(`/projects/${projectId}/custom-milestones/${ms.id}/tasks/${t.id}/form-fields`, {
        question_text: newField.question_text.trim(),
        input_type: newField.input_type,
        section_name: newField.section_name.trim() || null,
        num: (fields?.length || 0) + 1,
      })
      setNewField({ question_text: '', input_type: 'text', section_name: '' })
      setAddingField(false)
      await refreshFields()
      onUpdate()   // update form_field_count badge in parent
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  if (loadingFields) {
    return (
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="text-xs text-gray-400 animate-pulse">Loading form fields…</div>
      </div>
    )
  }

  const safeFields = fields || []

  if (safeFields.length === 0 && !addingField) {
    return (
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="text-xs text-gray-400 mb-2 flex items-center gap-1.5">
          <span>📋</span> <span>No form fields yet.</span>
          <button onClick={() => setAddingField(true)} className="text-violet-600 hover:text-violet-800 font-medium">Add one →</button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <div className="text-xs font-semibold text-violet-700 mb-3 flex items-center gap-1.5">
        <span className="w-4 h-4 rounded-full bg-violet-600 text-white flex items-center justify-center text-[10px]">2</span>
        Form <span className="font-normal text-gray-400">({safeFields.length} field{safeFields.length!==1?'s':''})</span>
      </div>

      {/* Group fields by section_name */}
      {(() => {
        let lastSection = '__NONE__'
        return safeFields.map((f, idx) => {
          const secChanged = f.section_name !== lastSection
          if (secChanged) lastSection = f.section_name
          return (
            <FormFieldRow
              key={f.id}
              f={f}
              projectId={projectId}
              msId={ms.id}
              taskId={t.id}
              onUpdate={async () => { await refreshFields(); onUpdate() }}
              isFirst={idx === 0}
              showSection={secChanged}
            />
          )
        })
      })()}

      {addingField ? (
        <div className="mt-2 p-3 bg-violet-50 rounded-xl border border-violet-100 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-0.5">Question / Field label <span className="text-rose-500">*</span></label>
              <input className="input text-xs h-8 w-full" placeholder="e.g. Session date" value={newField.question_text}
                onChange={e => setNewField({...newField, question_text: e.target.value})}
                onKeyDown={e => e.key === 'Enter' && saveField()} autoFocus />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Input type</label>
              <select className="select text-xs h-8 w-full" value={newField.input_type}
                onChange={e => setNewField({...newField, input_type: e.target.value})}>
                {INPUT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Section (optional)</label>
              <input className="input text-xs h-8 w-full" placeholder="e.g. Understand client"
                value={newField.section_name}
                onChange={e => setNewField({...newField, section_name: e.target.value})} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={saveField} disabled={saving || !newField.question_text.trim()} className="btn btn-primary text-xs py-1 px-2">
              {saving ? '⟳' : '✓ Add field'}
            </button>
            <button onClick={() => setAddingField(false)} className="btn text-xs py-1 px-2">✕</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAddingField(true)} className="text-xs text-violet-600 hover:text-violet-800 font-medium flex items-center gap-1 mt-1">
          ➕ Add field
        </button>
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
  const [saving, setSaving] = useState(false)
  // Bug #1: seed draft from own_estimated_hours so editable field shows the raw stored value
  const [draft, setDraft] = useState(seedHoursDraft(t))
  const [showTaskMailbox, setShowTaskMailbox] = useState(false)
  const [showTimeline, setShowTimeline] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [noteText, setNoteText] = useState(t.notes || '')
  const [savingNote, setSavingNote] = useState(false)
  const [noteSaved, setNoteSaved] = useState(false)

  const saveNote = async () => {
    setSavingNote(true)
    try {
      await api.patch(`/projects/${projectId}/custom-milestones/${ms.id}/tasks/${t.id}`, { notes: noteText })
      setNoteSaved(true)
      setTimeout(() => setNoteSaved(false), 2000)
    } finally { setSavingNote(false) }
  }

  const delTask = async () => {
    if (!window.confirm('Delete this task and all its form fields?')) return
    await api.delete(`/projects/${projectId}/custom-milestones/${ms.id}/tasks/${t.id}`)
    onUpdate()
  }
  const saveTimeline = async () => {
    await api.patch(`/projects/${projectId}/custom-milestones/${ms.id}/tasks/${t.id}`, draft)
    setShowTimeline(false)
  }

  return (
    <div className={clsx('border rounded-2xl overflow-hidden mb-3 transition-colors',
      isOpen ? 'border-violet-200' : 'border-gray-100')}>
      <div className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-violet-50/20 cursor-pointer" onClick={onSelect}>
        <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', isOpen ? 'bg-violet-600' : 'bg-violet-400')} />
        <span className="text-sm font-semibold text-gray-800 flex-1">Task {String(t.num).padStart(2,'0')} — {t.name}</span>
        <span className={clsx('text-xs px-1.5 py-0.5 rounded-md',
          t.status==='Completed' ? 'bg-emerald-50 text-emerald-600' : t.status==='In Progress' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500')}>
          {t.status||'Not Started'}
        </span>
        {t.responsibility && <span className="text-xs text-gray-400">{t.responsibility}</span>}
        <div className="flex gap-1 flex-shrink-0" onClick={e=>e.stopPropagation()}>
          <button
            onClick={()=>setShowForm(v=>!v)}
            className={clsx('btn text-xs py-0.5 px-2 flex items-center gap-1 font-medium',
              showForm ? 'bg-violet-600 text-white border-violet-600' : 'text-violet-600 border-violet-300 hover:bg-violet-50')}
            title="Show / hide form fields">
            📋 Form
            {(t.form_field_count||0) > 0 &&
              <span className={clsx('text-[10px] px-1 rounded-full', showForm ? 'bg-white/30 text-white' : 'bg-violet-100 text-violet-700')}>
                {t.form_field_count}
              </span>}
          </button>
          <button
            onClick={()=>setShowNotes(v=>!v)}
            className={clsx('btn text-xs py-0.5 px-2 flex items-center gap-1 font-medium',
              showNotes ? 'bg-amber-500 text-white border-amber-500' : 'text-amber-600 border-amber-300 hover:bg-amber-50')}
            title="Show / hide task notes">
            📝 Notes
            {noteText && <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', showNotes ? 'bg-white' : 'bg-amber-500')} />}
          </button>
          <button onClick={()=>setShowTimeline(v=>!v)}
            className={clsx('btn text-xs py-0.5 px-1.5 hover:text-violet-600 hover:border-violet-200', showTimeline && 'text-violet-600 border-violet-200 bg-violet-50')}
            title="Time Management">📅</button>
          <button onClick={()=>setShowTaskMailbox(true)} className="btn text-xs py-0.5 px-1.5 hover:text-blue-600" title="Send task details by email">✉️</button>
          <button onClick={delTask} className="btn text-xs py-0.5 px-1.5 hover:text-rose-600">🗑️</button>
        </div>
        <span className="text-gray-300 text-xs">{isOpen?'▲':'▼'}</span>
      </div>

      {/* Form panel — toggled independently by the Form button */}
      {showForm && (
        <div className="border-t border-violet-100 bg-violet-50/30 p-3" onClick={e=>e.stopPropagation()}>
          <TaskFormPanel t={t} ms={ms} projectId={projectId} onUpdate={onUpdate} />
        </div>
      )}

      {/* Notes panel — toggled by the Notes button */}
      {showNotes && (
        <div className="border-t border-amber-100 bg-amber-50/30 p-3" onClick={e=>e.stopPropagation()}>
          <div className="text-xs font-semibold text-amber-700 mb-2">📝 Task Notes</div>
          <textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            rows={4}
            placeholder="Enter notes, comments, or observations for this task..."
            className="w-full text-sm border border-amber-200 rounded-lg p-2 resize-y focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white"
          />
          <div className="flex items-center gap-2 mt-2">
            <button onClick={saveNote} disabled={savingNote}
              className="btn btn-primary text-xs py-1 px-3">
              {savingNote ? 'Saving…' : noteSaved ? '✅ Saved!' : '💾 Save Note'}
            </button>
            <button onClick={() => { setNoteText(t.notes || ''); setShowNotes(false) }}
              className="btn text-xs py-1 px-3">Cancel</button>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="border-t border-gray-50 p-3" onClick={e=>e.stopPropagation()}>
          {/* Date & Time Management */}
          {showTimeline && (
            <div className="mb-2">
              <div className="text-xs font-semibold text-violet-700 mb-2 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-violet-600 text-white flex items-center justify-center text-[10px]">1</span>
                Date &amp; Time Management
              </div>
              {/* Bug #1: showHours makes estimated_hours editable at task level */}
              <TimelineFields value={draft} onChange={setDraft} team={team} showHours />
              <div className="flex items-center gap-2 mt-2">
                <button onClick={saveTimeline} className="btn btn-primary text-xs py-1 px-2">💾 Save</button>
                <button onClick={()=>setDraft(seedHoursDraft(t))} className="btn text-xs py-1 px-2">Cancel</button>
              </div>
            </div>
          )}

          <AttachmentPanel entityType="task" entityId={t.id} />
        </div>
      )}
      {showTaskMailbox && (
        <MailboxModal
          type="task" projectId={projectId} entityId={t.id} msId={ms.id}
          entityName={`T${String(t.num).padStart(2,'0')} — ${t.name}`}
          team={team} onClose={() => setShowTaskMailbox(false)}
        />
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

// ── Mailbox modal — send milestone or task details as email + Excel attachment ─
function MailboxModal({ projectId, type, entityId, msId, entityName, team, onClose }) {
  const [toEmails, setToEmails] = useState([])
  const [externalEmail, setExternalEmail] = useState('')
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const allRecipients = [
    ...toEmails,
    ...externalEmail.split(',').map(e => e.trim()).filter(Boolean)
  ]

  const send = async () => {
    if (allRecipients.length === 0) { setError('Add at least one recipient.'); return }
    setError(''); setSending(true)
    try {
      const url = type === 'milestone'
        ? `/projects/${projectId}/custom-milestones/${entityId}/mailbox`
        : `/projects/${projectId}/custom-milestones/${msId}/tasks/${entityId}/mailbox`
      await api.post(url, { to: allRecipients, note })
      setSent(true)
      setTimeout(() => onClose(), 1800)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to send email — check logs')
    } finally { setSending(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-fade-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">✉️</span>
            <div>
              <h2 className="text-sm font-semibold">Send {type === 'milestone' ? 'Milestone' : 'Task'} Details</h2>
              <p className="text-xs text-gray-400">{entityName} · Excel attached</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-xl">✕</button>
        </div>
        <div className="p-5 space-y-4">
          {/* Team member checkboxes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">To — Team Members</label>
            <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-xl p-2 space-y-0.5 bg-gray-50">
              {(team || []).filter(m => m.email).map(m => (
                <label key={m.id} className="flex items-center gap-2 cursor-pointer hover:bg-white rounded-lg px-2 py-1 transition-colors">
                  <input type="checkbox" className="accent-violet-600"
                    checked={toEmails.includes(m.email)}
                    onChange={e => setToEmails(prev => e.target.checked ? [...prev, m.email] : prev.filter(x => x !== m.email))} />
                  <span className="text-xs font-medium text-gray-700">{m.name}</span>
                  <span className="text-xs text-gray-400">{m.email}</span>
                </label>
              ))}
              {!(team || []).some(m => m.email) && <p className="text-xs text-gray-400 px-2 py-1">No team members with email addresses found.</p>}
            </div>
          </div>
          {/* External emails */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">External Email <span className="text-gray-400 font-normal">(comma-separated)</span></label>
            <input className="input text-sm w-full" placeholder="e.g. client@company.com, manager@firm.com"
              value={externalEmail} onChange={e => setExternalEmail(e.target.value)} />
          </div>
          {/* Note */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Note <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea className="textarea text-sm w-full resize-none" rows={2}
              placeholder="Add a message to include in the email..."
              value={note} onChange={e => setNote(e.target.value)} />
          </div>
          {/* Recipients summary */}
          {allRecipients.length > 0 && (
            <div className="bg-violet-50 border border-violet-100 rounded-xl px-3 py-2">
              <p className="text-xs font-medium text-violet-700 mb-0.5">Sending to {allRecipients.length} recipient{allRecipients.length > 1 ? 's' : ''}:</p>
              <p className="text-xs text-violet-600 break-all">{allRecipients.join(', ')}</p>
            </div>
          )}
          {error && <p className="text-xs text-rose-500">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100">
          <button onClick={onClose} className="btn text-xs">Cancel</button>
          <button onClick={send} disabled={sending || allRecipients.length === 0}
            className={clsx('btn btn-primary text-xs flex items-center gap-1.5',
              (sending || allRecipients.length === 0) && 'opacity-50 cursor-not-allowed')}>
            {sent ? '✅ Sent!' : sending ? '⟳ Sending…' : '✉️ Send Email'}
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
  const [showMailbox, setShowMailbox] = useState(false)
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
  const fieldCount = ms.tasks?.reduce((a,t)=>a+(t.form_field_count||0),0)||0

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
            <span>{taskCount} tasks · {fieldCount} form fields{ms.responsible&&` · ${ms.responsible}`}</span>
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
          <button onClick={()=>setShowMailbox(true)} className="btn text-xs py-1 px-2 hover:text-blue-600 hover:border-blue-200" title="Send milestone details by email">✉️ Send</button>
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

          {/* ── Reports section (hidden from UI; backend data preserved) ── */}
          {false && <div className="mb-4 pb-4 border-b border-gray-100 hidden-reports-section">
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
          </div>}

          {/* ── Tasks ──────────────────────────────────────────────────────── */}
          {taskCount > 0 && (
            <div className="text-xs text-gray-400 mb-2">👉 Click a task below to open its form fields and time management.</div>
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

      {/* Revisit modal */}
      {showRevisit && (
        <RevisitModal ms={ms} projectId={projectId} onClose={() => setShowRevisit(false)} onDone={onUpdate} />
      )}
      {/* Mailbox modal */}
      {showMailbox && (
        <MailboxModal
          type="milestone" projectId={projectId} entityId={ms.id}
          entityName={`M${String(ms.num).padStart(2,'0')} — ${ms.name}`}
          team={team} onClose={() => setShowMailbox(false)}
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
                <h2 className="text-sm font-semibold text-gray-900">Select Task(s)</h2>
                <p className="text-xs text-gray-400">Form fields are generated automatically for each selected task.</p>
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
                    const availSubs = t.subtasks ? t.subtasks.filter(s=>!s.already_added) : []
                    return (
                      <div key={t.num} className="mb-2 pl-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={taskChecked}
                            onChange={()=>toggleTask(num, t.num, availSubs.map(s=>s.num))} />
                          <span className="text-xs font-medium text-gray-700">Task {t.num} — {t.name}</span>
                        </label>
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
        api.get(`/projects/${id}/custom-milestones?compact=true`),
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
      const res = await api.get(`/projects/${id}/custom-milestones/${msId}?compact=true`)
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
                ? `${milestones.length} milestone${milestones.length>1?'s':''} active · timelines, status & hours are tracked at Task level`
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
