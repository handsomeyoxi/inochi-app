import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, getDocs, query, where, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import mockStores from '../data/mockStores';

const TYPE_EMOJI = { '壽司': '🍣', '飲料': '🧋', '麵包': '🍞', '便當': '🍱', '關東煮': '🍢' };
const FILTERS = ['全部', '壽司', '飲料', '麵包', '便當', '關東煮'];

/* 5 間預設店家資料 */
const DEFAULT_STORES = [
  { username: 'sushi01', name: '濱海迴轉壽司', type: '壽司', address: '桃園市中壢區中北路200號附近', lat: 24.9562, lng: 121.2424, password: '12345678' },
  { username: 'drink01', name: '小Q飲料坊', type: '飲料', address: '桃園市中壢區實踐路附近', lat: 24.9555, lng: 121.2418, password: '12345678' },
  { username: 'bread01', name: '老師傅麵包坊', type: '麵包', address: '桃園市中壢區日新路附近', lat: 24.9548, lng: 121.2430, password: '12345678' },
  { username: 'bento01', name: '阿嬤的便當', type: '便當', address: '桃園市中壢區中北路150號附近', lat: 24.9570, lng: 121.2415, password: '12345678' },
  { username: 'oden01', name: '熱呼呼關東煮', type: '關東煮', address: '桃園市中壢區龍岡路附近', lat: 24.9540, lng: 121.2435, password: '12345678' },
];

