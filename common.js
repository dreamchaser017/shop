// Shared helpers used by both the public shop and the admin page.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig, DEFAULTS } from "./config.js";

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export const CATEGORIES = [
  "TVs", "Fridges & freezers", "Air conditioners", "Kitchen appliances",
  "Fans & cooling", "Water", "Eggs & groceries", "Other"
];

export function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function ghs(n) {
  return "GH₵ " + Number(n || 0).toLocaleString("en-GH", { maximumFractionDigits: 2 });
}

export function when(ts) {
  const d = ts && ts.toDate ? ts.toDate() : new Date();
  return d.toLocaleString("en-GH", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

// 0241234567 -> 233241234567 (the format WhatsApp links need)
export function waNumber(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "233" + d.slice(1);
  return d;
}

export function waLink(number, text) {
  return "https://wa.me/" + waNumber(number) + "?text=" + encodeURIComponent(text);
}

export function safeImg(u) {
  return typeof u === "string" && u.startsWith("data:image/") ? u : "";
}

export async function loadSettings() {
  try {
    const snap = await getDoc(doc(db, "settings", "shop"));
    return { ...DEFAULTS, ...(snap.exists() ? snap.data() : {}) };
  } catch (e) {
    return { ...DEFAULTS };
  }
}

// Shrinks a photo so several fit in one database record.
export function shrinkImage(file, max = 720, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad image")); };
    img.src = url;
  });
}

export function toast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  clearTimeout(toast.h);
  toast.h = setTimeout(() => { t.textContent = ""; }, 3500);
}
