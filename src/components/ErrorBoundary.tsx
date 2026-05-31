import { Component, type ErrorInfo, type ReactNode } from 'react'
import { clearDeviceStorage } from '../lib/deviceStorage'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Rhythm error:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100dvh',
            background: 'var(--rhythm-bg, #0a0e14)',
            color: 'var(--rhythm-fg, #f0f3f7)',
            padding: '24px',
            fontFamily: '-apple-system, system-ui, sans-serif',
          }}
        >
          <h1 style={{ fontSize: '20px', marginBottom: '8px' }}>Rhythm couldn&apos;t load</h1>
          <p style={{ color: '#8b9cb3', fontSize: '14px', marginBottom: '16px' }}>
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={() => {
              try {
                clearDeviceStorage()
              } catch {
                /* ignore */
              }
              window.location.reload()
            }}
            style={{
              background: '#3dd68c',
              color: '#0a0e14',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 20px',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            Clear data &amp; reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