const makeIcon = (isAvailable, type) =>
  L.divIcon({
    className: '',
    html: `<div style="
      width:44px;height:44px;border-radius:50%;
      background:${isAvailable ? '#22c55e' : '#9ca3af'};
      border:3px solid white;
      box-shadow:0 2px 12px rgba(0,0,0,0.28);
      display:flex;align-items:center;justify-content:center;
      font-size:22px;cursor:pointer;
    ">${TYPE_EMOJI[type] || '🏪'}</div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });

function MapClickHandler({ onClose }) {
  useMapEvents({ click: onClose });
  return null;
}

export default function MapPage() {
  const navigate = useNavigate();
  const [search,        setSearch]        = useState('');
  const [filter,        setFilter]        = useState('全部');
  const [selected,      setSelected]      = useState(null);
  const [stores,        setStores]        = useState([]);
  const [stockMap,      setStockMap]      = useState({}); // storeName → total stock
  const [selectedBox,   setSelectedBox]   = useState(null); // 選中店家的驚喜包商品

  /* 初始化預設店家（若不存在） */
  useEffect(() => {
    (async () => {
      try {
        for (const defaultStore of DEFAULT_STORES) {
          const snap = await getDocs(query(collection(db, 'stores'), where('username', '==', defaultStore.username)));
          if (snap.empty) {
            await addDoc(collection(db, 'stores'), defaultStore);
          }
        }
      } catch { /* 初始化失敗，忽略 */ }
    })();
  }, []);

  /* 從 Firestore 讀取店家 */
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'stores'));
        const storeList = snap.docs.map(d => {
          const data = d.data();
          return {
            ...data,
            id: data.username, // 使用 username 作為 id
            lat: data.lat ?? 24.9562,
            lng: data.lng ?? 121.2424,
          };
        });
        setStores(storeList);
      } catch { /* 空列表 */ }
    })();
  }, []);

  /* 即時監聽所有店家庫存 */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'products'), (snap) => {
      const total = {};
      snap.docs.forEach(d => {
        const p = d.data();
        if (!total[p.storeId]) total[p.storeId] = 0;
        if (p.available !== false) total[p.storeId] += (p.stock ?? 0);
      });
      setStockMap(total);
    }, () => {});
    return () => unsub();
  }, []);

  /* 當選中店家時，讀取該店家的驚喜包商品 */
  useEffect(() => {
    if (!selected?.name) { setSelectedBox(null); return; }
    (async () => {
      try {
        const snap = await getDocs(query(
          collection(db, 'products'),
          where('storeId', '==', selected.name),
          where('isBox', '==', true)
        ));
        if (!snap.empty) {
          setSelectedBox(snap.docs[0].data());
        } else {
          setSelectedBox(null);
        }
      } catch {
        setSelectedBox(null);
      }
    })();
  }, [selected?.name]);

  /* 判斷一間店是否有貨（庫存 > 0） */
  const isStoreAvailable = (store) => (stockMap[store.name] ?? 0) > 0;

  /* 篩選店家 */
  const filtered = useMemo(
    () =>
      stores.filter((s) => {
        const matchType = filter === '全部' || s.type === filter;
        const matchSearch = !search || s.name.includes(search);
        return matchType && matchSearch;
      }),
    [stores, search, filter]
  );

  return (
    <div className="relative w-full h-full">
      {/* ── Search + Filter overlay ── */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-3 space-y-2 pointer-events-none">
        <div className="pointer-events-auto">
          <div className="flex items-center bg-white rounded-2xl shadow-lg px-4 py-2.5 gap-2">
            <span className="text-gray-400 text-lg">🔍</span>
            <input
              className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400 bg-transparent"
              placeholder="搜尋店家名稱…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-gray-400 text-sm">✕</button>
            )}
          </div>
        </div>

        <div className="pointer-events-auto flex gap-2 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-md transition-all
                ${filter === f
                  ? 'bg-primary text-white shadow-orange-200'
                  : 'bg-white text-gray-600'
                }`}
            >
              {f !== '全部' && TYPE_EMOJI[f]} {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Map ── */}
      <MapContainer
        center={[24.9562, 121.2424]}
        zoom={17}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onClose={() => setSelected(null)} />
        {filtered.map((store) => (
          <Marker
            key={store.id}
            position={[store.lat, store.lng]}
            icon={makeIcon(isStoreAvailable(store), store.type)}
            eventHandlers={{ click: (e) => { e.originalEvent.stopPropagation(); setSelected(store); } }}
          />
        ))}
      </MapContainer>

      {/* ── Bottom Sheet ── */}
      <div
        className={`absolute left-0 right-0 bottom-0 z-[2000] bg-white rounded-t-3xl shadow-2xl
          transition-transform duration-300 ease-out
          ${selected ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {selected && (
          <div className="px-5 pb-6 pt-4 relative">
            <button
              onClick={() => setSelected(null)}
              className="absolute top-3 right-4 w-8 h-8 flex items-center justify-center
                rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 text-base font-bold transition-colors"
            >
              ✕
            </button>

            {/* Store header */}
            {(() => {
              const avail = isStoreAvailable(selected);
              return (
                <div className="flex items-center gap-3 mb-4 pr-10">
                  <span className="text-3xl shrink-0">{TYPE_EMOJI[selected.type]}</span>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-gray-800 truncate">{selected.name}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">{selected.type}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0
                        ${avail ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {avail ? '✅ 供應中' : '⭕ 已售完'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Price / Stock / Deadline */}
            {(() => {
              const liveStock = stockMap[selected.name] ?? 0;
              const soldOut   = liveStock === 0;
              const oriPrice = selectedBox?.originalPrice ?? selected.original_price ?? 0;
              const spePrice = selectedBox?.specialPrice ?? selected.special_price ?? 0;
              return (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: '原價',   value: `$${oriPrice}`, sub: true   },
                    { label: '惜食價', value: `$${spePrice}`,  accent: true },
                    { label: '剩餘數量',
                      value: soldOut ? '已售完' : `${liveStock} 份`,
                      sold: soldOut },
                  ].map(({ label, value, sub, accent, sold }) => (
                    <div key={label} className="bg-orange-50 rounded-xl p-2.5 text-center">
                      <div className="text-[10px] text-gray-500 mb-0.5">{label}</div>
                      <div className={`text-sm font-bold
                        ${accent ? 'text-primary text-base'
                          : sub  ? 'text-gray-400 line-through'
                          : sold ? 'text-red-500'
                          : 'text-gray-700'}`}>
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <span>⏰</span>
              <span>
                取餐截止：<strong className="text-gray-700">{selected.pickup_deadline}</strong>
              </span>
            </div>

            {(() => {
              const avail = isStoreAvailable(selected);
              return (
                <button
                  disabled={!avail}
                  onClick={() => navigate('/products', { state: { store: selected } })}
                  className={`w-full py-3.5 rounded-2xl font-bold text-white text-base transition-all
                    ${avail ? 'bg-primary hover:bg-primary-dark active:scale-[0.97]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                >
                  {avail ? '立即預訂 →' : '已無庫存'}
                </button>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
