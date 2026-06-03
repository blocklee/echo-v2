import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import JingPage from './pages/JingPage';
import DianPage from './pages/DianPage';
import YuanPage from './pages/YuanPage';
import JingCompPage from './pages/JingCompPage';
import WalletBar from './components/WalletBar';
import ErrorBoundary from './components/ErrorBoundary';
import { WalletProvider } from './contexts/WalletContext';

const navLinkBase = 'relative text-[#6B665C] hover:text-[#2D2A26] transition-colors duration-200 py-1';
const navLinkActive = 'text-[#2D2A26] font-medium';

function PageWrapper({ children }) {
  const [fade, setFade] = useState(false);
  useEffect(() => { setFade(true); return () => setFade(false); }, []);
  return (
    <div className={`transition-all duration-300 ease-out ${fade ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
      {children}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <WalletProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-[#FAF9F7] text-[#2D2A26]">
            <nav className="border-b border-[#E5E2DC] px-6 py-3 flex items-center gap-6">
              <span className="font-bold text-lg tracking-wider text-[#2D2A26]">⚡ ECHO</span>
              <NavLink to="/jing" className={({ isActive }) => `${navLinkBase} ${isActive ? navLinkActive : ''}`}>
                {({ isActive }) => (
                  <span className="relative">
                    境
                    <span className={`absolute left-0 -bottom-0.5 h-0.5 bg-[#6B9E87] transition-all duration-300 ease-out ${isActive ? 'w-full' : 'w-0'}`} />
                  </span>
                )}
              </NavLink>
              <NavLink to="/dian" className={({ isActive }) => `${navLinkBase} ${isActive ? navLinkActive : ''}`}>
                {({ isActive }) => (
                  <span className="relative">
                    典
                    <span className={`absolute left-0 -bottom-0.5 h-0.5 bg-[#6B9E87] transition-all duration-300 ease-out ${isActive ? 'w-full' : 'w-0'}`} />
                  </span>
                )}
              </NavLink>
              <NavLink to="/yuan" className={({ isActive }) => `${navLinkBase} ${isActive ? navLinkActive : ''}`}>
                {({ isActive }) => (
                  <span className="relative">
                    源
                    <span className={`absolute left-0 -bottom-0.5 h-0.5 bg-[#6B9E87] transition-all duration-300 ease-out ${isActive ? 'w-full' : 'w-0'}`} />
                  </span>
                )}
              </NavLink>
              <NavLink to="/jing-comp" className={({ isActive }) => `${navLinkBase} ${isActive ? navLinkActive : ''}`}>
                {({ isActive }) => (
                  <span className="relative">
                    竞
                    <span className={`absolute left-0 -bottom-0.5 h-0.5 bg-[#6B9E87] transition-all duration-300 ease-out ${isActive ? 'w-full' : 'w-0'}`} />
                  </span>
                )}
              </NavLink>
              <div className="ml-auto"><WalletBar /></div>
            </nav>
            <Routes>
              <Route path="/jing" element={<PageWrapper><JingPage /></PageWrapper>} />
              <Route path="/dian" element={<PageWrapper><DianPage /></PageWrapper>} />
              <Route path="/yuan" element={<PageWrapper><YuanPage /></PageWrapper>} />
              <Route path="/jing-comp" element={<PageWrapper><JingCompPage /></PageWrapper>} />
              <Route path="*" element={<PageWrapper><JingPage /></PageWrapper>} />
            </Routes>
          </div>
        </BrowserRouter>
      </WalletProvider>
    </ErrorBoundary>
  );
}

export default App;
