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
        <div className="min-h-screen bg-[#FAF9F7] text-[#2D2A26] flex items-center justify-center p-8">
          <div className="bg-white border border-[#E5E2DC] rounded-lg p-6 max-w-md">
            <h2 className="text-xl font-bold text-[#C46B6B] mb-2">系统异常</h2>
            <p className="text-[#6B665C] text-sm mb-4">合约调用或渲染过程中发生错误，请刷新重试。</p>
            <pre className="text-xs text-[#C46B6B] bg-[#F2F0ED] p-3 rounded overflow-auto">{this.state.error?.message}</pre>
            <button onClick={() => window.location.reload()} className="mt-4 text-sm border border-[#E5E2DC] px-3 py-1.5 rounded hover:border-[#2D2A26] transition-colors">刷新页面</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
