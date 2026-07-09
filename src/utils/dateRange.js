/**
 * Date range validation utilities.
 *
 * Rule: start_date <= end_date (both optional, validated only when both present).
 *
 * Usage in a form:
 *
 *   import { onStartChange, onEndChange, dateRangeError } from '../utils/dateRange'
 *
 *   // In onChange handlers:
 *   onStartChange(val, form.end_date, v => setForm(f => ({...f, start_date: v, end_date: v > form.end_date && form.end_date ? '' : f.end_date})))
 *
 *   // Or use the helpers directly:
 *   handleStartDate('start_date', 'end_date', val, form, setForm)
 *   handleEndDate('start_date', 'end_date', val, form, setForm)
 *
 *   // Submit guard:
 *   const err = dateRangeError(form.start_date, form.end_date)
 *   if (err) { showToast(err, 'error'); return }
 */

/**
 * Call when the start date input changes.
 * If the new start is after the current end, end is auto-cleared.
 *
 * @param {string} startKey   - key in the form object for start date
 * @param {string} endKey     - key in the form object for end date
 * @param {string} newStart   - new value from the input (YYYY-MM-DD or '')
 * @param {object} form       - current form state
 * @param {Function} setForm  - state setter (receives updater function)
 */
export function handleStartDate(startKey, endKey, newStart, form, setForm) {
  setForm(prev => {
    const currentEnd = prev[endKey]
    const shouldClearEnd = newStart && currentEnd && newStart > currentEnd
    return {
      ...prev,
      [startKey]: newStart,
      ...(shouldClearEnd ? { [endKey]: '' } : {}),
    }
  })
}

/**
 * Call when the end date input changes.
 * Only allows values >= start date (browser min enforces this visually;
 * this function adds a JS-level guard as backup).
 */
export function handleEndDate(startKey, endKey, newEnd, form, setForm) {
  const currentStart = form[startKey]
  if (newEnd && currentStart && newEnd < currentStart) return // ignore invalid pick
  setForm(prev => ({ ...prev, [endKey]: newEnd }))
}

/**
 * Returns an error string if start > end, or null if valid.
 * Use this as a submit guard.
 */
export function dateRangeError(startVal, endVal) {
  if (startVal && endVal && startVal > endVal) {
    return 'End Date must be on or after Start Date.'
  }
  return null
}
