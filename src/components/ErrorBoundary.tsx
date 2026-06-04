import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Catches render-time exceptions in its subtree (e.g. a chart or a useMemo
 * aggregation throwing) and shows a recoverable fallback instead of crashing
 * the whole app to a white screen.
 *
 * Pass `key={pathname}` where it is mounted so navigating to another route
 * remounts it and clears a stale error automatically.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // No error-tracking service yet; at least leave a trace in the console.
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  private handleReset = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <div className="p-3 rounded-full bg-red-50 text-red-500 mb-4">
            <AlertTriangle className="w-8 h-8" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-1">
            Algo salió mal en esta sección
          </h2>
          <p className="text-sm text-gray-500 max-w-md mb-4">
            Ocurrió un error al mostrar este contenido. Podés reintentar o recargar la página.
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors"
            >
              Reintentar
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Recargar
            </button>
          </div>
          {import.meta.env.DEV && (
            <pre className="mt-6 text-left text-xs text-red-600 bg-red-50 p-3 rounded-lg max-w-lg overflow-auto">
              {this.state.error.message}
            </pre>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
