import React, { useState } from 'react';

const CREDIT_SCORE = 85;

const POINTS_LOG = [
  { id: 1, desc: '成功取餐 - 濱海迴轉壽司', pts: +10, date: '05/28' },
  { id: 2, desc: '成功取餐 - 阿嬤的便當', pts: +10, date: '05/26' },
  { id: 3, desc: '取消訂單（扣除）', pts: -15, date: '05/24' },
  { id: 4, desc: '成功取餐 - 老師傅麵包坊', pts: +10, date: '05/22' },
  { id: 5, desc: '首次使用獎勵', pts: +30, date: '05/01' },
];

const ORDER_HISTORY = [
  { id: 'ORD-A1B2C3', store: '濱海迴轉壽司', total: 160, status: '已完成', date: '05/28' },
  { id: 'ORD-D4E5F6', store: '阿嬤的便當', total: 55, status: '已完成', date: '05/26' },
  { id: 'ORD-G7H8I9', store: '小Q飲料坊', total: 79, status: '已取消', date: '05/24' },
  { id: 'ORD-J0K1L2', store: '老師傅麵包坊', total: 99, status: '已完成', date: '05/22' },
  { id: 'ORD-M3N4O5', store: '熱呼呼關東煮', total: 85, status: '待取餐', date: '05/30' },
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

export default function ProfilePage() {
  const [showPoints, setShowPoints] = useState(false);
  const suspended = CREDIT_SCORE < 60;

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
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-white/25 flex items-center justify-center text-3xl border-2 border-white/50">
            👤
          </div>
          <div className="text-white">
            <div className="font-black text-lg">陳宥希</div>
            <div className="text-sm opacity-75">dannychen5058@gmail.com</div>
            <div className="text-xs opacity-60 mt-0.5">會員自 2025 年 5 月</div>
          </div>
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
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
          {ORDER_HISTORY.map((order) => (
            <div key={order.id} className="flex items-center px-4 py-3.5 gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-800 truncate">{order.store}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {order.date} · {order.id}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-bold text-gray-800 mb-1">${order.total}</div>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_CLS[order.status]}`}
                >
                  {order.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
