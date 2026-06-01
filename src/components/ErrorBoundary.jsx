import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-8">
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-6 max-w-md">
            <h2 className="text-xl font-bold text-red-300 mb-2">系统异常</h2>
            <p className="text-neutral-400 text-sm mb-4">合约调用或渲染过程中发生错误，请刷新重试。</p>
            <pre className="text-xs text-red-400 bg-red-950/50 p-3 rounded overflow-auto">{this.state.error?.message}</pre>
            <button onClick={() => window.location.reload()} className="mt-4 text-sm bg-red-800 hover:bg-red-700 px-3 py-1.5 rounded">刷新页面</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
