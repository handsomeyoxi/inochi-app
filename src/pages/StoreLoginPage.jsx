import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

/* 白名單：既有帳號可自動移轉到 Firestore */
const STORE_ACCOUNTS = [
  { username: 'sushi01', password: '12345678', name: '濱海迴轉壽司', type: '壽司' },
  { username: 'drink01', password: '12345678', name: '小Q飲料坊',    type: '飲料' },
  { username: 'bread01', password: '12345678', name: '老師傅麵包坊', type: '麵包' },
  { username: 'bento01', password: '12345678', name: '阿嬤的便當',   type: '便當' },
  { username: 'oden01',  password: '12345678', name: '熱呼呼關東煮', type: '關東煮' },
];

const TYPE_EMOJI = { '壽司': '🍣', '飲料': '🧋', '麵包': '🍞', '便當': '🍱', '關東煮': '🍢' };

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100 bg-gray-50';

export default function StoreLoginPage({ onLogin }) {
  const navigate = useNavigate();
  const [tab, setTab]       = useState('login');
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  /* 登入表單 */
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const setL = (k) => (e) => setLoginForm((f) => ({ ...f, [k]: e.target.value }));

  /* 註冊表單 */
  const [regForm, setRegForm] = useState({ name: '', username: '', password: '', type: '壽司' });
  const setR = (k) => (e) => setRegForm((f) => ({ ...f, [k]: e.target.value }));

  /* ── 登入 ── */
  const handleLogin = async () => {
    setError(''); setSuccess('');
    if (!loginForm.username || !loginForm.password) { setError('請填寫帳號和密碼'); return; }
    setLoading(true);
    try {
      /* 先查 Firestore */
      const snap = await getDocs(query(collection(db, 'stores'), where('username', '==', loginForm.username)));
      if (!snap.empty) {
        const data = snap.docs[0].data();
        if (data.password !== loginForm.password) { setError('密碼錯誤'); return; }
        onLogin(data);
        return;
      }
      /* Fallback：白名單自動移轉到 Firestore */
      const matched = STORE_ACCOUNTS.find((a) => a.username === loginForm.username);
      if (!matched) { setError('無店家權限，請先註冊'); return; }
      if (matched.password !== loginForm.password) { setError('密碼錯誤'); return; }
      const storeData = { ...matched, registeredAt: new Date().toISOString() };
      await addDoc(collection(db, 'stores'), storeData);
      onLogin(storeData);
    } catch {
      setError('連線失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  /* ── 註冊 ── */
  const handleRegister = async () => {
    setError(''); setSuccess('');
    if (!regForm.name || !regForm.username || !regForm.password) { setError('請填寫所有欄位'); return; }
    if (regForm.password.length < 6) { setError('密碼至少 6 個字元'); return; }
    setLoading(true);
    try {
      /* 檢查 Firestore 是否重複 */
      const snap = await getDocs(query(collection(db, 'stores'), where('username', '==', regForm.username)));
      if (!snap.empty) { setError('此帳號已被使用'); return; }
      /* 檢查白名單是否重複 */
      if (STORE_ACCOUNTS.some((a) => a.username === regForm.username)) { setError('此帳號已被使用'); return; }

      await addDoc(collection(db, 'stores'), {
        name: regForm.name,
        username: regForm.username,
        password: regForm.password,
        type: regForm.type,
        registeredAt: new Date().toISOString(),
      });
      setRegForm({ name: '', username: '', password: '', type: '壽司' });
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
                <input className={inputCls} placeholder="sushi01"
                  value={loginForm.username} onChange={setL('username')} onKeyDown={handleKey} />
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

              {/* Demo hints */}
              <div className="bg-gray-50 rounded-2xl p-3">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  預設店家帳號（點擊填入）
                </p>
                <div className="space-y-1">
                  {STORE_ACCOUNTS.map((a) => (
                    <button key={a.username}
                      onClick={() => setLoginForm({ username: a.username, password: '' })}
                      className="w-full text-left text-xs text-gray-600 hover:text-primary
                        px-3 py-1.5 rounded-xl hover:bg-orange-50 transition-colors flex items-center gap-2">
                      <span>{TYPE_EMOJI[a.type]}</span>
                      <span className="flex-1">{a.name}</span>
                      <span className="font-mono text-gray-400">{a.username}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── 註冊 ── */}
          {tab === 'register' && (
            <>
              <Field label="店家名稱">
                <input className={inputCls} placeholder="例：美味壽司屋"
                  value={regForm.name} onChange={setR('name')} onKeyDown={handleKey} />
              </Field>
              <Field label="帳號">
                <input className={inputCls} placeholder="自訂英數帳號"
                  value={regForm.username} onChange={setR('username')} onKeyDown={handleKey} />
              </Field>
              <Field label="密碼">
                <input type="password" className={inputCls} placeholder="至少 6 個字元"
                  value={regForm.password} onChange={setR('password')} onKeyDown={handleKey} />
              </Field>
              <Field label="店家類型">
                <input className={inputCls} placeholder="例：壽司、飲料、麵包、便當…"
                  value={regForm.type} onChange={setR('type')} onKeyDown={handleKey} />
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
