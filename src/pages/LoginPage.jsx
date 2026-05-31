import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

function Field({ label, ...rest }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      <input
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800
          outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 bg-gray-50 transition-all"
        {...rest}
      />
    </div>
  );
}

export default function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ studentId: '', name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => {
    setSuccess('');
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  const handleLogin = async () => {
    setError('');
    if (!form.studentId || !form.password) { setError('請填寫學號和密碼'); return; }
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'users'), where('studentId', '==', form.studentId))
      );
      if (snap.empty) { setError('帳號不存在，請先註冊'); return; }
      const userData = snap.docs[0].data();
      if (userData.password !== form.password) { setError('密碼錯誤'); return; }
      onLogin(userData);
    } catch {
      setError('連線失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError('');
    if (!form.studentId || !form.name || !form.email || !form.password) {
      setError('請填寫所有欄位'); return;
    }
    if (form.password.length < 6) { setError('密碼至少 6 個字元'); return; }
    if (form.password !== form.confirm) { setError('兩次密碼不一致'); return; }
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'users'), where('studentId', '==', form.studentId))
      );
      if (!snap.empty) { setError('此學號已被註冊'); return; }
      const newUser = {
        studentId: form.studentId,
        name: form.name,
        email: form.email,
        password: form.password,
        registeredAt: new Date().toISOString(),
        creditScore: 100,
      };
      await addDoc(collection(db, 'users'), newUser);
      setForm({ studentId: form.studentId, name: '', email: '', password: '', confirm: '' });
      setTab('login');
      setSuccess('註冊成功！請登入');
    } catch {
      setError('連線失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const submit = tab === 'login' ? handleLogin : handleRegister;

  const handleKey = (e) => { if (e.key === 'Enter') submit(); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-300
      flex flex-col items-center justify-center p-5">
      {/* Logo */}
      <div className="text-center mb-8 select-none">
        <div className="text-6xl mb-2 drop-shadow-lg">🌿</div>
        <h1 className="text-4xl font-black text-white tracking-tight drop-shadow">inochi</h1>
        <p className="text-white/75 text-sm mt-1 font-medium">惜食平台，讓美食不浪費</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {[['login', '會員登入'], ['register', '會員註冊']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setTab(key); setError(''); setSuccess(''); }}
              className={`flex-1 py-4 text-sm font-bold transition-colors
                ${tab === key ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-3">
          {success && (
            <div className="bg-green-50 text-green-700 text-sm rounded-xl px-4 py-2.5 border border-green-200 flex items-center gap-2">
              <span>✅</span>{success}
            </div>
          )}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-2.5 border border-red-100">
              {error}
            </div>
          )}

          {tab === 'register' && (
            <>
              <Field label="姓名" placeholder="王小明" value={form.name} onChange={set('name')} onKeyDown={handleKey} />
              <Field label="Email" type="email" placeholder="b1234567@cycu.edu.tw" value={form.email} onChange={set('email')} onKeyDown={handleKey} />
            </>
          )}
          <Field label="學號" placeholder="B1234XXXX" value={form.studentId} onChange={set('studentId')} onKeyDown={handleKey} />
          <Field label="密碼" type="password" placeholder="••••••••" value={form.password} onChange={set('password')} onKeyDown={handleKey} />
          {tab === 'register' && (
            <Field label="確認密碼" type="password" placeholder="••••••••" value={form.confirm} onChange={set('confirm')} onKeyDown={handleKey} />
          )}

          <button
            onClick={submit}
            disabled={loading}
            className="w-full py-3.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl text-base
              disabled:opacity-60 transition-all active:scale-[0.98] mt-1"
          >
            {loading ? '請稍候…' : tab === 'login' ? '登入' : '建立帳號'}
          </button>

          <div className="border-t border-gray-100 pt-3 space-y-2 text-center">
            <button
              onClick={() => navigate('/store/login')}
              className="text-xs text-gray-400 hover:text-primary transition-colors font-medium block w-full"
            >
              🏪 店家後台登入
            </button>
            <button
              onClick={() => navigate('/admin')}
              className="text-sm text-gray-500 hover:text-primary font-medium transition-colors block w-full"
            >
              🔧 管理員後台
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
