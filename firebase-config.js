// ==============================================
// FIREBASE CONFIG — YAHAN APNA PROJECT CONFIG PASTE KAREIN
// ==============================================
// Firebase Console > Project Settings > "Your apps" > Web app (</>) se
// ye config milega. Neeche wale placeholder values ko replace kar dein.

const firebaseConfig = {
  apiKey: "AIzaSyCLuISx7EayZkJkdat1Kb1VPdgZRVefgmw",
  authDomain: "tasty-food-point-93be0.firebaseapp.com",
  projectId: "tasty-food-point-93be0",
  storageBucket: "tasty-food-point-93be0.firebasestorage.app",
  messagingSenderId: "325235460606",
  appId: "1:325235460606:web:efd70e4945eeeee060d8af"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
