import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
const firebaseConfig = {
  apiKey: "AIzaSyB7GOl3CG0ARg5F4ftGBfER3-5sx1gM75U",
  authDomain: "habit-builder-f86b4.firebaseapp.com",
  projectId: "habit-builder-f86b4",
  storageBucket: "habit-builder-f86b4.firebasestorage.app",
  messagingSenderId: "19369430189",
  appId: "1:19369430189:web:b4793d1ac3521e8a4b8a24",
  measurementId: "G-ZB86ME7PPP",
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
export const google = new GoogleAuthProvider();
google.setCustomParameters({ prompt: "select_account" });
