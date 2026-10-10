import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("React Error caught by boundary:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 800, margin: '60px auto', background: '#fff', border: '1px solid #e5e5e5', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 28 }}>⚠️</span>
            <div>
              <h2 style={{ color: '#e11d48', margin: 0, fontSize: 18, fontWeight: 700 }}>Aviso en la interfaz</h2>
              <p style={{ color: '#666', fontSize: 12, margin: '4px 0 0' }}>Se ha interceptado una anomalía de renderizado en lugar de cerrar la aplicación:</p>
            </div>
          </div>
          <pre style={{ background: '#fef2f2', padding: 16, borderRadius: 8, overflowX: 'auto', fontSize: 12, color: '#991b1b', border: '1px solid #fee2e2', lineHeight: 1.5 }}>
            {this.state.error?.stack || this.state.error?.message || String(this.state.error)}
          </pre>
          <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
            <button 
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }} 
              style={{ padding: '8px 18px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
            >
              Recargar Vista
            </button>
            <button 
              onClick={() => { localStorage.clear(); window.location.reload(); }} 
              style={{ padding: '8px 18px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontWeight: 500, fontSize: 13 }}
            >
              Limpiar Caché y Reiniciar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
