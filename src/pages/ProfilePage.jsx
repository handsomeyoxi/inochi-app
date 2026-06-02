import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '../firebase';

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
  const arc = C * 0.75;
  const displayScore = Math.min(score, 200);
  const filled = arc * displayScore / 200;
  const color = displayScore >= 160 ? '#22c55e' : displayScore >= 120 ? '#f59e0b' : '#ef4444';
  const cx = size / 2;
  const cy = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} overflow="visible">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={sw}
        strokeDasharray={`${arc} ${C - arc}`} strokeLinecap="round"
        transform={`rotate(-135 ${cx} ${cy})`} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={`${filled} ${arc - filled}`} strokeLinecap="round"
        transform={`rotate(-135 ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(.4,0,.2,1)' }} />
      <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="middle"
        fontSize="46" fontWeight="800" fill={color} fontFamily="system-ui, sans-serif">
        {displayScore}
      </text>
      <text x={cx} y={cy + 26} textAnchor="middle"
        fontSize="13" fill="#9ca3af" fontFamily="system-ui, sans-serif">
        信用積點
      </text>
    </svg>
  );
}

export default function ProfilePage({ user, onLogout }) {
  const [showPoints, setShowPoints] = useState(false);
  const [creditScore, setCreditScore] = useState(user?.creditScore ?? 100);
  const [pointsLog, setPointsLog] = useState([]);
  const [loadingPoints, setLoadingPoints] = useState(true);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [qrOrder, setQrOrder] = useState(null);

  const suspended = creditScore < 60;
  const displayName = user?.name || user?.studentId || '使用者';
  const displaySub = user?.email || (user?.studentId ? `學號 ${user.studentId}` : '');

  useEffect(() => {
    if (!user?.studentId) { setLoadingPoints(false); setLoadingOrders(false); return; }

    /* 從 Firestore 讀取最新 creditScore */
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'users'), where('studentId', '==', user.studentId)));
        if (!snap.empty) setCreditScore(snap.docs[0].data().creditScore ?? 100);
      } catch { /* 使用預設值 */ }
    })();

    /* 讀取積分明細 */
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'points_log'), where('studentId', '==', user.studentId)));
        const data = snap.docs.map((d) => d.data());
        data.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
        setPointsLog(data);
      } catch { /* 空陣列 */ } finally { setLoadingPoints(false); }
    })();

    /* 讀取歷史訂單 */
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'orders'), where('studentId', '==', user.studentId)));
        const data = snap.docs.map((d) => d.data());
        data.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
        setOrders(data);
      } catch { /* 空陣列 */ } finally { setLoadingOrders(false); }
    })();
  }, [user?.studentId]);

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gray-50">
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
            <div className="text-xs opacity-60 mt-0.5">惜食平台會員</div>
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

      {/* ── Score card ── */}
      <div className="mx-4 -mt-14 bg-white rounded-3xl shadow-xl px-4 pt-5 pb-4 mb-4 shrink-0">
        <div className="flex flex-col items-center">
          <ArcGauge score={creditScore} />
          <div className={`text-sm font-bold mt-0.5
            ${creditScore >= 160 ? 'text-green-600' : creditScore >= 120 ? 'text-yellow-600' : creditScore >= 60 ? 'text-orange-600' : 'text-red-600'}`}>
            {creditScore >= 160 ? '信用優秀 ⭐' : creditScore >= 120 ? '信用良好 ✨' : creditScore >= 60 ? '信用普通' : '帳號停權 🚫'}
          </div>
          <p className="text-xs text-gray-400 mt-1 text-center">
            上限 200 分 · 成功取餐 +10 · 棄單 −15 · 低於 60 停權
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
          <div className="mt-3">
            {loadingPoints ? (
              <div className="text-center text-gray-400 text-xs py-3">載入中…</div>
            ) : pointsLog.length === 0 ? (
              <div className="text-center text-gray-400 text-xs py-3">尚無積分紀錄</div>
            ) : (
              <div className="space-y-3">
                {pointsLog.map((log, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-700">{log.desc}</div>
                      <div className="text-xs text-gray-400">{log.date}</div>
                    </div>
                    <span className={`text-sm font-black ${log.pts > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {log.pts > 0 ? '+' : ''}{log.pts}
                    </span>
                  </div>
                ))}
              </div>
            )}
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
              <div
                key={order.orderId}
                className={`flex items-center px-4 py-3.5 gap-3
                  ${order.status === '待取餐' ? 'cursor-pointer hover:bg-orange-50 active:bg-orange-100 transition-colors' : ''}`}
                onClick={() => order.status === '待取餐' && setQrOrder(order)}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-800 truncate">{order.store}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {order.date} · {order.orderId}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-gray-800 mb-1">${order.total}</div>
                  <div className="flex items-center gap-1 justify-end">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_CLS[order.status]}`}>
                      {order.status}
                    </span>
                    {order.status === '待取餐' && <span className="text-xs text-gray-300">▶</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {orders.some(o => o.status === '待取餐') && (
          <p className="text-xs text-gray-400 text-center mt-2">點選「待取餐」訂單可出示 QR Code</p>
        )}
      </div>

      {/* ── QR Code Modal ── */}
      {qrOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setQrOrder(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 w-full max-w-xs text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-gray-800 mb-1">出示取餐 QR Code</h3>
            <p className="text-sm text-gray-400 mb-4">{qrOrder.store}</p>
            <div className="flex justify-center p-3 bg-gray-50 rounded-2xl mb-4">
              <QRCodeSVG value={qrOrder.orderId} size={190} fgColor="#1f2937" level="M" />
            </div>
            <div className="text-xs text-gray-400 mb-1">訂單編號</div>
            <div className="text-sm font-mono font-bold text-gray-700 mb-5">{qrOrder.orderId}</div>
            <button
              onClick={() => setQrOrder(null)}
              className="w-full py-3 bg-gray-100 text-gray-700 font-bold rounded-2xl"
            >
              關閉
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
