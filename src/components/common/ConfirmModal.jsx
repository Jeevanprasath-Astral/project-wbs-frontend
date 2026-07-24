/**
 * Reusable confirmation dialog — replaces browser window.confirm() across the app.
 *
 * Usage:
 *   const [confirm, setConfirm] = useState(null)
 *
 *   // trigger it:
 *   setConfirm({
 *     title: 'Delete task?',
 *     message: 'This cannot be undone.',
 *     onConfirm: () => doDelete(id),
 *   })
 *
 *   // render once at the bottom of the component:
 *   <ConfirmModal
 *     open={!!confirm}
 *     title={confirm?.title}
 *     message={confirm?.message}
 *     confirmLabel={confirm?.confirmLabel}
 *     danger={confirm?.danger !== false}
 *     onConfirm={() => { confirm?.onConfirm(); setConfirm(null) }}
 *     onCancel={() => setConfirm(null)}
 *   />
 */
export default function ConfirmModal({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  danger = true,
  onConfirm,
  onCancel,
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold text-gray-900 mb-1">{title}</h2>
        {message && (
          <p className="text-xs text-gray-500 mb-5 leading-relaxed">{message}</p>
        )}
        {!message && <div className="mb-4" />}
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="btn text-xs">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`btn text-xs font-medium ${
              danger
                ? 'bg-red-600 text-white hover:bg-red-700 border-red-600'
                : 'btn-primary'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
