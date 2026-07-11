import { Component, ReactNode } from 'react';

interface State { error: Error | null }

/** Top-level error boundary — a single render/query throw must not
 *  white-screen the whole app (ultra-review HIGH #4). */
export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('AppErrorBoundary:', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0b', color: '#f4f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <div style={{ fontSize: 34, marginBottom: 12 }}>😵‍💫</div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Nešto se zaglavilo.</div>
          <div style={{ fontSize: 13, color: '#86868e', marginTop: 6 }}>Noć ide dalje — osveži pa nastavljamo.</div>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            style={{ marginTop: 18, padding: '12px 24px', borderRadius: 12, border: 0, cursor: 'pointer', background: '#ff4d8d', color: '#3a0f22', fontWeight: 700, fontSize: 14 }}
          >
            Osveži
          </button>
        </div>
      </div>
    );
  }
}
