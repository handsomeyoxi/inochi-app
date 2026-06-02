import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc, query, where } from "firebase/firestore";

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

/* 店家基本資訊對應表 */
const STORE_INFO = {
  sushi01: {
    address: "桃園市中壢區中北路168號",
    phone: "03-4561234",
    hours: "11:00-21:00",
    email: "sushi01@inochi.com"
  },
  drink01: {
    address: "桃園市中壢區實踐路52號",
    phone: "03-4523456",
    hours: "10:00-22:00",
    email: "drink01@inochi.com"
  },
  bread01: {
    address: "桃園市中壢區日新路88號",
    phone: "03-4534567",
    hours: "08:00-20:00",
    email: "bread01@inochi.com"
  },
  bento01: {
    address: "桃園市中壢區中北路220號",
    phone: "03-4545678",
    hours: "10:30-19:30",
    email: "bento01@inochi.com"
  },
  oden01: {
    address: "桃園市中壢區龍岡路一段12號",
    phone: "03-4556789",
    hours: "14:00-23:00",
    email: "oden01@inochi.com"
  },
  john1234: {
    address: "桃園市中壢區大仁街45號",
    phone: "0912-345678",
    hours: "16:00-24:00",
    email: "john1234@inochi.com"
  },
  xin1234: {
    address: "桃園市中壢區三和路78號",
    phone: "0923-456789",
    hours: "15:00-23:30",
    email: "xin1234@inochi.com"
  }
};

/* 初始化店家基本資訊（地址、電話、營業時間、信箱） */
export async function initializeStoreInfo() {
  console.log('📋 開始補充店家基本資訊...');
  try {
    const updates = [];

    for (const [username, info] of Object.entries(STORE_INFO)) {
      const q = query(collection(db, 'stores'), where('username', '==', username));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const docRef = snap.docs[0].ref;
        const storeData = snap.docs[0].data();

        // 檢查是否已有完整資訊
        const needsUpdate = !storeData.address || !storeData.phone || !storeData.hours || !storeData.email;

        if (needsUpdate) {
          updates.push(updateDoc(docRef, info));
          console.log(`✅ 更新 ${storeData.name || username} 資訊`);
        } else {
          console.log(`✓ ${storeData.name || username} 已有完整資訊`);
        }
      } else {
        console.log(`⚠️ 找不到店家 ${username}`);
      }
    }

    if (updates.length > 0) {
      await Promise.all(updates);
      console.log(`✅ 店家資訊補充完成：${updates.length} 間店家`);
    } else {
      console.log('✓ 所有店家都已有完整資訊');
    }
  } catch (err) {
    console.error('❌ 補充店家資訊失敗:', err);
  }
}
