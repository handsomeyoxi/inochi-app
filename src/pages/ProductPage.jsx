import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import mockStores from '../data/mockStores';

const TYPE_EMOJI = { '壽司': '🍣', '飲料': '🧋', '麵包': '🍞', '便當': '🍱', '關東煮': '🍢' };

const STORE_ITEMS = {
  壽司: [
    { id: 'a1', name: '鮭魚握壽司 (2入)', price: 90 },
    { id: 'a2', name: '玉子燒', price: 45 },
    { id: 'a3', name: '鮪魚細卷', price: 70 },
  ],
  飲料: [
    { id: 'b1', name: '珍珠奶茶 (L)', price: 65 },
    { id: 'b2', name: '紅茶拿鐵 (M)', price: 55 },
    { id: 'b3', name: '冬瓜茶 (L)', price: 40 },
  ],
  麵包: [
    { id: 'c1', name: '法式可頌', price: 45 },
    { id: 'c2', name: '菠蘿麵包', price: 35 },
    { id: 'c3', name: '咖哩麵包', price: 50 },
    { id: 'c4', name: '奶油餐包 (3入)', price: 60 },
  ],
  便當: [
    { id: 'd1', name: '排骨便當', price: 90 },
    { id: 'd2', name: '雞腿便當', price: 100 },
    { id: 'd3', name: '素食便當', price: 75 },
  ],
  關東煮: [
    { id: 'e1', name: '白蘿蔔', price: 20 },
    { id: 'e2', name: '黑輪', price: 20 },
    { id: 'e3', name: '豆腐', price: 15 },
    { id: 'e4', name: '蒟蒻', price: 15 },
    { id: 'e5', name: '玉米', price: 25 },
  ],
};

function genOrderId() {
  return 'ORD-' + Math.random().toString(36).substring(2, 10).toUpperCase();
}

