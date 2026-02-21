import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDe4LvfsmlWK3m5U4wzFrXqf2y5_tYBVRc",
    authDomain: "typezero-81699.firebaseapp.com",
    projectId: "typezero-81699",
    storageBucket: "typezero-81699.firebasestorage.app",
    messagingSenderId: "569774984922",
    appId: "1:569774984922:web:50660b1b248c74a2c7dfe3",
    measurementId: "G-6PPW6Y6WSY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
import { getAuth } from "firebase/auth";
export const auth = getAuth(app);
