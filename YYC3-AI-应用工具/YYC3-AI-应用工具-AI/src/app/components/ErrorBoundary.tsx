/**
 * YYC3 Error Boundary — Catches runtime errors to prevent blank screen
 * @version 4.8.0
 */
import { Component, type ReactNode } from 'react'
import { themeStore } from '../store/theme-store'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  silent?: boolean
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[YYC3 ErrorBoundary]', error, info.componentStack)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      if (this.props.silent) return null

      const tk = themeStore.getTokens()
      return (
        <div
          className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl"
          style={{
            background: tk.cardBg,
            border: `1px solid ${tk.error}30`,
            color: tk.foreground,
            minHeight: 120,
          }}
        >
          <AlertTriangle size={24} color={tk.error} />
          <div style={{ fontFamily: tk.fontMono, fontSize: '12px', color: tk.error }}>
            Component Error
          </div>
          <div
            className="max-w-md text-center"
            style={{ fontFamily: tk.fontMono, fontSize: '10px', color: tk.foregroundMuted }}
          >
            {this.state.error?.message?.slice(0, 200) || 'Unknown error'}
          </div>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
            style={{
              fontFamily: tk.fontMono,
              fontSize: '11px',
              color: tk.primary,
              border: `1px solid ${tk.border}`,
              background: tk.primaryGlow,
            }}
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
