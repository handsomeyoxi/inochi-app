import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import MapPage from './pages/MapPage';
import ProductPage from './pages/ProductPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import StoreLoginPage from './pages/StoreLoginPage';
import StoreDashboard from './pages/StoreDashboard';

const NAV = [
  { to: '/',         end: true,  icon: '🗺️',  label: '地圖' },
  { to: '/products', end: false, icon: '🛍️',  label: '商品' },
  { to: '/profile',  end: false, icon: '👤',  label: '我的' },
];

function Shell({ user, onLogout }) {
  return (
    <div className="flex flex-col w-full h-full max-w-md mx-auto bg-gray-50 overflow-hidden shadow-2xl">
      <div className="flex-1 overflow-hidden relative">
        <Routes>
          <Route path="/"         element={<MapPage />} />
          <Route path="/products" element={<ProductPage />} />
          <Route path="/profile"  element={<ProfilePage user={user} onLogout={onLogout} />} />
          <Route path="*"         element={<MapPage />} />
        </Routes>
      </div>
      <nav className="shrink-0 flex bg-white border-t border-gray-100 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
        {NAV.map(({ to, end, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors duration-150
              ${isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`
            }
          >
            <span className="text-2xl leading-none">{icon}</span>
            <span className="text-[11px] font-semibold">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function AppContent() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('inochi_user') || 'null'); } catch { return null; }
  });
  const [storeAuth, setStoreAuth] = useState(() => {
    try { return JSON.parse(localStorage.getItem('inochi_store_auth') || 'null'); } catch { return null; }
  });

  const loginUser = (u) => {
    localStorage.setItem('inochi_user', JSON.stringify(u));
    setUser(u);
  };
  const logoutUser = () => {
    localStorage.removeItem('inochi_user');
    setUser(null);
  };
  const loginStore = (s) => {
    localStorage.setItem('inochi_store_auth', JSON.stringify(s));
    setStoreAuth(s);
  };
  const logoutStore = () => {
    localStorage.removeItem('inochi_store_auth');
    setStoreAuth(null);
  };

  /* Store staff authenticated */
  if (storeAuth) {
    return <StoreDashboard storeAuth={storeAuth} onLogout={logoutStore} />;
  }

  /* Not authenticated → show login/register */
  if (!user) {
    return (
      <Routes>
        <Route path="/store/login" element={<StoreLoginPage onLogin={loginStore} />} />
        <Route path="*"            element={<LoginPage onLogin={loginUser} />} />
      </Routes>
    );
  }

  /* User authenticated → show main app */
  return <Shell user={user} onLogout={logoutUser} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
