import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

const TYPE_EMOJI = { '壽司': '🍣', '飲料': '🧋', '麵包': '🍞', '便當': '🍱', '關東煮': '🍢' };

/* 中原大學附近座標 */
const DEFAULT_LAT = 24.9562;
const DEFAULT_LNG = 121.2424;

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100 bg-gray-50';

/* Nominatim geocoding API */
async function geocodeAddress(address) {
  if (!address) return { lat: DEFAULT_LAT, lng: DEFAULT_LNG };
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`
    );
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch { /* fallback */ }
  return { lat: DEFAULT_LAT, lng: DEFAULT_LNG };
}

export default function StoreLoginPage({ onLogin }) {
  const navigate = useNavigate();
  const [tab, setTab]       = useState('login');
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [allStores, setAllStores] = useState([]);

  /* 登入表單 */
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const setL = (k) => (e) => setLoginForm((f) => ({ ...f, [k]: e.target.value }));

  /* 註冊表單 */
  const [regForm, setRegForm] = useState({
    name: '', username: '', password: '', type: '壽司',
    address: '', phone: '', businessHours: '', email: '',
    lat: DEFAULT_LAT, lng: DEFAULT_LNG,
  });
  const setR = (k) => (e) => setRegForm((f) => ({ ...f, [k]: e.target.value }));

  /* 從 Firestore 讀取所有店家 */
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'stores'));
        const stores = snap.docs.map(d => d.data()).sort((a, b) => (a.name > b.name ? 1 : -1));
        setAllStores(stores);
      } catch { /* 空列表 */ }
    })();
  }, []);

  /* ── 登入 ── */
  const handleLogin = async () => {
    setError(''); setSuccess('');
    if (!loginForm.username || !loginForm.password) { setError('請填寫帳號和密碼'); return; }
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'stores'), where('username', '==', loginForm.username)));
      if (!snap.empty) {
        const data = snap.docs[0].data();
        if (data.password !== loginForm.password) { setError('密碼錯誤'); return; }
        onLogin(data);
        return;
      }
      setError('帳號不存在，請先註冊');
    } catch {
      setError('連線失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  /* ── 註冊 ── */
  const handleRegister = async () => {
    setError(''); setSuccess('');
    if (!regForm.name || !regForm.username || !regForm.password) { setError('請填寫所有必填欄位'); return; }
    if (regForm.password.length < 6) { setError('密碼至少 6 個字元'); return; }
    setLoading(true);
    try {
      /* 檢查帳號是否重複 */
      const snap = await getDocs(query(collection(db, 'stores'), where('username', '==', regForm.username)));
      if (!snap.empty) { setError('此帳號已被使用'); return; }

      /* 地理編碼：若未填經緯度，則用地址查詢 */
      let { lat, lng } = regForm;
      if (!lat || !lng) {
        const coords = await geocodeAddress(regForm.address);
        lat = coords.lat;
        lng = coords.lng;
      }

      console.log(`🏪 新增店家: ${regForm.name} (${regForm.username}) - 座標: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      await addDoc(collection(db, 'stores'), {
        name:          regForm.name,
        username:      regForm.username,
        password:      regForm.password,
        type:          regForm.type,
        address:       regForm.address,
        phone:         regForm.phone,
        businessHours: regForm.businessHours,
        email:         regForm.email,
        lat:           lat,
        lng:           lng,
        registeredAt:  new Date().toISOString(),
      });
      setRegForm({ name: '', username: '', password: '', type: '壽司', address: '', phone: '', businessHours: '', email: '', lat: DEFAULT_LAT, lng: DEFAULT_LNG });
      setTab('login');
      setSuccess('店家帳號建立成功！請登入');
    } catch {
      setError('連線失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter') (tab === 'login' ? handleLogin : handleRegister)(); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900
      flex flex-col items-center justify-center p-5">
      {/* Logo */}
      <div className="text-center mb-8 select-none">
        <div className="text-5xl mb-2">🏪</div>
        <h1 className="text-3xl font-black text-white">店家後台</h1>
        <p className="text-white/50 text-sm mt-1">inochi 惜食平台</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {[['login', '店家登入'], ['register', '店家註冊']].map(([key, label]) => (
            <button key={key}
              onClick={() => { setTab(key); setError(''); setSuccess(''); }}
              className={`flex-1 py-4 text-sm font-bold transition-colors
                ${tab === key ? 'text-slate-800 border-b-2 border-slate-800' : 'text-gray-400'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-3">
          {success && (
            <div className="bg-green-50 text-green-700 text-sm rounded-xl px-4 py-2.5 border border-green-200 flex gap-2">
              ✅ {success}
            </div>
          )}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-2.5 border border-red-100">
              {error}
            </div>
          )}

          {/* ── 登入 ── */}
          {tab === 'login' && (
            <>
              <Field label="店家帳號">
                <select className={inputCls}
                  value={loginForm.username} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value, password: '' })}>
                  <option value="">-- 選擇店家 --</option>
                  {allStores.map((store) => (
                    <option key={store.username} value={store.username}>
                      {TYPE_EMOJI[store.type] || '🏪'} {store.name} ({store.username})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="密碼">
                <input type="password" className={inputCls} placeholder="••••••••"
                  value={loginForm.password} onChange={setL('password')} onKeyDown={handleKey} />
              </Field>

              <button onClick={handleLogin} disabled={loading}
                className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl
                  disabled:opacity-60 transition-all active:scale-[0.98]">
                {loading ? '登入中…' : '店家登入'}
              </button>
            </>
          )}

          {/* ── 註冊 ── */}
          {tab === 'register' && (
            <>
              <Field label="店家名稱 *">
                <input className={inputCls} placeholder="例：美味壽司屋"
                  value={regForm.name} onChange={setR('name')} onKeyDown={handleKey} />
              </Field>
              <Field label="帳號 *">
                <input className={inputCls} placeholder="自訂英數帳號"
                  value={regForm.username} onChange={setR('username')} onKeyDown={handleKey} />
              </Field>
              <Field label="密碼 *">
                <input type="password" className={inputCls} placeholder="至少 6 個字元"
                  value={regForm.password} onChange={setR('password')} onKeyDown={handleKey} />
              </Field>
              <Field label="店家類型 *">
                <input className={inputCls} placeholder="例：壽司、飲料、麵包、便當…"
                  value={regForm.type} onChange={setR('type')} onKeyDown={handleKey} />
              </Field>
              <Field label="地址">
                <input className={inputCls} placeholder="例：台北市中正區XX路1號"
                  value={regForm.address} onChange={setR('address')} onKeyDown={handleKey} />
              </Field>
              <Field label="電話">
                <input className={inputCls} placeholder="例：02-12345678"
                  value={regForm.phone} onChange={setR('phone')} onKeyDown={handleKey} />
              </Field>
              <Field label="營業時間">
                <input className={inputCls} placeholder="例：11:00 – 21:00"
                  value={regForm.businessHours} onChange={setR('businessHours')} onKeyDown={handleKey} />
              </Field>
              <Field label="電子信箱">
                <input type="email" className={inputCls} placeholder="例：store@email.com"
                  value={regForm.email} onChange={setR('email')} onKeyDown={handleKey} />
              </Field>
              <Field label="緯度（可選，未填時用地址查詢）">
                <input type="number" step="0.0001" className={inputCls} placeholder="例：24.9562"
                  value={regForm.lat} onChange={setR('lat')} onKeyDown={handleKey} />
              </Field>
              <Field label="經度（可選，未填時用地址查詢）">
                <input type="number" step="0.0001" className={inputCls} placeholder="例：121.2424"
                  value={regForm.lng} onChange={setR('lng')} onKeyDown={handleKey} />
              </Field>

              <button onClick={handleRegister} disabled={loading}
                className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl
                  disabled:opacity-60 transition-all active:scale-[0.98]">
                {loading ? '處理中…' : '建立店家帳號'}
              </button>
            </>
          )}

          <div className="text-center pt-1">
            <button onClick={() => navigate('/')}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              ← 返回會員登入
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
