
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
          <div className="bg-bg-secondary border border-border-primary p-8 rounded-3xl max-w-md w-full shadow-2xl text-center">
            <div className="w-16 h-16 bg-danger/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-black mb-4 uppercase italic tracking-tighter">Algo salió mal</h1>
            <p className="text-text-secondary text-sm mb-8 leading-relaxed">
              Ha ocurrido un error inesperado en la aplicación. Hemos guardado tu progreso localmente.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-accent-primary text-bg-primary font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition shadow-glow-primary active:scale-95"
            >
              Recargar Aplicación
            </button>
            {this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-[10px] text-text-secondary cursor-pointer uppercase font-bold tracking-widest hover:text-text-primary transition-colors">Ver detalles técnicos</summary>
                <pre className="mt-2 p-3 bg-bg-primary rounded-lg text-[10px] text-danger overflow-auto max-h-32 border border-border-primary">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
