import { Component } from 'react'

/**
 * Route-level Error Boundary.
 *
 * Wraps each lazy route in App.jsx so a render crash in one page
 * never blanks the entire application — it shows a friendly
 * "Something went wrong" card instead, with a Reload button that
 * clears the error state so the user can retry without losing their
 * session or having to do a full browser refresh.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Render error caught:', error, info?.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl border border-rose-100 shadow-md p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-base font-semibold text-gray-800 mb-2">Something went wrong</h2>
          <p className="text-xs text-gray-500 mb-5">
            This page ran into an unexpected error. Your session is still active — click Reload to try again.
          </p>
          {this.state.error?.message && (
            <pre className="text-left text-[10px] bg-rose-50 text-rose-700 rounded-xl px-3 py-2 mb-5 overflow-x-auto max-h-24">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex gap-2 justify-center">
            <button
              onClick={this.handleReset}
              className="btn btn-primary text-xs px-4 py-2"
            >
              🔄 Reload page
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn text-xs px-4 py-2 text-gray-500 hover:text-gray-700"
            >
              Full refresh
            </button>
          </div>
        </div>
      </div>
    )
  }
}
