import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  collection, query, where, onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';

const TYPE_EMOJI = { '壽司': '🍣', '飲料': '🧋', '麵包': '🍞', '便當': '🍱', '關東煮': '🍢' };

const SEED_PRODUCTS = {
  壽司:  [
    { name: '鮭魚握壽司 (2入)', originalPrice: 120, specialPrice: 90,  stock: 8  },
    { name: '玉子燒',           originalPrice: 70,  specialPrice: 45,  stock: 10 },
    { name: '鮪魚細卷',         originalPrice: 100, specialPrice: 70,  stock: 5  },
  ],
  飲料:  [
    { name: '珍珠奶茶 (L)',  originalPrice: 80,  specialPrice: 65, stock: 10 },
    { name: '紅茶拿鐵 (M)', originalPrice: 70,  specialPrice: 55, stock: 8  },
    { name: '冬瓜茶 (L)',   originalPrice: 55,  specialPrice: 40, stock: 12 },
  ],
  麵包:  [
    { name: '法式可頌',       originalPrice: 65,  specialPrice: 45, stock: 8  },
    { name: '菠蘿麵包',       originalPrice: 50,  specialPrice: 35, stock: 10 },
    { name: '咖哩麵包',       originalPrice: 70,  specialPrice: 50, stock: 6  },
    { name: '奶油餐包 (3入)', originalPrice: 80,  specialPrice: 60, stock: 5  },
  ],
  便當:  [
    { name: '排骨便當', originalPrice: 110, specialPrice: 90,  stock: 3 },
    { name: '雞腿便當', originalPrice: 120, specialPrice: 100, stock: 2 },
    { name: '素食便當', originalPrice: 90,  specialPrice: 75,  stock: 2 },
  ],
  關東煮: [
    { name: '白蘿蔔', originalPrice: 25, specialPrice: 20, stock: 15 },
    { name: '黑輪',   originalPrice: 25, specialPrice: 20, stock: 12 },
    { name: '豆腐',   originalPrice: 20, specialPrice: 15, stock: 10 },
    { name: '蒟蒻',   originalPrice: 20, specialPrice: 15, stock: 8  },
    { name: '玉米',   originalPrice: 30, specialPrice: 25, stock: 6  },
  ],
};

