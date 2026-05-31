import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

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