export default function ProductPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const store = location.state?.store ?? mockStores[0];
  const items = STORE_ITEMS[store.type] ?? [];

  const [boxQty, setBoxQty] = useState(1);
  const [itemQtys, setItemQtys] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [orderId] = useState(genOrderId);

  const adjustItem = (id, delta) =>
    setItemQtys((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) }));

  const boxTotal = store.special_price * boxQty;
  const itemsTotal = items.reduce(
    (sum, item) => sum + item.price * (itemQtys[item.id] ?? 0),
    0
  );
  const total = boxTotal + itemsTotal;

  const orderLines = useMemo(() => [
    `🎁 驚喜包 ×${boxQty}  $${boxTotal}`,
    ...items
      .filter((it) => (itemQtys[it.id] ?? 0) > 0)
      .map((it) => `${it.name} ×${itemQtys[it.id]}  $${it.price * itemQtys[it.id]}`),
  ], [boxQty, boxTotal, items, itemQtys]);

  const qrPayload = JSON.stringify({
    orderId,
    store: store.name,
    type: store.type,
    items: orderLines,
    total,
    deadline: store.pickup_deadline,
  });

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* ── Header ── */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 shadow-sm shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600"
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-gray-800 truncate">{store.name}</h1>
          <p className="text-xs text-gray-400">
            截止 {store.pickup_deadline} 取餐 · 剩 {store.stock_quantity} 份
          </p>
        </div>
        <span className="text-2xl">{TYPE_EMOJI[store.type]}</span>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto">
        {/* 驚喜包 card */}
        <div className="m-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">惜食驚喜包</p>
          <div className="bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-400 rounded-3xl p-5 shadow-lg">
            <div className="text-center mb-3">
              <div className="text-6xl mb-2">🎁</div>
              <div className="text-white font-bold text-base opacity-90">隨機驚喜，感受店家誠意</div>
              <div className="flex items-baseline justify-center gap-2 mt-1">
                <span className="text-white text-3xl font-black">${store.special_price}</span>
                <span className="text-white/60 text-sm line-through">${store.original_price}</span>
                <span className="bg-white/25 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  -{Math.round((1 - store.special_price / store.original_price) * 100)}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-6 mt-3">
              <button
                onClick={() => setBoxQty((q) => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-full bg-white/25 text-white text-2xl font-bold flex items-center justify-center active:scale-90 transition-transform"
              >
                −
              </button>
              <span className="text-white text-3xl font-black w-10 text-center">{boxQty}</span>
              <button
                onClick={() => setBoxQty((q) => Math.min(store.stock_quantity, q + 1))}
                className="w-10 h-10 rounded-full bg-white/25 text-white text-2xl font-bold flex items-center justify-center active:scale-90 transition-transform"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* 單品列表 */}
        <div className="mx-4 mb-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">單品加購</p>
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
            {items.map((item) => {
              const qty = itemQtys[item.id] ?? 0;
              return (
                <div key={item.id} className="flex items-center px-4 py-3.5 gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-2xl">
                    {TYPE_EMOJI[store.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-800 truncate">{item.name}</div>
                    <div className="text-sm font-bold text-primary">${item.price}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => adjustItem(item.id, -1)}
                      className={`w-7 h-7 rounded-full text-sm font-bold flex items-center justify-center transition-all
                        ${qty > 0 ? 'bg-primary text-white' : 'border border-gray-200 text-gray-300'}`}
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-sm font-bold text-gray-700">{qty}</span>
                    <button
                      onClick={() => adjustItem(item.id, 1)}
                      className="w-7 h-7 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* spacer for order bar */}
        <div className="h-4" />
      </div>

      {/* ── Order bar ── */}
      <div className="shrink-0 bg-white border-t border-gray-100 px-4 py-3 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400">合計</div>
            <div className="text-2xl font-black text-primary">${total}</div>
          </div>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={total === 0}
            className="bg-primary hover:bg-primary-dark active:scale-95 transition-all
              text-white font-bold px-8 py-3 rounded-2xl text-base
              disabled:opacity-30 disabled:cursor-not-allowed"
          >
            立即預訂
          </button>
        </div>
      </div>

      {/* ── Confirm dialog ── */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="bg-white rounded-t-3xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h3 className="text-lg font-bold text-gray-800 mb-4">確認預訂</h3>

            <div className="bg-gray-50 rounded-2xl p-4 mb-4 space-y-1.5">
              {orderLines.map((line, i) => (
                <div key={i} className="text-sm text-gray-700">{line}</div>
              ))}
              <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold text-gray-900">
                <span>總計</span>
                <span className="text-primary text-lg">${total}</span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 flex gap-2.5">
              <span className="text-lg shrink-0">⚠️</span>
              <p className="text-sm text-amber-800 leading-relaxed">
                若事後<strong>取消訂單</strong>，將扣除 <strong>15 信用積點</strong>。
                請確保能於 <strong>{store.pickup_deadline}</strong> 前到店取餐。
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 font-semibold"
              >
                再想想
              </button>
              <button
                onClick={() => { setShowConfirm(false); setShowQR(true); }}
                className="flex-1 py-3 rounded-2xl bg-primary text-white font-bold"
              >
                確認預訂
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── QR Code modal ── */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xs text-center shadow-2xl">
            <div className="text-4xl mb-2">🎉</div>
            <h3 className="text-xl font-black text-gray-800 mb-1">預訂成功！</h3>
            <p className="text-sm text-gray-400 mb-5">出示 QR Code 給店家掃描取餐</p>

            <div className="flex justify-center p-3 bg-gray-50 rounded-2xl mb-4">
              <QRCodeSVG value={qrPayload} size={190} fgColor="#1f2937" level="M" />
            </div>

            <div className="text-xs text-gray-400 mb-0.5">訂單編號</div>
            <div className="text-sm font-mono font-bold text-gray-700 mb-4">{orderId}</div>

            <div className="bg-orange-50 rounded-xl px-4 py-2.5 text-sm text-gray-600 mb-5">
              {store.name} · 截止 <strong>{store.pickup_deadline}</strong> 取餐
            </div>

            <button
              onClick={() => { setShowQR(false); navigate('/'); }}
              className="w-full py-3 bg-primary text-white font-bold rounded-2xl"
            >
              返回地圖
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
