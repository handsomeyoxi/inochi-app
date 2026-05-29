import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import MapPage from './pages/MapPage';
import ProductPage from './pages/ProductPage';
import ProfilePage from './pages/ProfilePage';

const NAV = [
  { to: '/',         end: true,  icon: '🗺️',  label: '地圖' },
  { to: '/products', end: false, icon: '🛍️',  label: '商品' },
  { to: '/profile',  end: false, icon: '👤',  label: '我的' },
];

function Shell() {
  return (
    <div className="flex flex-col w-full h-full max-w-md mx-auto bg-gray-50 overflow-hidden shadow-2xl">
      {/* Page area */}
      <div className="flex-1 overflow-hidden relative">
        <Routes>
          <Route path="/"         element={<MapPage />} />
          <Route path="/products" element={<ProductPage />} />
          <Route path="/profile"  element={<ProfilePage />} />
        </Routes>
      </div>

      {/* Bottom navigation */}
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

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