export default function ProductPage() {
  const location = useLocation();
  const navigate  = useNavigate();

  /* 安全取得 store；若無店家資訊則為 null */
  const store = useMemo(() => {
    const s = location.state?.store;
    return (s && s.name) ? s : null;
  }, [location.state]);

  /* ── Firestore 商品（即時監聽 + 自動 seed） ── */
  const [fsProducts, setFsProducts] = useState([]);
  const [fsLoading,  setFsLoading]  = useState(true);
  const [fsError,    setFsError]    = useState('');
  const didSeed = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    didSeed.current   = false;
    if (isMounted.current) { setFsLoading(true); setFsProducts([]); setFsError(''); }

    if (!store?.name) { setFsLoading(false); return; }

    const q = query(collection(db, 'products'), where('storeId', '==', store?.name));

    const unsub = onSnapshot(q, async (snap) => {
      if (!isMounted.current) return;

      if (!snap.empty) {
        setFsProducts(snap.docs.map(d => ({ ...d.data(), _docId: d.id })));
        setFsLoading(false);
        return;
      }

      /* 第一次偵測到空資料 → 自動 seed */
      if (!didSeed.current) {
        didSeed.current = true;
        try {
          const seedItems = SEED_PRODUCTS[store.type] ?? [];
          for (const item of seedItems) {
            if (!isMounted.current) return;
            await addDoc(collection(db, 'products'), {
              storeId:       store.name,
              name:          item.name,
              originalPrice: item.originalPrice,
              specialPrice:  item.specialPrice,
              stock:         item.stock,
              available:     true,
              isBox:         false,
            });
          }
          if (store.special_price && isMounted.current) {
            await addDoc(collection(db, 'products'), {
              storeId:       store.name,
              name:          '驚喜包',
              originalPrice: store.original_price ?? Math.round((store.special_price ?? 0) * 2),
              specialPrice:  store.special_price,
              stock:         store.stock_quantity ?? 5,
              available:     store.is_available !== false,
              isBox:         true,
            });
          }
          /* onSnapshot 會自動再觸發帶入新資料 */
        } catch (e) {
          if (isMounted.current) {
            setFsError('商品載入失敗，請重新整理');
            setFsLoading(false);
          }
        }
      } else {
        if (isMounted.current) setFsLoading(false);
      }
    }, (err) => {
      if (isMounted.current) {
        setFsError('無法連線至伺服器');
        setFsLoading(false);
      }
    });

    return () => { isMounted.current = false; unsub(); };
  }, [store?.name]);

  /* ── 衍生商品資料（宣告必須在所有 useEffect 之前） ── */
  const boxProduct      = fsProducts.find(p => p.isBox) ?? null;
  const regularProducts = fsProducts.filter(p => !p.isBox && p.available !== false);

  const boxPrice    = boxProduct?.specialPrice   ?? store?.special_price   ?? 0;
  const boxOri      = boxProduct?.originalPrice  ?? store?.original_price  ?? 0;
  const boxMaxStock = boxProduct?.stock          ?? store?.stock_quantity  ?? 0;

  /* ── 購物狀態 ── */
  const [boxQty,    setBoxQty]    = useState(0);
  const [itemQtys,  setItemQtys]  = useState({});
  const [ordering,  setOrdering]  = useState(false);
  const [orderError, setOrderError] = useState('');
  const [addedMsg, setAddedMsg]   = useState('');

  /* 切換 store 時重設數量 */
  useEffect(() => { setBoxQty(0); setItemQtys({}); }, [store?.name]);

  /* 庫存歸零時夾回合法範圍（boxMaxStock 已在上方宣告） */
  useEffect(() => {
    if (boxMaxStock >= 0 && boxQty > boxMaxStock) {
      setBoxQty(Math.max(0, boxMaxStock));
    }
  }, [boxMaxStock]); // eslint-disable-line react-hooks/exhaustive-deps

  const adjustItem = (docId, delta) =>
    setItemQtys(prev => ({ ...prev, [docId]: Math.max(0, (prev[docId] ?? 0) + delta) }));

  const boxTotal   = boxPrice * boxQty;
  const itemsTotal = regularProducts.reduce((s, p) => s + (p.specialPrice ?? 0) * (itemQtys[p._docId] ?? 0), 0);
  const total      = boxTotal + itemsTotal;

  const orderLines = useMemo(() => {
    try {
      return [
        ...(boxQty > 0 ? [`🎁 驚喜包 ×${boxQty}  $${boxTotal}`] : []),
        ...regularProducts
          .filter(p => (itemQtys[p._docId] ?? 0) > 0)
          .map(p => `${p.name ?? '商品'} ×${itemQtys[p._docId] ?? 0}  $${(p.specialPrice ?? 0) * (itemQtys[p._docId] ?? 0)}`),
      ];
    } catch {
      return [];
    }
  }, [boxQty, boxTotal, regularProducts, itemQtys]);

  /* ── 加入購物車 ── */
  const handleAddToCart = () => {
    if (total === 0) return;
    setOrdering(true);

    try {
      /* 從 localStorage 讀取或初始化購物車 */
      let cart = {};
      try { cart = JSON.parse(localStorage.getItem('inochi_cart_items') || '{}'); } catch { }

      /* 該店家的購物車項目 */
      const storeKey = store?.name;
      if (!cart[storeKey]) {
        cart[storeKey] = {
          storeType: store?.type ?? '',
          items: [],
        };
      }

      /* 加入驚喜包 */
      if (boxQty > 0) {
        cart[storeKey].items.push({
          id: `box_${Date.now()}`,
          name: '🎁 驚喜包',
          specialPrice: boxPrice,
          qty: boxQty,
          isBox: true,
        });
      }

      /* 加入一般商品 */
      for (const p of regularProducts) {
        const qty = itemQtys[p._docId] ?? 0;
        if (qty > 0) {
          cart[storeKey].items.push({
            id: p._docId,
            name: p.name,
            specialPrice: p.specialPrice,
            qty: qty,
            isBox: false,
          });
        }
      }

      /* 保存購物車 */
      localStorage.setItem('inochi_cart_items', JSON.stringify(cart));

      /* 顯示成功提示 */
      setAddedMsg(`✅ 已加入購物車！共 ${Object.keys(cart).length} 個店家`);
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2000);
    } catch {
      setOrderError('加入購物車失敗，請重試');
    } finally {
      if (isMounted.current) setOrdering(false);
    }
  };

  /* ─────────────── 無店家資訊 → 自動導回地圖 ─────────────── */
  useEffect(() => {
    if (!store) {
      const t = setTimeout(() => navigate('/', { replace: true }), 1500);
      return () => clearTimeout(t);
    }
  }, [store, navigate]);

  if (!store) {
    return (
      <div className="flex flex-col h-full bg-gray-50 items-center justify-center gap-4 px-8">
        <div className="text-5xl animate-pulse">🗺️</div>
        <p className="text-sm text-gray-400 text-center">未選擇店家，即將返回地圖…</p>
      </div>
    );
  }

  /* ─────────────── JSX ─────────────── */
  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 shadow-sm shrink-0">
        <button onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600">←</button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-gray-800 truncate">{store.name || '商品頁面'}</h1>
          <p className="text-xs text-gray-400">截止 {store.pickup_deadline || '—'}</p>
        </div>
        <span className="text-2xl">{TYPE_EMOJI[store.type] || '🏪'}</span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {/* Firestore 錯誤 */}
        {fsError && (
          <div className="m-4 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 flex items-center gap-2 text-sm text-red-600">
            <span>⚠️</span>{fsError}
          </div>
        )}

        {fsLoading ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-sm gap-2">
            <div className="text-3xl animate-pulse">🍱</div>
            載入商品中…
          </div>
        ) : (
          <>
            {/* 驚喜包 */}
            <div className="m-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">惜食驚喜包</p>
              <div className="bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-400 rounded-3xl p-5 shadow-lg">
                <div className="text-center mb-3">
                  <div className="text-6xl mb-2">🎁</div>
                  <div className="text-white font-bold opacity-90">隨機驚喜，感受店家誠意</div>
                  <div className="flex items-baseline justify-center gap-2 mt-1">
                    <span className="text-white text-3xl font-black">${boxPrice}</span>
                    {boxOri > 0 && <span className="text-white/60 text-sm line-through">${boxOri}</span>}
                    {boxOri > boxPrice && boxPrice > 0 && (
                      <span className="bg-white/25 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        -{Math.round((1 - boxPrice / boxOri) * 100)}%
                      </span>
                    )}
                  </div>
                  {boxMaxStock === 0 ? (
                    <div className="mt-2 inline-block bg-white/30 text-white text-sm font-bold px-4 py-1 rounded-full">
                      已售完
                    </div>
                  ) : (
                    <div className="text-white/60 text-xs mt-1">剩餘庫存：{boxMaxStock} 份</div>
                  )}
                </div>
                <div className="flex items-center justify-center gap-6 mt-3">
                  <button onClick={() => setBoxQty(q => Math.max(0, q - 1))}
                    disabled={boxMaxStock === 0 || boxQty === 0}
                    className="w-10 h-10 rounded-full bg-white/25 text-white text-2xl font-bold flex items-center justify-center active:scale-90 transition-transform disabled:opacity-40">−</button>
                  <span className="text-white text-3xl font-black w-10 text-center">{boxQty}</span>
                  <button onClick={() => setBoxQty(q => Math.min(boxMaxStock, q + 1))}
                    disabled={boxMaxStock === 0 || boxQty >= boxMaxStock}
                    className="w-10 h-10 rounded-full bg-white/25 text-white text-2xl font-bold flex items-center justify-center active:scale-90 transition-transform disabled:opacity-40">+</button>
                </div>
              </div>
            </div>

            {/* 一般商品 */}
            <div className="mx-4 mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">單品加購</p>
              {regularProducts.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm px-4 py-8 text-center">
                  <div className="text-4xl mb-2">🛒</div>
                  <div className="text-sm text-gray-400">店家尚未上架商品</div>
                  <div className="text-xs text-gray-300 mt-1">請稍後再來，或先預訂驚喜包</div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
                  {regularProducts.map(p => {
                    const qty  = itemQtys[p._docId] ?? 0;
                    const sold = (p.stock ?? 0) <= 0;
                    return (
                      <div key={p._docId} className={`flex items-center px-4 py-3.5 gap-3 ${sold ? 'opacity-50' : ''}`}>
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-2xl">
                          {TYPE_EMOJI[store.type] || '🍽️'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-800 truncate">{p.name}</div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-primary">${p.specialPrice}</span>
                            {(p.originalPrice ?? 0) > (p.specialPrice ?? 0) && (
                              <span className="text-xs text-gray-300 line-through">${p.originalPrice}</span>
                            )}
                            <span className="text-xs text-gray-300">剩 {p.stock ?? 0}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => adjustItem(p._docId, -1)} disabled={sold || qty === 0}
                            className={`w-7 h-7 rounded-full text-sm font-bold flex items-center justify-center transition-all
                              ${qty > 0 && !sold ? 'bg-primary text-white' : 'border border-gray-200 text-gray-300'}`}>−</button>
                          <span className="w-5 text-center text-sm font-bold text-gray-700">{qty}</span>
                          <button onClick={() => adjustItem(p._docId, 1)} disabled={sold || qty >= (p.stock ?? 0)}
                            className="w-7 h-7 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center disabled:opacity-40">+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="h-4" />
          </>
        )}
      </div>

      {/* Order bar */}
      <div className="shrink-0 bg-white border-t border-gray-100 px-4 py-3 shadow-xl space-y-2">
        {addedMsg && (
          <div className="bg-green-50 text-green-700 text-sm font-semibold rounded-xl px-3 py-2 text-center">
            {addedMsg}
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400">合計</div>
            <div className="text-2xl font-black text-primary">${total}</div>
          </div>
          <button onClick={handleAddToCart}
            disabled={total === 0 || ordering || fsLoading}
            className="bg-primary hover:bg-primary-dark active:scale-95 transition-all
              text-white font-bold px-6 py-3 rounded-2xl text-base
              disabled:opacity-30 disabled:cursor-not-allowed">
            {ordering ? '加入中…' : '加入購物車'}
          </button>
        </div>
      </div>

    </div>
  );
}
