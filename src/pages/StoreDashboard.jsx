import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, doc, deleteDoc, query, where, updateDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

const TYPE_EMOJI = { '壽司': '🍣', '飲料': '🧋', '麵包': '🍞', '便當': '🍱', '關東煮': '🍢' };

const INITIAL_PRODUCTS = {
  壽司: [
    { id: 'p1', name: '鮭魚握壽司 (2入)', originalPrice: 100, specialPrice: 90,  stock: 8,  available: true,  isBox: false },
    { id: 'p2', name: '玉子燒',           originalPrice: 60,  specialPrice: 45,  stock: 10, available: true,  isBox: false },
    { id: 'p3', name: '鮪魚細卷',         originalPrice: 90,  specialPrice: 70,  stock: 5,  available: true,  isBox: false },
    { id: 'p4', name: '驚喜壽司包',       originalPrice: 350, specialPrice: 160, stock: 5,  available: true,  isBox: true  },
  ],
  飲料: [
    { id: 'p1', name: '珍珠奶茶 (L)', originalPrice: 80,  specialPrice: 65, stock: 10, available: true,  isBox: false },
    { id: 'p2', name: '紅茶拿鐵 (M)', originalPrice: 70,  specialPrice: 55, stock: 8,  available: true,  isBox: false },
    { id: 'p3', name: '冬瓜茶 (L)',   originalPrice: 55,  specialPrice: 40, stock: 12, available: true,  isBox: false },
    { id: 'p4', name: '驚喜飲料包',   originalPrice: 180, specialPrice: 79, stock: 8,  available: true,  isBox: true  },
  ],
  麵包: [
    { id: 'p1', name: '法式可頌',       originalPrice: 65,  specialPrice: 45, stock: 8, available: true,  isBox: false },
    { id: 'p2', name: '菠蘿麵包',       originalPrice: 50,  specialPrice: 35, stock: 10, available: true,  isBox: false },
    { id: 'p3', name: '咖哩麵包',       originalPrice: 70,  specialPrice: 50, stock: 6, available: true,  isBox: false },
    { id: 'p4', name: '奶油餐包 (3入)', originalPrice: 80,  specialPrice: 60, stock: 5, available: true,  isBox: false },
    { id: 'p5', name: '驚喜麵包包',     originalPrice: 260, specialPrice: 99, stock: 0, available: false, isBox: true  },
  ],
  便當: [
    { id: 'p1', name: '排骨便當',  originalPrice: 110, specialPrice: 90,  stock: 3, available: true, isBox: false },
    { id: 'p2', name: '雞腿便當',  originalPrice: 120, specialPrice: 100, stock: 2, available: true, isBox: false },
    { id: 'p3', name: '素食便當',  originalPrice: 90,  specialPrice: 75,  stock: 2, available: true, isBox: false },
    { id: 'p4', name: '驚喜便當包', originalPrice: 120, specialPrice: 55,  stock: 3, available: true, isBox: true  },
  ],
  關東煮: [
    { id: 'p1', name: '白蘿蔔',       originalPrice: 25,  specialPrice: 20, stock: 15, available: true, isBox: false },
    { id: 'p2', name: '黑輪',         originalPrice: 25,  specialPrice: 20, stock: 12, available: true, isBox: false },
    { id: 'p3', name: '豆腐',         originalPrice: 20,  specialPrice: 15, stock: 10, available: true, isBox: false },
    { id: 'p4', name: '蒟蒻',         originalPrice: 20,  specialPrice: 15, stock: 8,  available: true, isBox: false },
    { id: 'p5', name: '玉米',         originalPrice: 30,  specialPrice: 25, stock: 6,  available: true, isBox: false },
    { id: 'p6', name: '驚喜關東煮包', originalPrice: 200, specialPrice: 85, stock: 12, available: true, isBox: true  },
  ],
};


