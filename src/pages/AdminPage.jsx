import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const ADMIN_CREDENTIAL = { username: 'admin', password: '12345678' };

const TYPE_EMOJI = { '壽司': '🍣', '飲料': '🧋', '麵包': '🍞', '便當': '🍱', '關東煮': '🍢' };

const STATUS_CLS = {
  已完成: 'bg-green-100 text-green-700',
  已取消: 'bg-red-100 text-red-600',
  待取餐: 'bg-orange-100 text-orange-700',
};

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} `
    + `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function ScoreBadge({ score }) {
  const cls = score >= 80 ? 'bg-green-100 text-green-700'
    : score >= 60 ? 'bg-yellow-100 text-yellow-700'
    : 'bg-red-100 text-red-600';
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cls}`}>{score ?? 100}</span>;
}

/* ── 可展開區塊 ── */
function Accordion({ icon, title, count, expanded, onToggle, loading, error, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{icon}</span>
          <span className="font-bold text-gray-800 text-sm">{title}</span>
          {count != null && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-semibold">{count}</span>
          )}
        </div>
        <span className="text-gray-400 text-xs">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-3">
          {loading && <div className="text-center text-gray-400 py-6 text-sm">載入中…</div>}
          {error  && <div className="bg-red-50 text-red-500 text-sm rounded-xl px-4 py-2.5">{error}</div>}
          {!loading && !error && children}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   登入畫面（樣式同 StoreLoginPage）
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
    <div className="min-h-screen bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900
      flex flex-col items-center justify-center p-5">
      <div className="text-center mb-8 select-none">
        <div className="text-5xl mb-2">🔐</div>
        <h1 className="text-3xl font-black text-white">管理員後台</h1>
        <p className="text-white/50 text-sm mt-1">inochi 系統管理</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6">
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
              <input type={type} placeholder={placeholder} value={form[k]} onChange={set(k)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none
                  focus:border-slate-500 focus:ring-2 focus:ring-slate-100 bg-gray-50" />
            </div>
          ))}
        </div>

        <button onClick={handleLogin} disabled={loading}
          className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl mb-4
            disabled:opacity-60 transition-all active:scale-[0.98]">
          {loading ? '驗證中…' : '登入管理後台'}
        </button>

        <div className="text-center">
          <button onClick={() => navigate('/')}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
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
  const [sections, setSections] = useState({ users: false, stores: false, orders: false });
  const [data, setData]         = useState({ users: [], stores: [], orders: [] });
  const [loading, setLoading]   = useState({ users: false, stores: false, orders: false });
  const [errors, setErrors]     = useState({ users: '', stores: '', orders: '' });

  const toggle = async (key) => {
    const next = !sections[key];
    setSections((s) => ({ ...s, [key]: next }));

    /* 首次展開才 fetch */
    if (next && data[key].length === 0 && !loading[key]) {
      setLoading((l) => ({ ...l, [key]: true }));
      try {
        const collectionName = key === 'users' ? 'users' : key === 'stores' ? 'stores' : 'orders';
        const snap = await getDocs(collection(db, collectionName));
        const rows = snap.docs.map((d) => d.data());
        rows.sort((a, b) => ((b.registeredAt || b.createdAt || '') > (a.registeredAt || a.createdAt || '') ? 1 : -1));
        setData((d) => ({ ...d, [key]: rows }));
      } catch {
        setErrors((e) => ({ ...e, [key]: '無法讀取資料，請檢查網路連線' }));
      } finally {
        setLoading((l) => ({ ...l, [key]: false }));
      }
    }
  };

  return (
    <div className="w-full h-screen max-w-md mx-auto flex flex-col bg-gray-50 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-lg">🔐</div>
            <div>
              <div className="text-white font-black text-sm">管理員後台</div>
              <div className="text-white/40 text-[11px]">inochi 系統管理</div>
            </div>
          </div>
          <button onClick={onLogout}
            className="text-white/50 hover:text-white text-xs border border-white/15 hover:border-white/40
              px-3 py-1.5 rounded-xl transition-all">
            登出
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">

        {/* ── 所有客戶 ── */}
        <Accordion icon="👥" title="所有客戶" count={data.users.length || null}
          expanded={sections.users} onToggle={() => toggle('users')}
          loading={loading.users} error={errors.users}>
          {data.users.length === 0 ? (
            <div className="text-center text-gray-400 py-4 text-sm">📭 尚無已註冊的學生帳號</div>
          ) : data.users.map((u) => (
            <div key={u.studentId} className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">👤</span>
                  <div>
                    <div className="text-sm font-bold text-gray-800">{u.name}</div>
                    <div className="text-xs font-mono text-gray-400">{u.studentId}</div>
                  </div>
                </div>
                <ScoreBadge score={u.creditScore} />
              </div>
              {u.email && <div className="text-xs text-gray-500 truncate">✉ {u.email}</div>}
              <div className="text-xs text-gray-400 mt-0.5">🕐 {fmtDate(u.registeredAt)}</div>
            </div>
          ))}
        </Accordion>

        {/* ── 所有店家 ── */}
        <Accordion icon="🏪" title="所有店家" count={data.stores.length || null}
          expanded={sections.stores} onToggle={() => toggle('stores')}
          loading={loading.stores} error={errors.stores}>
          {data.stores.length === 0 ? (
            <div className="text-center text-gray-400 py-4 text-sm">📭 尚無已註冊的店家</div>
          ) : data.stores.map((s, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3">
              {/* 頂部：emoji + 名稱 + 授權標籤 */}
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-xl shrink-0">
                  {TYPE_EMOJI[s.type] || '🏪'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-800">{s.name}</div>
                  <div className="text-xs text-gray-500">
                    <span className="font-mono">{s.username}</span>
                    <span className="mx-1">·</span>
                    <span>{s.type || '—'}</span>
                  </div>
                </div>
                <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full shrink-0">授權</span>
              </div>
              {/* 詳細資料 */}
              <div className="space-y-0.5 pl-1">
                {s.address      && <div className="text-xs text-gray-500">📍 {s.address}</div>}
                {s.phone        && <div className="text-xs text-gray-500">📞 {s.phone}</div>}
                {s.businessHours && <div className="text-xs text-gray-500">🕐 {s.businessHours}</div>}
                {s.email        && <div className="text-xs text-gray-500">✉ {s.email}</div>}
                <div className="text-xs text-gray-300 pt-0.5">註冊：{fmtDate(s.registeredAt)}</div>
              </div>
            </div>
          ))}
        </Accordion>

        {/* ── 歷史訂單 ── */}
        <Accordion icon="📋" title="歷史訂單" count={data.orders.length || null}
          expanded={sections.orders} onToggle={() => toggle('orders')}
          loading={loading.orders} error={errors.orders}>
          {data.orders.length === 0 ? (
            <div className="text-center text-gray-400 py-4 text-sm">📭 尚無訂單紀錄</div>
          ) : data.orders.map((o, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <div className="text-xs font-mono font-bold text-gray-700">{o.orderId}</div>
                  <div className="text-xs text-gray-400">學號：{o.studentId}</div>
                </div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${STATUS_CLS[o.status] || 'bg-gray-100 text-gray-500'}`}>
                  {o.status}
                </span>
              </div>
              <div className="text-sm font-semibold text-gray-800">{o.store}</div>
              <div className="flex items-center justify-between mt-1">
                <div className="text-xs text-gray-400">🕐 {fmtDate(o.createdAt)}</div>
                <div className="text-sm font-black text-primary">${o.total}</div>
              </div>
            </div>
          ))}
        </Accordion>

      </div>
    </div>
  );
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />;
  return <AdminDashboard onLogout={() => setAuthed(false)} />;
}
