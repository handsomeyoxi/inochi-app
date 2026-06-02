import React, { useState, useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const TYPE_EMOJI = { '壽司': '🍣', '飲料': '🧋', '麵包': '🍞', '便當': '🍱', '關東煮': '🍢' };

function QRModal({ order, onClose }) {
  const payload = useMemo(() => {
    try {
      return JSON.stringify({ orderId: order.orderId, store: order.store, items: order.items, total: order.total });
    } catch {
      return JSON.stringify({ orderId: order.orderId });
    }
  }, [order]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 w-full max-w-xs text-center shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-4xl mb-2">🎫</div>
        <h3 className="text-lg font-black text-gray-800 mb-0.5">取餐 QR Code</h3>
        <p className="text-xs text-gray-400 mb-4">出示給店家掃描</p>

        <div className="flex justify-center p-3 bg-gray-50 rounded-2xl mb-4">
          <QRCodeSVG value={payload} size={190} fgColor="#1f2937" level="M" />
        </div>

        <div className="text-xs text-gray-400 mb-0.5">訂單編號</div>
        <div className="text-sm font-mono font-bold text-gray-700 mb-3">{order.orderId}</div>

        <div className="bg-orange-50 rounded-xl px-4 py-2.5 text-sm text-gray-600 mb-5">
          {TYPE_EMOJI[order.storeType] || '🏪'} {order.store}
          {order.deadline ? <> · 截止 <strong>{order.deadline}</strong></> : null}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-primary text-white font-bold rounded-2xl"
        >
          關閉
        </button>
      </div>
    </div>
  );
}

function OrderCard({ order, onShowQR }) {
  const timeStr = order.createdAt
    ? new Date(order.createdAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
    : '';

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{TYPE_EMOJI[order.storeType] || '🏪'}</span>
          <div>
            <div className="text-sm font-bold text-gray-800">{order.store}</div>
            <div className="text-xs text-gray-400 font-mono">{order.orderId}</div>
          </div>
        </div>
        <span className="text-xs bg-orange-100 text-orange-700 font-bold px-2.5 py-1 rounded-full shrink-0">
          待取餐
        </span>
      </div>

      {/* Items */}
      <div className="bg-gray-50 rounded-xl px-3 py-2.5 mb-3 space-y-0.5">
        {(order.items || []).map((item, i) => (
          <div key={i} className="text-sm text-gray-600">{item}</div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-black text-primary">${order.total}</div>
          <div className="text-xs text-gray-400">
            {timeStr ? `下單 ${timeStr}` : ''}
            {order.deadline ? ` · 截止 ${order.deadline}` : ''}
          </div>
        </div>
        <button
          onClick={() => onShowQR(order)}
          className="flex items-center gap-1.5 bg-primary text-white text-sm font-bold px-4 py-2.5 rounded-xl active:scale-95 transition-transform"
        >
          <span>📱</span> 出示 QR
        </button>
      </div>
    </div>
  );
}

export default function CartPage() {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrOrder, setQrOrder] = useState(null);

  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('inochi_user') || 'null'); } catch { return null; }
  }, []);

  useEffect(() => {
    if (!currentUser?.studentId) { setLoading(false); return; }

    const q = query(
      collection(db, 'orders'),
      where('studentId', '==', currentUser.studentId),
      where('status', '==', '待取餐'),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const today = new Date().toISOString().slice(0, 10);
      const rows  = snap.docs
        .map(d => d.data())
        .filter(o => o.createdAt?.startsWith(today));
      setOrders(rows);
      setLoading(false);
    }, () => setLoading(false));

    return () => unsub();
  }, [currentUser?.studentId]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-4 shadow-sm shrink-0">
        <h1 className="text-lg font-black text-gray-800">購物車</h1>
        <p className="text-xs text-gray-400 mt-0.5">今日待取餐訂單</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
            <div className="text-4xl animate-pulse">🛒</div>
            <span className="text-sm">載入中…</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="text-6xl opacity-30">🛒</div>
            <div className="text-center">
              <p className="text-base font-bold text-gray-500">今日尚未訂購</p>
              <p className="text-sm text-gray-400 mt-1">從地圖選擇店家開始訂購吧！</p>
            </div>
          </div>
        ) : (
          <>
            <div className="text-xs font-semibold text-gray-400 px-1">
              共 {orders.length} 筆待取餐訂單
            </div>
            {orders.map(o => (
              <OrderCard key={o.orderId} order={o} onShowQR={setQrOrder} />
            ))}
          </>
        )}
      </div>

      {qrOrder && <QRModal order={qrOrder} onClose={() => setQrOrder(null)} />}
    </div>
  );
}