/* ── Toggle switch ── */
function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0
        ${checked ? 'bg-green-400' : 'bg-gray-200'}`}
    >
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
        ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

/* ── Product card ── */
function ProductCard({ product, onUpdate, onStockAdjust, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: product.name,
    originalPrice: product.originalPrice,
    specialPrice: product.specialPrice,
  });

  const setDraftField = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  const saveEdit = () => {
    onUpdate({
      name: draft.name,
      originalPrice: Number(draft.originalPrice) || product.originalPrice,
      specialPrice: Number(draft.specialPrice) || product.specialPrice,
    });
    setEditing(false);
  };

  const cancelEdit = () => {
    setDraft({ name: product.name, originalPrice: product.originalPrice, specialPrice: product.specialPrice });
    setEditing(false);
  };

  const discount = Math.round((1 - product.specialPrice / product.originalPrice) * 100);

  return (
    <div className={`bg-white rounded-2xl shadow-sm p-4 transition-opacity ${!product.available ? 'opacity-55' : ''}`}>
      {/* Top row */}
      <div className="flex items-center justify-between mb-3 gap-2">
        {editing ? (
          <input
            className="flex-1 font-bold text-gray-800 text-sm border-b border-primary outline-none mr-2 bg-transparent"
            value={draft.name}
            onChange={setDraftField('name')}
          />
        ) : (
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="font-bold text-gray-800 text-sm truncate">{product.name}</span>
            {product.isBox && (
              <span className="text-[10px] bg-orange-100 text-orange-600 font-bold px-1.5 py-0.5 rounded-full shrink-0">
                驚喜包
              </span>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-400">{product.available ? '上架中' : '已下架'}</span>
          <Toggle
            checked={product.available}
            onChange={() => onUpdate({ available: !product.available })}
          />
        </div>
      </div>

      {/* Price row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-gray-50 rounded-xl p-2 text-center">
          <div className="text-[10px] text-gray-400 mb-0.5">原價</div>
          {editing ? (
            <input
              type="number"
              className="w-full text-center text-sm font-bold text-gray-500 bg-transparent outline-none"
              value={draft.originalPrice}
              onChange={setDraftField('originalPrice')}
            />
          ) : (
            <div className="text-sm font-bold text-gray-500">${product.originalPrice}</div>
          )}
        </div>
        <div className="bg-orange-50 rounded-xl p-2 text-center">
          <div className="text-[10px] text-gray-400 mb-0.5">惜食價</div>
          {editing ? (
            <input
              type="number"
              className="w-full text-center text-sm font-bold text-primary bg-transparent outline-none"
              value={draft.specialPrice}
              onChange={setDraftField('specialPrice')}
            />
          ) : (
            <div className="text-sm font-bold text-primary">${product.specialPrice}</div>
          )}
        </div>
        <div className="bg-green-50 rounded-xl p-2 text-center">
          <div className="text-[10px] text-gray-400 mb-0.5">折扣</div>
          <div className="text-sm font-bold text-green-600">{discount}% off</div>
        </div>
      </div>

      {/* Stock + actions row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">庫存</span>
          <button
            onClick={() => onStockAdjust(-1)}
            className={`w-7 h-7 rounded-full text-sm font-bold flex items-center justify-center transition-all
              ${product.stock > 0
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                : 'bg-gray-50 text-gray-300 cursor-not-allowed'}`}
          >−</button>
          <span className="w-6 text-center text-sm font-bold text-gray-700">{product.stock}</span>
          <button
            onClick={() => onStockAdjust(1)}
            className="w-7 h-7 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center"
          >+</button>
        </div>

        <div className="flex items-center gap-1.5">
          {editing ? (
            <>
              <button onClick={cancelEdit} className="text-xs px-3 py-1.5 border border-gray-200 text-gray-500 rounded-xl">取消</button>
              <button onClick={saveEdit} className="text-xs px-3 py-1.5 bg-primary text-white font-bold rounded-xl">儲存</button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 font-semibold rounded-xl">編輯</button>
              <button onClick={() => onDelete(product.id)} className="text-xs px-3 py-1.5 bg-red-50 text-red-500 font-semibold rounded-xl">刪除</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const STATUS_CLS = {
  待取餐: 'bg-orange-100 text-orange-700',
  已完成: 'bg-green-100 text-green-700',
  未取餐: 'bg-red-100 text-red-600',
};

/* ── Order card ── */
function OrderCard({ order, onComplete, onNoShow }) {
  const timeStr = order.createdAt
    ? new Date(order.createdAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
    : '';
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-sm font-bold text-gray-800 font-mono">{order.orderId}</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {order.studentName || order.studentId} · {timeStr}
          </div>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0
          ${STATUS_CLS[order.status] ?? 'bg-gray-100 text-gray-500'}`}>
          {order.status}
        </span>
      </div>

      <div className="space-y-0.5 mb-3">
        {(order.items || []).map((item, i) => (
          <div key={i} className="text-sm text-gray-600">{item}</div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-lg font-black text-primary">${order.total}</div>
        {order.status === '待取餐' && (
          <div className="flex gap-2">
            <button
              onClick={() => onNoShow(order.orderId)}
              className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors"
            >
              未取餐
            </button>
            <button
              onClick={() => onComplete(order.orderId)}
              className="bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors"
            >
              確認取餐 ✓
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Add product form ── */
function AddProductForm({ onAdd, onCancel }) {
  const [draft, setDraft] = useState({ name: '', originalPrice: '', specialPrice: '', stock: '1' });
  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  const handle = () => {
    if (!draft.name || !draft.originalPrice || !draft.specialPrice) return;
    onAdd({
      id: `new_${Date.now()}`,
      name: draft.name,
      originalPrice: Number(draft.originalPrice),
      specialPrice: Number(draft.specialPrice),
      stock: Math.max(0, Number(draft.stock) || 0),
      available: true,
      isBox: false,
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 border-2 border-dashed border-primary/30">
      <h3 className="text-sm font-bold text-gray-700 mb-3">新增商品</h3>
      <div className="space-y-2">
        {[
          { k: 'name',          label: '商品名稱', placeholder: '輸入商品名稱', type: 'text'   },
          { k: 'originalPrice', label: '原價',     placeholder: '0',           type: 'number' },
          { k: 'specialPrice',  label: '惜食價',   placeholder: '0',           type: 'number' },
          { k: 'stock',         label: '初始庫存', placeholder: '1',           type: 'number' },
        ].map(({ k, label, placeholder, type }) => (
          <div key={k} className="flex items-center gap-2">
            <label className="text-xs text-gray-400 w-16 shrink-0">{label}</label>
            <input
              type={type}
              placeholder={placeholder}
              value={draft[k]}
              onChange={set(k)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary"
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={onCancel} className="flex-1 py-2 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl">取消</button>
        <button onClick={handle} className="flex-1 py-2 bg-primary text-white text-sm font-bold rounded-xl">新增</button>
      </div>
    </div>
  );
}

/* ── Main dashboard ── */
export default function StoreDashboard({ storeAuth, onLogout }) {
  const [tab, setTab] = useState('products');
  const [products, setProducts]             = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [orders, setOrders]               = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [showAdd, setShowAdd]             = useState(false);
  const [confirmInput, setConfirmInput]   = useState('');
  const [confirmMsg, setConfirmMsg]       = useState({ type: '', text: '' });
  const [confirming, setConfirming]       = useState(false);

  /* ── 商品：首次自動 seed，之後即時監聽 ── */
  useEffect(() => {
    let unsub = null;
    const setup = async () => {
      const existing = await getDocs(query(collection(db, 'products'), where('storeId', '==', storeAuth.name)));
      if (existing.empty) {
        for (const p of INITIAL_PRODUCTS[storeAuth.type] ?? []) {
          await addDoc(collection(db, 'products'), {
            storeId: storeAuth.name, name: p.name,
            originalPrice: p.originalPrice, specialPrice: p.specialPrice,
            stock: p.stock, available: p.available, isBox: p.isBox,
          });
        }
      }
      const q = query(collection(db, 'products'), where('storeId', '==', storeAuth.name));
      unsub = onSnapshot(q,
        (snap) => { setProducts(snap.docs.map(d => ({ ...d.data(), _docId: d.id }))); setProductsLoading(false); },
        () => setProductsLoading(false)
      );
    };
    setup();
    return () => { if (unsub) unsub(); };
  }, [storeAuth.name]);

  /* ── 即時監聽該店家訂單（篩選今日） ── */
  useEffect(() => {
    if (!storeAuth?.name) { setOrdersLoading(false); return; }

    const q = query(
      collection(db, 'orders'),
      where('storeId', '==', storeAuth.name),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const today = new Date().toISOString().slice(0, 10);
      const rows = snap.docs
        .map(d => d.data())
        .filter(o => o.createdAt?.startsWith(today));
      setOrders(rows);
      setOrdersLoading(false);
    }, () => setOrdersLoading(false));
    return () => unsub();
  }, [storeAuth?.name]);

  /* ── 搜尋訂單（根據後3碼） ── */
  const [orderPreview, setOrderPreview] = useState(null);
  const [searchingOrder, setSearchingOrder] = useState(false);

  const handleSearchOrder = async (lastThree) => {
    if (!lastThree || lastThree.length !== 3) {
      return;
    }
    setSearchingOrder(true);
    setConfirmMsg({ type: '', text: '' });
    try {
      const orderSnap = await getDocs(collection(db, 'orders'));
      const matches = orderSnap.docs
        .map(d => d.data())
        .filter(o => o.orderId?.endsWith(lastThree) && o.storeId === storeAuth.name && o.status === '待取餐');

      if (matches.length === 1) {
        setOrderPreview(matches[0]);
      } else if (matches.length > 1) {
        setOrderPreview({ error: '多個訂單符合此碼，請確認輸入' });
      } else {
        setOrderPreview({ error: '找不到訂單，請確認後三碼數字' });
      }
    } catch {
      setOrderPreview({ error: '查詢失敗，請重試' });
    } finally {
      setSearchingOrder(false);
    }
  };

  /* ── 確認取餐核心邏輯 ── */
  const doConfirmPickup = async (oid) => {
    const targetOrderId = oid || (orderPreview?.orderId);
    if (!targetOrderId) return;
    setConfirming(true);
    setConfirmMsg({ type: '', text: '' });
    try {
      const orderSnap = await getDocs(query(collection(db, 'orders'), where('orderId', '==', targetOrderId)));
      if (orderSnap.empty) { setConfirmMsg({ type: 'error', text: '找不到此訂單' }); return; }
      const orderDoc  = orderSnap.docs[0];
      const orderData = orderDoc.data();
      if (orderData.status !== '待取餐') {
        setConfirmMsg({ type: 'error', text: `此訂單狀態為「${orderData.status}」，無需再次確認` });
        return;
      }
      await updateDoc(orderDoc.ref, { status: '已完成' });

      const userSnap = await getDocs(query(collection(db, 'users'), where('studentId', '==', orderData.studentId)));
      if (!userSnap.empty) {
        const userDoc = userSnap.docs[0];
        const curScore = userDoc.data().creditScore ?? 100;
        const newScore = Math.min(curScore + 10, 200);
        await updateDoc(userDoc.ref, { creditScore: newScore });
      }

      const now = new Date();
      await addDoc(collection(db, 'points_log'), {
        studentId: orderData.studentId,
        desc: `成功取餐 - ${orderData.store}`,
        pts: 10,
        date: `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`,
        createdAt: now.toISOString(),
      });

      setConfirmMsg({ type: 'success', text: `✅ 取餐確認！已為 ${orderData.studentName || orderData.studentId} 加 10 積分` });
      setConfirmInput('');
      setOrderPreview(null);
    } catch {
      setConfirmMsg({ type: 'error', text: '操作失敗，請重試' });
    } finally {
      setConfirming(false);
    }
  };

  /* ── 未取餐：扣 15 積分 + 寫 points_log + 可能停權 ── */
  const [noShowTarget, setNoShowTarget] = useState(null); // orderId string
  const [noShowing,    setNoShowing]    = useState(false);

  const doMarkNoShow = async (oid) => {
    if (!oid) return;
    setNoShowing(true);
    try {
      const orderSnap = await getDocs(query(collection(db, 'orders'), where('orderId', '==', oid)));
      if (orderSnap.empty) return;
      const orderDoc  = orderSnap.docs[0];
      const orderData = orderDoc.data();

      if (orderData.status !== '待取餐') return;

      /* 1. 更新訂單狀態 */
      await updateDoc(orderDoc.ref, { status: '未取餐' });

      /* 2. 扣除學生 15 積分，低於 60 自動停權 */
      const userSnap = await getDocs(query(collection(db, 'users'), where('studentId', '==', orderData.studentId)));
      if (!userSnap.empty) {
        const userDoc    = userSnap.docs[0];
        const curScore   = userDoc.data().creditScore ?? 100;
        const newScore   = Math.max(0, curScore - 15);
        const patch      = { creditScore: newScore };
        if (newScore < 60) patch.suspended = true;
        await updateDoc(userDoc.ref, patch);
      }

      /* 3. 新增積分明細 */
      const now = new Date();
      await addDoc(collection(db, 'points_log'), {
        studentId: orderData.studentId,
        desc:      `未取餐扣分 - ${orderData.store}`,
        pts:       -15,
        date:      `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`,
        createdAt: now.toISOString(),
      });

      setNoShowTarget(null);
      setConfirmInput('');
      setOrderPreview(null);
      setConfirmMsg({ type: 'success', text: `已標記未取餐，扣除 ${orderData.studentName || orderData.studentId} 15 積分` });
    } catch {
      setConfirmMsg({ type: 'error', text: '操作失敗，請重試' });
    } finally {
      setNoShowing(false);
    }
  };

  const handleUpdate = async (docId, patch) => {
    await updateDoc(doc(db, 'products', docId), patch);
  };

  const handleStockAdjust = async (docId, delta) => {
    const p = products.find(x => x._docId === docId);
    if (!p) return;
    await updateDoc(doc(db, 'products', docId), { stock: Math.max(0, p.stock + delta) });
  };

  const handleDelete = async (docId) => {
    await deleteDoc(doc(db, 'products', docId));
  };

  const handleAdd = async (product) => {
    await addDoc(collection(db, 'products'), {
      storeId: storeAuth.name,
      name: product.name,
      originalPrice: product.originalPrice,
      specialPrice: product.specialPrice,
      stock: product.stock,
      available: true,
      isBox: false,
    });
    setShowAdd(false);
  };

  const today = new Date().toISOString().slice(0, 10);
  const todayOrders  = orders.filter((o) => o.createdAt?.startsWith(today));
  const pendingCount = todayOrders.filter((o) => o.status === '待取餐').length;
  const totalRevenue = todayOrders.filter((o) => o.status === '已完成').reduce((s, o) => s + o.total, 0);

  return (
    <div className="w-full h-screen max-w-md mx-auto flex flex-col bg-gray-50 shadow-2xl overflow-hidden">
      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center text-2xl">
              {TYPE_EMOJI[storeAuth.type]}
            </div>
            <div>
              <div className="text-white font-black text-base leading-tight">{storeAuth.name}</div>
              <div className="text-white/50 text-xs">店家後台 · 今日營收 ${totalRevenue}</div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="text-white/60 hover:text-white text-xs border border-white/20 hover:border-white/50
              px-3 py-1.5 rounded-xl transition-all"
          >
            登出
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex bg-white border-b border-gray-100 shrink-0">
        {[
          ['products', '商品管理'],
          ['orders', `今日訂單${pendingCount > 0 ? ` (${pendingCount})` : ''}`],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-3.5 text-sm font-bold transition-colors
              ${tab === key ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">

        {/* Products tab */}
        {tab === 'products' && (
          <>
            {productsLoading && <div className="text-center text-gray-400 py-10 text-sm">載入商品中…</div>}
            {!productsLoading && products.length === 0 && !showAdd && (
              <div className="text-center text-gray-400 py-10 text-sm">尚無商品，點下方新增</div>
            )}
            {products.map((p) => (
              <ProductCard
                key={p._docId}
                product={p}
                onUpdate={(patch) => handleUpdate(p._docId, patch)}
                onStockAdjust={(delta) => handleStockAdjust(p._docId, delta)}
                onDelete={() => handleDelete(p._docId)}
              />
            ))}
            {showAdd
              ? <AddProductForm onAdd={handleAdd} onCancel={() => setShowAdd(false)} />
              : (
                <button
                  onClick={() => setShowAdd(true)}
                  className="w-full py-3.5 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400
                    text-sm font-semibold hover:border-primary hover:text-primary transition-colors"
                >
                  + 新增商品
                </button>
              )
            }
          </>
        )}

        {/* Orders tab */}
        {tab === 'orders' && (
          <>
            {/* ── 搜尋訂單 ── */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">輸入訂單後三碼查詢</p>
              <div className="flex gap-2 mb-3">
                <input
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary bg-gray-50 font-mono"
                  placeholder="例：123"
                  maxLength="3"
                  value={confirmInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setConfirmInput(val);
                  }}
                />
                <button
                  onClick={() => handleSearchOrder(confirmInput)}
                  disabled={searchingOrder || confirmInput.length !== 3}
                  className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-xl
                    disabled:opacity-40 transition-colors shrink-0"
                >
                  {searchingOrder ? '…' : '🔍 搜尋'}
                </button>
              </div>

              {/* 搜尋結果 */}
              {orderPreview && !orderPreview.error && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="text-xs text-green-600 font-bold mb-3">✅ 找到訂單</div>
                  <div className="text-sm font-bold text-gray-800 mb-2">
                    {orderPreview.studentName || orderPreview.studentId}
                  </div>
                  <div className="space-y-1 mb-3">
                    {(orderPreview.items || []).map((item, i) => (
                      <div key={i} className="text-xs text-gray-600">{item}</div>
                    ))}
                  </div>
                  <div className="text-lg font-bold text-primary mb-3">
                    金額：${orderPreview.total}
                  </div>
                  {orderPreview.status === '待取餐' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setNoShowTarget(orderPreview.orderId)}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors"
                      >
                        未取餐
                      </button>
                      <button
                        onClick={() => doConfirmPickup(orderPreview.orderId)}
                        disabled={confirming}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-3 py-2 rounded-xl
                          disabled:opacity-50 transition-colors"
                      >
                        {confirming ? '…' : '確認取餐'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 錯誤提示 */}
              {orderPreview?.error && (
                <div className="text-sm rounded-xl px-3 py-2 bg-red-50 text-red-600">
                  {orderPreview.error}
                </div>
              )}

              {confirmMsg.text && (
                <div className={`text-sm rounded-xl px-3 py-2 mt-2
                  ${confirmMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {confirmMsg.text}
                </div>
              )}
            </div>

            {ordersLoading && (
              <div className="text-center text-gray-400 py-8 text-sm">載入訂單中…</div>
            )}
            {!ordersLoading && todayOrders.length === 0 && (
              <div className="text-center text-gray-400 py-8 text-sm">
                <div className="text-3xl mb-2">📋</div>今日尚無訂單
              </div>
            )}
            {!ordersLoading && pendingCount > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-2.5 flex items-center gap-2">
                <span>⏳</span>
                <span className="text-sm text-orange-700 font-semibold">{pendingCount} 筆訂單待取餐</span>
              </div>
            )}
            {!ordersLoading && todayOrders.map((o) => (
              <OrderCard
                key={o.orderId}
                order={o}
                onComplete={(oid) => doConfirmPickup(oid)}
                onNoShow={(oid) => setNoShowTarget(oid)}
              />
            ))}
          </>
        )}
      </div>

      {/* ── 未取餐確認對話框 ── */}
      {noShowTarget && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => !noShowing && setNoShowTarget(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl text-center"
            onClick={e => e.stopPropagation()}>
            <div className="text-4xl mb-3">🚫</div>
            <h3 className="text-base font-black text-gray-800 mb-2">確認標記為未取餐？</h3>
            <p className="text-sm text-gray-500 mb-1 leading-relaxed">
              此操作將扣除該學生
              <strong className="text-red-600"> 15 積分</strong>
            </p>
            <p className="text-xs text-gray-400 mb-5">
              若積分低於 60 分，帳號將自動停權
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setNoShowTarget(null)}
                disabled={noShowing}
                className="flex-1 py-3 border border-gray-200 text-gray-600 text-sm font-semibold rounded-2xl disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={() => doMarkNoShow(noShowTarget)}
                disabled={noShowing}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-2xl disabled:opacity-50 transition-colors"
              >
                {noShowing ? '處理中…' : '確認扣分'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
