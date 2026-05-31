import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import mockStores from '../data/mockStores';

const TYPE_EMOJI = { '壽司': '🍣', '飲料': '🧋', '麵包': '🍞', '便當': '🍱', '關東煮': '🍢' };
const FILTERS = ['全部', '壽司', '飲料', '麵包', '便當', '關東煮'];

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
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('全部');
  const [selected, setSelected] = useState(null);
  const [stockMap, setStockMap] = useState({}); // storeName → total stock

  /* 從 Firestore 讀取各店庫存 */
  useEffect(() => {
    getDocs(collection(db, 'products')).then(snap => {
      const map = {};
      snap.docs.forEach(d => {
        const p = d.data();
        if (!map[p.storeId]) map[p.storeId] = 0;
        if (p.available !== false) map[p.storeId] += (p.stock ?? 0);
      });
      setStockMap(map);
    }).catch(() => {});
  }, []);

  /* 判斷一間店是否有貨（優先 Firestore，fallback mockStore） */
  const isStoreAvailable = (store) => {
    if (Object.keys(stockMap).length === 0) return store.is_available;
    return (stockMap[store.name] ?? 0) > 0;
  };

  const filtered = useMemo(
    () =>
      mockStores.filter((s) => {
        const matchType = filter === '全部' || s.type === filter;
        const matchSearch = !search || s.name.includes(search);
        return matchType && matchSearch;
      }),
    [search, filter]
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
          <div className="px-5 pb-6 pt-3">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

            {/* Store header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-3xl">{TYPE_EMOJI[selected.type]}</span>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">{selected.name}</h2>
                  <span className="text-xs text-gray-400">{selected.type}</span>
                </div>
              </div>
              {(() => {
                const avail = isStoreAvailable(selected);
                return (
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full mt-1
                    ${avail ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {avail ? '✅ 供應中' : '⭕ 已售完'}
                  </span>
                );
              })()}
            </div>

            {/* Price / Stock / Deadline */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: '原價', value: `$${selected.original_price}`, sub: true },
                { label: '惜食價', value: `$${selected.special_price}`, accent: true },
                { label: '剩餘數量', value: `${selected.stock_quantity} 份` },
              ].map(({ label, value, sub, accent }) => (
                <div key={label} className="bg-orange-50 rounded-xl p-2.5 text-center">
                  <div className="text-[10px] text-gray-500 mb-0.5">{label}</div>
                  <div
                    className={`text-sm font-bold
                      ${accent ? 'text-primary text-base' : sub ? 'text-gray-400 line-through' : 'text-gray-700'}`}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>

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
