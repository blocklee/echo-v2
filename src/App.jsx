import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import JingPage from './pages/JingPage';
import DianPage from './pages/DianPage';
import YuanPage from './pages/YuanPage';
import JingCompPage from './pages/JingCompPage';
import WalletBar from './components/WalletBar';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div className="min-h-screen bg-neutral-950 text-white">
          <nav className="border-b border-neutral-800 px-6 py-3 flex items-center gap-6">
            <span className="font-bold text-lg tracking-wider">ECHO</span>
            <Link to="/jing" className="text-neutral-400 hover:text-white transition-colors duration-200">境</Link>
            <Link to="/dian" className="text-neutral-400 hover:text-white transition-colors duration-200">典</Link>
            <Link to="/yuan" className="text-neutral-400 hover:text-white transition-colors duration-200">源</Link>
            <Link to="/jing-comp" className="text-neutral-400 hover:text-white transition-colors duration-200">竞</Link>
            <div className="ml-auto"><WalletBar /></div>
          </nav>
          <Routes>
            <Route path="/jing" element={<JingPage />} />
            <Route path="/dian" element={<DianPage />} />
            <Route path="/yuan" element={<YuanPage />} />
            <Route path="/jing-comp" element={<JingCompPage />} />
            <Route path="*" element={<JingPage />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
