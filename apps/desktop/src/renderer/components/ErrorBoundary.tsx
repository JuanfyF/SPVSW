import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-error mb-4" />
          <h2 className="text-lg font-bold text-on-surface mb-2">
            Algo salió mal
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-md">
            {this.state.error?.message || "Ocurrió un error inesperado"}
          </p>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-on-secondary rounded-xl hover:bg-secondary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
