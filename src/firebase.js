import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCHOY47i-2OnvrrJcDCq769fRL_p8fIG0c",
  authDomain: "inochi-app-37608.firebaseapp.com",
  projectId: "inochi-app-37608",
  storageBucket: "inochi-app-37608.firebasestorage.app",
  messagingSenderId: "564707837050",
  appId: "1:564707837050:web:1b433620043c82c552a7c3",
  measurementId: "G-CG21MSC087"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

/* 店家座標對應表 */
const STORE_COORDS_MAP = {
  sushi01:  { lat: 24.9578, lng: 121.2401 },
  drink01:  { lat: 24.9562, lng: 121.2389 },
  bread01:  { lat: 24.9551, lng: 121.2412 },
  bento01:  { lat: 24.9588, lng: 121.2398 },
  oden01:   { lat: 24.9544, lng: 121.2425 },
  john1234: { lat: 24.9565, lng: 121.2408 },
  xin1234:  { lat: 24.9572, lng: 121.2415 },
};

/* 中原大學附近預設座標 */
const DEFAULT_CENTER = { lat: 24.9562, lng: 121.2424 };
const OFFSET_RANGE = 0.002; // ±0.002 度，約 200 公尺

/* 為 Firestore 中沒有座標的店家補上座標 */
export async function fillMissingCoordinates() {
  console.log('🗺️ 開始補充店家座標...');
  try {
    const snap = await getDocs(collection(db, 'stores'));
    const updates = [];

    for (const docSnap of snap.docs) {
      const data = docSnap.data();

      // 若已有座標，跳過
      if (data.lat && data.lng) {
        console.log(`✓ ${data.name} (${data.username}) 已有座標: ${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}`);
        continue;
      }

      // 根據 username 查找座標
      let coords = STORE_COORDS_MAP[data.username];
      if (!coords) {
        // 若無對應座標，隨機偏移中原附近
        const offsetLat = (Math.random() - 0.5) * 2 * OFFSET_RANGE;
        const offsetLng = (Math.random() - 0.5) * 2 * OFFSET_RANGE;
        coords = {
          lat: DEFAULT_CENTER.lat + offsetLat,
          lng: DEFAULT_CENTER.lng + offsetLng,
        };
        console.log(`📍 ${data.name} (${data.username}) 使用隨機座標: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
      } else {
        console.log(`📍 ${data.name} (${data.username}) 使用對應座標: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
      }

      // 加入更新隊列
      updates.push(updateDoc(doc(db, 'stores', docSnap.id), coords));
    }

    // 批量更新
    if (updates.length > 0) {
      await Promise.all(updates);
      console.log(`✅ 補充座標完成：${updates.length} 間店家`);
    } else {
      console.log('✓ 所有店家都已有座標');
    }
  } catch (err) {
    console.error('❌ 補充座標失敗:', err);
  }
}
