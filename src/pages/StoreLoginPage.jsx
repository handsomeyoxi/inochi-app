import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const STORE_ACCOUNTS = [
  { id: 1, username: 'sushi01', password: '12345678', name: '濱海迴轉壽司', type: '壽司' },
  { id: 2, username: 'drink01', password: '12345678', name: '小Q飲料坊',    type: '飲料' },
  { id: 3, username: 'bread01', password: '12345678', name: '老師傅麵包坊', type: '麵包' },
  { id: 4, username: 'bento01', password: '12345678', name: '阿嬤的便當',   type: '便當' },
  { id: 5, username: 'oden01',  password: '12345678', name: '熱呼呼關東煮', type: '關東煮' },
];

const TYPE_EMOJI = { '壽司': '🍣', '飲料': '🧋', '麵包': '🍞', '便當': '🍱', '關東煮': '🍢' };

export default function StoreLoginPage({ onLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleLogin = () => {
    setError('');
    if (!form.username || !form.password) { setError('請填寫帳號和密碼'); return; }
    const matched = STORE_ACCOUNTS.find((a) => a.username === form.username);
    if (!matched) { setError('無店家權限'); return; }
    if (matched.password !== form.password) { setError('密碼錯誤'); return; }
    setLoading(true);
    setTimeout(() => { onLogin(matched); setLoading(false); }, 500);
  };

  const handleKey = (e) => { if (e.key === 'Enter') handleLogin(); };

  const fillDemo = (a) => setForm({ username: a.username, password: '' });

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
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6">
        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-2.5 border border-red-100 mb-4">
            {error}
          </div>
        )}

        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">店家帳號</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none
                focus:border-slate-500 focus:ring-2 focus:ring-slate-100 bg-gray-50"
              placeholder="sushi01"
              value={form.username}
              onChange={set('username')}
              onKeyDown={handleKey}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">密碼</label>
            <input
              type="password"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none
                focus:border-slate-500 focus:ring-2 focus:ring-slate-100 bg-gray-50"
              placeholder="••••"
              value={form.password}
              onChange={set('password')}
              onKeyDown={handleKey}
            />
          </div>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl
            mb-4 disabled:opacity-60 transition-all active:scale-[0.98]"
        >
          {loading ? '登入中…' : '店家登入'}
        </button>

        {/* Demo credentials */}
        <div className="bg-gray-50 rounded-2xl p-3 mb-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            店家帳號（點擊自動填入）
          </p>
          <div className="space-y-1">
            {STORE_ACCOUNTS.map((a) => (
              <button
                key={a.id}
                onClick={() => fillDemo(a)}
                className="w-full text-left text-xs text-gray-600 hover:text-primary
                  px-3 py-1.5 rounded-xl hover:bg-orange-50 transition-colors flex items-center gap-2"
              >
                <span>{TYPE_EMOJI[a.type]}</span>
                <span className="flex-1">{a.name}</span>
                <span className="font-mono text-gray-400">{a.username}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => navigate('/')}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← 返回會員登入
          </button>
        </div>
      </div>
    </div>
  );
}
