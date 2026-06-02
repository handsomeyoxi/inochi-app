import React, { useState, useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, doc, getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';

const TYPE_EMOJI = { '壽司': '🍣', '飲料': '🧋', '麵包': '🍞', '便當': '🍱', '關東煮': '🍢' };

function genOrderId() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'ORD-';
  for (let i = 0; i < 5; i++) code += letters[Math.floor(Math.random() * letters.length)];
  for (let i = 0; i < 3; i++) code += Math.floor(Math.random() * 10);
  return code;
}

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

function CartItemCard({ storeKey, item, onDelete }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-xl">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-gray-800 truncate">{item.name}</div>
        <div className="text-xs text-gray-500">
          ${item.specialPrice} × {item.qty} = ${item.specialPrice * item.qty}
        </div>
      </div>
      <button
        onClick={() => onDelete(storeKey, item.id)}
        className="ml-2 text-xs text-red-500 hover:text-red-700 font-bold px-2 py-1 shrink-0"
      >
        刪除
      </button>
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
  const [cartItems, setCartItems] = useState({});
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrOrder, setQrOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [creditScore, setCreditScore] = useState(null);
  const [checkingScore, setCheckingScore] = useState(false);

  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('inochi_user') || 'null'); } catch { return null; }
  }, []);

  /* 讀取用戶信用積分 */
  useEffect(() => {
    if (!currentUser?.studentId) return;

    setCheckingScore(true);
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'users'), where('studentId', '==', currentUser.studentId)));
        if (!snap.empty) {
          setCreditScore(snap.docs[0].data().creditScore ?? 100);
        }
      } catch (err) {
        console.error('讀取積分失敗:', err);
      } finally {
        setCheckingScore(false);
      }
    })();
  }, [currentUser?.studentId]);

  /* 讀取購物車 */
  useEffect(() => {
    try {
      const cart = JSON.parse(localStorage.getItem('inochi_cart_items') || '{}');
      setCartItems(cart);
    } catch { }
  }, []);

  /* 監聽待取餐訂單 */
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
      const rows = snap.docs
        .map(d => d.data())
        .filter(o => o.createdAt?.startsWith(today));
      setOrders(rows);
      setLoading(false);
    }, () => setLoading(false));

    return () => unsub();
  }, [currentUser?.studentId]);

  /* 刪除購物車項目 */
  const handleDelete = (storeKey, itemId) => {
    const updated = { ...cartItems };
    if (updated[storeKey]) {
      updated[storeKey].items = (updated[storeKey].items || []).filter(item => item.id !== itemId);
      if (updated[storeKey].items.length === 0) delete updated[storeKey];
    }
    setCartItems(updated);
    localStorage.setItem('inochi_cart_items', JSON.stringify(updated));
  };

  /* 計算購物車總額及商品列表 */
  const cartSummary = useMemo(() => {
    let total = 0;
    const stores = [];
    Object.entries(cartItems).forEach(([storeKey, storeData]) => {
      const items = storeData.items || storeData;
      const storeTotal = items.reduce((s, i) => s + (i.specialPrice * i.qty), 0);
      total += storeTotal;
      stores.push({
        storeKey,
        storeType: storeData.storeType || '',
        items,
        total: storeTotal,
      });
    });
    return { total, stores };
  }, [cartItems]);

  /* 下單 */
  const handleCheckout = async () => {
    if (cartSummary.total === 0) return;

    /* 再次檢查積分 */
    if (creditScore !== null && creditScore < 60) {
      setConfirmMsg('❌ 帳號已停權，無法下單');
      return;
    }

    setSubmitting(true);
    setConfirmMsg('');

    try {
      const now = new Date();

      /* 逐店家下單 */
      for (const store of cartSummary.stores) {
        const storeKey = store.storeKey;
        const items = store.items;

        /* 生成訂單行（用於顯示） */
        const orderLines = items.map(i => `${i.name} ×${i.qty}  $${i.specialPrice * i.qty}`);

        /* 寫訂單 */
        const orderId = genOrderId();
        await addDoc(collection(db, 'orders'), {
          orderId,
          studentId: currentUser?.studentId || 'guest',
          studentName: currentUser?.name || currentUser?.studentId || 'guest',
          storeId: storeKey,
          store: storeKey,
          storeType: store.storeType,
          items: orderLines,
          total: store.total,
          deadline: '',
          status: '待取餐',
          createdAt: now.toISOString(),
          date: `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`,
        });

        /* 寫積分日誌 */
        await addDoc(collection(db, 'points_log'), {
          studentId: currentUser?.studentId || 'guest',
          desc: `訂購商品 - ${storeKey}`,
          pts: 0,
          date: `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`,
          createdAt: now.toISOString(),
        });
      }

      /* 清空購物車 */
      localStorage.removeItem('inochi_cart_items');
      setCartItems({});
      setShowConfirm(false);
      setConfirmMsg('✅ 訂單已送出！');
    } catch (e) {
      setConfirmMsg('❌ 下單失敗，請重試');
    } finally {
      setSubmitting(false);
    }
  };

  const cartTotal = cartSummary.total;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-4 shadow-sm shrink-0">
        <h1 className="text-lg font-black text-gray-800">購物車</h1>
        <p className="text-xs text-gray-400 mt-0.5">管理訂單和購物</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* 待下單商品 */}
        <div>
          <div className="text-sm font-bold text-gray-700 mb-2.5">待下單商品</div>
          {cartSummary.stores.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm px-4 py-6 text-center">
              <div className="text-3xl opacity-40 mb-2">🛒</div>
              <p className="text-sm text-gray-400">購物車是空的</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cartSummary.stores.map(store => (
                <div key={store.storeKey} className="bg-white rounded-2xl shadow-sm p-4">
                  <div className="text-sm font-bold text-gray-800 mb-3">{store.storeKey}</div>
                  <div className="space-y-2 mb-3">
                    {store.items.map(item => (
                      <CartItemCard
                        key={item.id}
                        storeKey={store.storeKey}
                        item={item}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                  <div className="text-sm font-bold text-primary text-right">
                    小計 ${store.total}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 待取餐訂單 */}
        <div>
          <div className="text-sm font-bold text-gray-700 mb-2.5">待取餐訂單</div>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400">
              <div className="text-3xl animate-pulse">📋</div>
              <span className="text-sm">載入中…</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm px-4 py-6 text-center">
              <div className="text-3xl opacity-40 mb-2">📭</div>
              <p className="text-sm text-gray-400">尚無待取餐訂單</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(o => (
                <OrderCard key={o.orderId} order={o} onShowQR={setQrOrder} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 下單條 */}
      {cartSummary.stores.length > 0 && (
        <div className="shrink-0 bg-white border-t border-gray-100 px-4 py-3 shadow-xl">
          {creditScore !== null && creditScore < 60 && (
            <div className="bg-red-100 border border-red-300 text-red-700 text-xs font-bold rounded-xl px-3 py-2 text-center mb-2">
              🚫 信用積分低於 60 分，帳號已停權，無法下單
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-400">合計</div>
              <div className="text-2xl font-black text-primary">${cartTotal}</div>
            </div>
            <button
              onClick={() => setShowConfirm(true)}
              disabled={submitting || (creditScore !== null && creditScore < 60)}
              className="bg-primary hover:bg-primary-dark active:scale-95 transition-all
                text-white font-bold px-6 py-3 rounded-2xl text-base
                disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {submitting ? '處理中…' : '立即下單'}
            </button>
          </div>
        </div>
      )}

      {/* 下單確認對話框 */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-t-3xl w-full max-w-md p-6">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-3">確認下單</h3>

            {/* 訂單內容 */}
            <div className="bg-gray-50 rounded-2xl p-4 mb-4 space-y-1 max-h-48 overflow-y-auto">
              {cartSummary.stores.map(store => (
                <div key={store.storeKey}>
                  <div className="text-sm font-bold text-gray-800">{store.storeKey}</div>
                  {store.items.map((item, i) => (
                    <div key={i} className="text-xs text-gray-600 pl-2">
                      {item.name} ×{item.qty} = ${item.specialPrice * item.qty}
                    </div>
                  ))}
                  <div className="text-xs text-gray-500 pl-2 border-b border-gray-200 pb-1 mb-1">
                    小計 ${store.total}
                  </div>
                </div>
              ))}
              <div className="text-sm font-bold text-gray-900 pt-2 border-t border-gray-200">
                <div className="flex justify-between">
                  <span>總計</span>
                  <span className="text-primary text-lg">${cartTotal}</span>
                </div>
              </div>
            </div>

            {/* 警示 */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex gap-2">
              <span className="text-lg shrink-0">⚠️</span>
              <p className="text-xs text-amber-800">
                訂單確認後，若<strong>取消訂單</strong>將扣除 <strong>15 信用積點</strong>
              </p>
            </div>

            {confirmMsg && (
              <div className={`text-sm rounded-xl px-3 py-2 mb-3 text-center
                ${confirmMsg.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {confirmMsg}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 font-semibold disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleCheckout}
                disabled={submitting}
                className="flex-1 py-3 rounded-2xl bg-primary text-white font-bold disabled:opacity-50"
              >
                {submitting ? '處理中…' : '確認下單'}
              </button>
            </div>
          </div>
        </div>
      )}

      {qrOrder && <QRModal order={qrOrder} onClose={() => setQrOrder(null)} />}
    </div>
  );
}
