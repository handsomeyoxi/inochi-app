import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const ADMIN_CREDENTIAL = { username: 'admin', password: '12345678' };

const STORE_ACCOUNTS = [
  { id: 1, username: 'sushi01', name: '濱海迴轉壽司', type: '壽司' },
  { id: 2, username: 'drink01', name: '小Q飲料坊',    type: '飲料' },
  { id: 3, username: 'bread01', name: '老師傅麵包坊', type: '麵包' },
  { id: 4, username: 'bento01', name: '阿嬤的便當',   type: '便當' },
  { id: 5, username: 'oden01',  name: '熱呼呼關東煮', type: '關東煮' },
];

const TYPE_EMOJI = { '壽司': '🍣', '飲料': '🧋', '麵包': '🍞', '便當': '🍱', '關東煮': '🍢' };

const MOCK_TOTAL_ORDERS = 28;

/* ── 格式化時間 ── */
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/* ── 信用積點色碼 ── */
function ScoreBadge({ score }) {
  const cls = score >= 80
    ? 'bg-green-100 text-green-700'
    : score >= 60
    ? 'bg-yellow-100 text-yellow-700'
    : 'bg-red-100 text-red-600';
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cls}`}>{score ?? 100}</span>
  );
}

/* ══════════════════════════════════════════
   登入畫面
══════════════════════════════════════════ */
function AdminLogin({ onLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleLogin = () => {
    setError('');
    if (!form.username || !form.password) { setError('請填寫帳號和密碼'); return; }
    if (form.username !== ADMIN_CREDENTIAL.username) { setError('帳號不存在'); return; }
    if (form.password !== ADMIN_CREDENTIAL.password) { setError('密碼錯誤'); return; }
    setLoading(true);
    setTimeout(() => { onLogin(); setLoading(false); }, 400);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-slate-800
      flex flex-col items-center justify-center p-5">
      <div className="text-center mb-8 select-none">
        <div className="text-4xl mb-2">🔐</div>
        <h1 className="text-2xl font-black text-white tracking-tight">管理員後台</h1>
        <p className="text-white/40 text-xs mt-1">inochi · 系統管理</p>
      </div>

      <div className="w-full max-w-xs bg-white rounded-2xl shadow-2xl p-6">
        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-2.5 border border-red-100 mb-4">
            {error}
          </div>
        )}
        <div className="space-y-3 mb-5">
          {[
            { k: 'username', label: '管理員帳號', type: 'text',     placeholder: 'admin' },
            { k: 'password', label: '密碼',       type: 'password', placeholder: '••••••••' },
          ].map(({ k, label, type, placeholder }) => (
            <div key={k}>
              <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
              <input
                type={type}
                placeholder={placeholder}
                value={form[k]}
                onChange={set(k)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none
                  focus:border-slate-500 bg-gray-50"
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-3 bg-slate-900 hover:bg-black text-white font-bold rounded-xl mb-4
            disabled:opacity-50 transition-all active:scale-[0.98]"
        >
          {loading ? '驗證中…' : '登入管理後台'}
        </button>

        <div className="text-center">
          <button
            onClick={() => navigate('/')}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← 返回
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   管理儀表板
══════════════════════════════════════════ */
function AdminDashboard({ onLogout }) {
  const [tab, setTab] = useState('students');
  const [students, setStudents] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        setStudents(snap.docs.map((d) => d.data()));
      } catch {
        setFetchError('無法讀取資料，請檢查網路連線');
      } finally {
        setLoadingData(false);
      }
    })();
  }, []);

  return (
    <div className="w-full h-screen max-w-md mx-auto flex flex-col bg-gray-50 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-slate-800 px-4 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-lg">🔐</div>
            <div>
              <div className="text-white font-black text-sm">管理員後台</div>
              <div className="text-white/40 text-[11px]">inochi 系統管理</div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="text-white/50 hover:text-white text-xs border border-white/15 hover:border-white/40
              px-3 py-1.5 rounded-xl transition-all"
          >
            登出
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 shrink-0">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: '已註冊用戶', value: students.length, icon: '👥' },
            { label: '合作店家',   value: STORE_ACCOUNTS.length, icon: '🏪' },
            { label: '累計訂單',   value: MOCK_TOTAL_ORDERS, icon: '📋' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-2.5 text-center">
              <div className="text-lg mb-0.5">{icon}</div>
              <div className="text-xl font-black text-gray-800">{value}</div>
              <div className="text-[10px] text-gray-400">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-gray-100 shrink-0">
        {[['students', '學生帳號'], ['stores', '店家帳號']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-3.5 text-sm font-bold transition-colors
              ${tab === key ? 'text-slate-800 border-b-2 border-slate-800' : 'text-gray-400'}`}
          >
            {label}
            {key === 'students' && (
              <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-semibold">
                {students.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">

        {/* ── 學生帳號 ── */}
        {tab === 'students' && (
          <>
            {loadingData && (
              <div className="text-center text-gray-400 py-12 text-sm">
                <div className="text-4xl mb-3 animate-spin">⏳</div>
                讀取資料中…
              </div>
            )}
            {fetchError && (
              <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 border border-red-100">
                {fetchError}
              </div>
            )}
            {!loadingData && !fetchError && students.length === 0 && (
              <div className="text-center text-gray-400 py-12 text-sm">
                <div className="text-4xl mb-3">📭</div>
                尚無已註冊的學生帳號
              </div>
            )}
            {!loadingData && !fetchError && students.map((u, i) => (
                <div key={u.studentId} className="bg-white rounded-2xl shadow-sm p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-lg shrink-0">
                        👤
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-800">{u.name}</div>
                        <div className="text-xs text-gray-400 font-mono">{u.studentId}</div>
                      </div>
                    </div>
                    <ScoreBadge score={u.creditScore} />
                  </div>

                  <div className="space-y-1 mt-2">
                    {u.email && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="text-gray-300">✉</span>
                        <span className="truncate">{u.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="text-gray-300">🕐</span>
                      <span>註冊時間：{fmtDate(u.registeredAt)}</span>
                    </div>
                  </div>
                </div>
            ))}
          </>
        )}

        {/* ── 店家帳號 ── */}
        {tab === 'stores' && (
          <>
            {STORE_ACCOUNTS.map((s) => (
              <div key={s.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-orange-50 flex items-center justify-center text-2xl shrink-0">
                  {TYPE_EMOJI[s.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-800">{s.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    <span className="font-mono">{s.username}</span>
                    <span className="mx-1.5 text-gray-200">·</span>
                    <span>{s.type}</span>
                  </div>
                </div>
                <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full shrink-0">
                  授權
                </span>
              </div>
            ))}
            <div className="text-center text-[11px] text-gray-300 py-2">
              店家帳號由系統白名單控管，不開放自行申請
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   主元件（內部管理 admin 登入狀態）
══════════════════════════════════════════ */
export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />;
  return <AdminDashboard onLogout={() => setAuthed(false)} />;
}
