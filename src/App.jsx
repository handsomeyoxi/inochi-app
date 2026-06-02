import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { collection, getDocs, query, where, updateDoc, doc, addDoc } from 'firebase/firestore';
import { db, fillMissingCoordinates } from './firebase';
import MapPage from './pages/MapPage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import StoreLoginPage from './pages/StoreLoginPage';
import StoreDashboard from './pages/StoreDashboard';
import AdminPage from './pages/AdminPage';

/* 5 間預設店家的正確座標 */
const DEFAULT_STORES_COORDS = [
  { username: 'sushi01', lat: 24.9578, lng: 121.2401 },
  { username: 'drink01', lat: 24.9562, lng: 121.2389 },
  { username: 'bread01', lat: 24.9551, lng: 121.2412 },
  { username: 'bento01', lat: 24.9588, lng: 121.2398 },
  { username: 'oden01',  lat: 24.9544, lng: 121.2425 },
];

/* 初始化店家座標 */
async function initializeStores() {
  console.log('🏪 開始初始化店家座標...');
  try {
    for (const store of DEFAULT_STORES_COORDS) {
      const snap = await getDocs(query(collection(db, 'stores'), where('username', '==', store.username)));
      if (!snap.empty) {
        const docRef = snap.docs[0].ref;
        const data = snap.docs[0].data();

        // 檢查座標是否已正確設置
        if (data.lat !== store.lat || data.lng !== store.lng) {
          await updateDoc(docRef, { lat: store.lat, lng: store.lng });
          console.log(`✅ 更新 ${data.name || store.username} 座標: ${store.lat}, ${store.lng}`);
        } else {
          console.log(`✓ ${data.name || store.username} 座標已正確: ${store.lat}, ${store.lng}`);
        }
      }
    }
    console.log('✅ 店家座標初始化完成');
  } catch (err) {
    console.error('❌ 初始化店家座標失敗:', err);
  }
}

/* 修復超過 200 分的積分 */
async function fixCreditScores() {
  console.log('💯 開始檢查並修復積分上限...');
  try {
    const snap = await getDocs(collection(db, 'users'));
    const updates = [];
    snap.docs.forEach(docSnap => {
      const data = docSnap.data();
      if (data.creditScore && data.creditScore > 200) {
        updates.push(updateDoc(docSnap.ref, { creditScore: 200 }));
        console.log(`📌 修復 ${data.name || data.studentId} 的積分：${data.creditScore} → 200`);
      }
    });
    if (updates.length > 0) {
      await Promise.all(updates);
      console.log(`✅ 積分修復完成：${updates.length} 位使用者`);
    }
  } catch (err) {
    console.error('❌ 修復積分失敗:', err);
  }
}

const NAV = [
  { to: '/',        end: true,  icon: '🗺️', label: '地圖' },
  { to: '/cart',    end: false, icon: '🛒', label: '購物車' },
  { to: '/profile', end: false, icon: '👤', label: '我的' },
];

function Shell({ user, onLogout }) {
  return (
    <div className="flex flex-col w-full h-full max-w-md mx-auto bg-gray-50 overflow-hidden shadow-2xl">
      <div className="flex-1 overflow-hidden relative">
        <Routes>
          <Route path="/"         element={<MapPage />} />
          <Route path="/products" element={<ProductPage />} />
          <Route path="/cart"     element={<CartPage />} />
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
  const { pathname } = useLocation();
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('inochi_user') || 'null'); } catch { return null; }
  });
  const [storeAuth, setStoreAuth] = useState(() => {
    try { return JSON.parse(localStorage.getItem('inochi_store_auth') || 'null'); } catch { return null; }
  });

  /* 應用啟動時初始化店家座標（只執行一次） */
  useEffect(() => {
    initializeStores();
    fillMissingCoordinates();
    fixCreditScores();
  }, []);

  /* Admin is always accessible regardless of other auth state */
  if (pathname === '/admin') return <AdminPage />;

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
