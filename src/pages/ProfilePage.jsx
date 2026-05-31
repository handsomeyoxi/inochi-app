import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

const CREDIT_SCORE = 85;

const POINTS_LOG = [
  { id: 1, desc: '成功取餐 - 濱海迴轉壽司', pts: +10, date: '05/28' },
  { id: 2, desc: '成功取餐 - 阿嬤的便當', pts: +10, date: '05/26' },
  { id: 3, desc: '取消訂單（扣除）', pts: -15, date: '05/24' },
  { id: 4, desc: '成功取餐 - 老師傅麵包坊', pts: +10, date: '05/22' },
  { id: 5, desc: '首次使用獎勵', pts: +30, date: '05/01' },
];


const STATUS_CLS = {
  已完成: 'bg-green-100 text-green-700',
  已取消: 'bg-red-100 text-red-600',
  待取餐: 'bg-orange-100 text-orange-700',
};

/* ── Arc Gauge (270° speedometer style) ── */
function ArcGauge({ score }) {
  const size = 200;
  const sw = 14;
  const r = (size - sw) / 2;
  const C = 2 * Math.PI * r;
  const arc = C * 0.75;                      // 270° of full circle
  const filled = arc * Math.min(score, 100) / 100;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
  const cx = size / 2;
  const cy = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} overflow="visible">
      {/* Track */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none" stroke="#e5e7eb" strokeWidth={sw}
        strokeDasharray={`${arc} ${C - arc}`}
        strokeLinecap="round"
        transform={`rotate(-135 ${cx} ${cy})`}
      />
      {/* Progress */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={`${filled} ${C - filled}`}
        strokeLinecap="round"
        transform={`rotate(-135 ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(.4,0,.2,1)' }}
      />
      {/* Score number */}
      <text
        x={cx} y={cy - 8}
        textAnchor="middle" dominantBaseline="middle"
        fontSize="46" fontWeight="800" fill={color}
        fontFamily="system-ui, sans-serif"
      >
        {score}
      </text>
      {/* Label */}
      <text
        x={cx} y={cy + 26}
        textAnchor="middle"
        fontSize="13" fill="#9ca3af"
        fontFamily="system-ui, sans-serif"
      >
        信用積點
      </text>
    </svg>
  );
}

export default function ProfilePage({ user, onLogout }) {
  const [showPoints, setShowPoints] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const suspended = CREDIT_SCORE < 60;

  useEffect(() => {
    if (!user?.studentId) { setLoadingOrders(false); return; }
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'orders'), where('studentId', '==', user.studentId))
        );
        const data = snap.docs.map((d) => d.data());
        data.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
        setOrders(data);
      } catch {
        // 無法讀取時保持空陣列
      } finally {
        setLoadingOrders(false);
      }
    })();
  }, [user?.studentId]);
  const displayName = user?.name || user?.studentId || '使用者';
  const displaySub = user?.email || (user?.studentId ? `學號 ${user.studentId}` : '');

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gray-50">
      {/* ── Suspension banner ── */}
      {suspended && (
        <div className="bg-red-600 text-white px-4 py-3 flex items-center gap-2 text-sm font-semibold shrink-0">
          <span>🚫</span>
          信用積點低於 60 分，帳號已停權，暫時無法預訂
        </div>
      )}

      {/* ── Profile banner ── */}
      <div className="bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-400 px-5 pt-8 pb-20 shrink-0">
        <div className="flex items-start gap-3">
          <div className="w-14 h-14 rounded-full bg-white/25 flex items-center justify-center text-3xl border-2 border-white/50 shrink-0">
            👤
          </div>
          <div className="text-white flex-1 min-w-0">
            <div className="font-black text-lg truncate">{displayName}</div>
            <div className="text-sm opacity-75 truncate">{displaySub}</div>
            <div className="text-xs opacity-60 mt-0.5">會員自 2025 年 5 月</div>
          </div>
          <button
            onClick={onLogout}
            className="text-white/70 hover:text-white border border-white/30 hover:border-white/60
              text-xs font-semibold px-3 py-1.5 rounded-xl transition-all shrink-0 mt-1"
          >
            登出
          </button>
        </div>
      </div>

      {/* ── Score card (overlaps banner) ── */}
      <div className="mx-4 -mt-14 bg-white rounded-3xl shadow-xl px-4 pt-5 pb-4 mb-4 shrink-0">
        <div className="flex flex-col items-center">
          <ArcGauge score={CREDIT_SCORE} />
          <div
            className={`text-sm font-bold mt-0.5
              ${CREDIT_SCORE >= 80 ? 'text-green-600' : CREDIT_SCORE >= 60 ? 'text-yellow-600' : 'text-red-600'}`}
          >
            {CREDIT_SCORE >= 80 ? '信用良好 ✨' : CREDIT_SCORE >= 60 ? '信用普通' : '帳號停權 🚫'}
          </div>
          <p className="text-xs text-gray-400 mt-1 text-center">
            成功取餐 +10 · 棄單 −15 · 低於 60 停權
          </p>
        </div>

        {/* Points toggle */}
        <button
          onClick={() => setShowPoints((p) => !p)}
          className="w-full mt-4 py-2.5 border border-gray-100 bg-gray-50 rounded-xl
            text-sm font-semibold text-gray-600 flex items-center justify-center gap-1.5"
        >
          積分明細
          <span className="text-xs">{showPoints ? '▲' : '▼'}</span>
        </button>

        {showPoints && (
          <div className="mt-3 space-y-3">
            {POINTS_LOG.map((log) => (
              <div key={log.id} className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-700">{log.desc}</div>
                  <div className="text-xs text-gray-400">{log.date}</div>
                </div>
                <span
                  className={`text-sm font-black ${log.pts > 0 ? 'text-green-600' : 'text-red-500'}`}
                >
                  {log.pts > 0 ? '+' : ''}{log.pts}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Order history ── */}
      <div className="mx-4 mb-6 shrink-0">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">歷史訂單</p>

        {loadingOrders ? (
          <div className="text-center text-gray-400 py-8 text-sm">載入中…</div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm px-4 py-10 text-center">
            <div className="text-4xl mb-2">📋</div>
            <div className="text-sm text-gray-400">尚無訂單紀錄</div>
            <div className="text-xs text-gray-300 mt-1">預訂取餐後將顯示於此</div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
            {orders.map((order) => (
              <div key={order.orderId} className="flex items-center px-4 py-3.5 gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-800 truncate">{order.store}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {order.date} · {order.orderId}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-gray-800 mb-1">${order.total}</div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_CLS[order.status]}`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
