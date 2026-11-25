// ============================================================
//  config.js  -  the ONLY file you must edit before going live
// ============================================================

// 1) Paste the values Firebase gives you (README, Step 2).
export const firebaseConfig = {
  apiKey: "AIzaSyBYR8LxayJwpRXrDA62fGgAbKP2fEhnBqw",
  authDomain: "shopping-website-d9799.firebaseapp.com",
  projectId: "shopping-website-d9799",
  storageBucket: "shopping-website-d9799.firebasestorage.app",
  messagingSenderId: "813122610476",
  appId: "1:813122610476:web:9bec2eb0dd2abb95d3b889"
};

// 2) The email you will use to log in to admin.html.
//    It must be the same email you put in firestore.rules.
export const OWNER_EMAIL = "antwirichmond851@gmail.com";

// 3) Starting values. After you log in you can change all of these
//    from the Settings tab in admin.html without touching the code.
export const DEFAULTS = {
  shopName: "RICHGENE Clothing",
  tagline: "Quality clothing, delivered to you or ready for pick-up",
  whatsapp: "0597548890",          // your WhatsApp number, e.g. 0241234567
  pickupAddress: "Freedom Stores Lane, Koforidua",
  momoNumber: "",                  // optional, used in the "send payment details" message
  momoName: ""                     // optional, the name on that MoMo account
};
