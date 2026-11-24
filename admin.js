// Owner-only admin: sign in, post items, manage orders, edit shop settings.
// The real protection is firestore.rules: even if someone reads this file,
// the database refuses every write that is not from the owner's email.
import { app, db, esc, ghs, when, waLink, loadSettings, safeImg, shrinkImage, CATEGORIES, toast } from "./common.js";
import { OWNER_EMAIL } from "./config.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { collection, doc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const auth = getAuth(app);
const $ = (s, r = document) => r.querySelector(s);
let tab = "items", items = [], orders = [], settings = {}, draft = null, draftImages = [];

const STATUSES = [["new", "New"], ["confirmed", "Confirmed"], ["paid", "Paid"], ["delivered", "Delivered / collected"], ["cancelled", "Cancelled"]];

/* ---------- sign in ---------- */
onAuthStateChanged(auth, async user => {
  const ok = user && user.email && user.email.toLowerCase() === OWNER_EMAIL.toLowerCase();
  if (user && !ok) {
    await signOut(auth);
    $("#login-err").innerHTML = '<p class="err" role="alert">This account is not the shop owner.</p>';
    return;
  }
  $("#login-sec").hidden = !!ok;
  $("#dash").hidden = !ok;
  if (ok) await start();
});

$("#login").addEventListener("submit", async e => {
  e.preventDefault();
  $("#login-err").innerHTML = "";
  try {
    await signInWithEmailAndPassword(auth, $("#email").value.trim(), $("#password").value);
  } catch (err) {
    $("#login-err").innerHTML = '<p class="err" role="alert">Wrong email or password.</p>';
  }
});
$("#signout").addEventListener("click", () => signOut(auth));

/* ---------- data ---------- */
async function start() {
  settings = await loadSettings();
  $("#brand").textContent = settings.shopName + " admin";
  await Promise.all([loadItems(), loadOrders()]);
  render();
}
async function loadItems() {
  const s = await getDocs(query(collection(db, "items"), orderBy("createdAt", "desc")));
  items = s.docs.map(d => ({ id: d.id, ...d.data() }));
}
async function loadOrders() {
  const s = await getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc")));
  orders = s.docs.map(d => ({ id: d.id, ...d.data() }));
}

/* ---------- render ---------- */
function render() {
  const fresh = orders.filter(o => o.status === "new").length;
  $("#tabs").innerHTML = [["items", "Items"], ["orders", "Orders" + (fresh ? ` (${fresh} new)` : "")], ["settings", "Settings"]]
    .map(t => `<button class="tab" data-tab="${t[0]}" aria-current="${tab === t[0]}">${esc(t[1])}</button>`).join("");
  $("#view").innerHTML = tab === "items" ? itemsHtml() : tab === "orders" ? ordersHtml() : settingsHtml();
}

function itemsHtml() {
  return `<div class="acts" style="justify-content:space-between;margin-block:12px"><h2>Your items</h2><button class="btn primary" data-act="new">Add an item</button></div>
  <div class="panel">${items.length ? items.map(i => {
    const img = safeImg((i.images || [])[0]);
    return `<div class="row">${img ? `<img class="thumb" src="${esc(img)}" alt="">` : '<div class="thumb"></div>'}
      <div class="t"><b>${esc(i.title)}</b><span>${ghs(i.price)} · ${i.inStock === false ? "Sold out" : "In stock"}</span></div>
      <div class="acts"><button class="btn sm" data-act="stock" data-id="${esc(i.id)}">${i.inStock === false ? "Mark in stock" : "Mark sold out"}</button>
      <button class="btn sm" data-act="edit" data-id="${esc(i.id)}">Edit</button>
      <button class="btn danger sm" data-act="delask" data-id="${esc(i.id)}">Remove</button></div></div>`;
  }).join("") : '<p class="empty">No items yet. Tap “Add an item” to post your first one with photos and a price.</p>'}</div>`;
}

function ordersHtml() {
  if (!orders.length) return '<div class="panel" style="margin-top:12px"><p class="empty">No orders yet. They appear here when a buyer taps “Send order on WhatsApp”.</p></div>';
  return '<div class="fields" style="margin-top:12px">' + orders.map(o => {
    const pay = settings.momoNumber ? ` Please pay GH₵ ${o.total} to MoMo ${settings.momoNumber}${settings.momoName ? " (" + settings.momoName + ")" : ""}, then send the screenshot.` : "";
    const reply = waLink(o.phone, `Hello ${o.name}, thank you for your order: ${o.title} × ${o.qty}. Total: ${ghs(o.total)}.${pay}`);
    return `<article class="panel"><div class="acts" style="justify-content:space-between">
      <b>${esc(o.title)} × ${esc(o.qty)}</b><span class="st ${esc(o.status)}">${esc((STATUSES.find(s => s[0] === o.status) || ["", o.status])[1])}</span></div>
      <p class="sub">${esc(when(o.createdAt))} · ${o.method === "pickup" ? "Pick-up" : "Delivery"} · Total ${ghs(o.total)}</p>
      <p><b>${esc(o.name)}</b> · ${esc(o.phone)}${o.method === "delivery" ? " · " + esc(o.address) : ""}</p>
      ${o.note ? `<p class="sub">Note: ${esc(o.note)}</p>` : ""}
      <div class="acts"><a class="btn wa sm" href="${esc(reply)}" target="_blank" rel="noopener">Reply on WhatsApp</a>
      <select data-status="${esc(o.id)}" aria-label="Order status" style="width:auto">${STATUSES.map(s => `<option value="${s[0]}"${s[0] === o.status ? " selected" : ""}>${s[1]}</option>`).join("")}</select>
      <button class="btn danger sm" data-act="delorder" data-id="${esc(o.id)}">Delete</button></div></article>`;
  }).join("") + "</div>";
}

function settingsHtml() {
  const f = (id, label, val, hint, type) => `<label class="f">${label}${hint ? `<small>${hint}</small>` : ""}<input id="${id}" type="${type || "text"}" value="${esc(val)}"></label>`;
  return `<form class="panel" data-form="settings" style="margin-top:12px"><h2>Shop settings</h2>
    ${f("s-name", "Shop name", settings.shopName)}
    ${f("s-tag", "Tagline", settings.tagline, "Shown under the shop name.")}
    ${f("s-wa", "WhatsApp number", settings.whatsapp, "Buyers are sent here. Example: 0241234567", "tel")}
    ${f("s-addr", "Pick-up address", settings.pickupAddress)}
    ${f("s-momo", "MoMo number (optional)", settings.momoNumber, "Added to the “Reply on WhatsApp” message.", "tel")}
    ${f("s-momon", "Name on the MoMo account (optional)", settings.momoName)}
    <div id="s-err"></div><button class="btn primary" type="submit">Save settings</button></form>`;
}

/* ---------- item form ---------- */
function modal(html) { const o = $("#ov"); o.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`; o.hidden = false; }
function closeModal() { $("#ov").hidden = true; $("#ov").innerHTML = ""; draft = null; draftImages = []; }
const head = t => `<div class="sh-head"><h2>${t}</h2><button class="x" data-act="close" aria-label="Close">✕</button></div>`;

function openItemForm(id) {
  const it = id ? items.find(x => x.id === id) : null;
  draft = it || {};
  draftImages = it && it.images ? it.images.slice() : [];
  modal(head(it ? "Edit item" : "Add an item") + `<form data-form="item" class="fields" novalidate>
    <label class="f">Photos<small>Up to 4. They are resized automatically.</small><input id="i-files" type="file" accept="image/*" multiple></label>
    <div class="pv" id="pv"></div>
    <label class="f">Item name<input id="i-title" value="${esc(draft.title)}" placeholder="e.g. 43-inch Smart LED TV"></label>
    <div class="two">
      <label class="f">Price (GH₵)<input id="i-price" type="number" min="0" step="0.01" inputmode="decimal" value="${esc(draft.price)}"></label>
      <label class="f">Category<select id="i-cat">${CATEGORIES.map(c => `<option${draft.category === c ? " selected" : ""}>${esc(c)}</option>`).join("")}</select></label>
    </div>
    <div class="two">
      <label class="f">Condition<select id="i-cond">${["New", "Used", "Refurbished"].map(c => `<option${draft.condition === c ? " selected" : ""}>${c}</option>`).join("")}</select></label>
      <label class="f">Stock<select id="i-stock"><option value="1"${draft.inStock !== false ? " selected" : ""}>In stock</option><option value="0"${draft.inStock === false ? " selected" : ""}>Sold out</option></select></label>
    </div>
    <label class="f">Description<textarea id="i-desc" placeholder="Size, model, warranty, what is in the box">${esc(draft.description)}</textarea></label>
    <div class="opts">
      <label class="opt"><input type="checkbox" id="i-deliv"${draft.delivery !== false ? " checked" : ""}><span><b>I can deliver this</b></span></label>
      <label class="f">Delivery fee (GH₵, 0 for free)<input id="i-fee" type="number" min="0" step="0.01" inputmode="decimal" value="${esc(draft.deliveryFee == null ? 0 : draft.deliveryFee)}"></label>
      <label class="opt"><input type="checkbox" id="i-pick"${draft.pickup !== false ? " checked" : ""}><span><b>Buyers can pick it up</b></span></label>
    </div>
    <div id="i-err"></div><button class="btn primary" id="i-save" type="submit">${it ? "Save changes" : "Post item"}</button></form>`);
  drawPv();
}
function drawPv() {
  const p = $("#pv"); if (!p) return;
  p.innerHTML = draftImages.map((u, i) => `<div><img src="${esc(u)}" alt="Photo ${i + 1}"><button type="button" data-act="rmimg" data-id="${i}" aria-label="Remove photo ${i + 1}">×</button></div>`).join("");
}
async function addFiles(files) {
  for (let i = 0; i < files.length && draftImages.length < 4; i++) {
    try { draftImages.push(await shrinkImage(files[i])); } catch (e) { toast("One photo could not be read."); }
  }
  drawPv();
  const f = $("#i-files"); if (f) f.value = "";
}

/* ---------- actions ---------- */
async function guard(fn, fail) {
  try { await fn(); } catch (e) { toast(fail || "That did not save. Check your internet and try again."); return false; }
  return true;
}

const ACT = {
  new: () => openItemForm(),
  edit: id => openItemForm(id),
  close: () => closeModal(),
  rmimg: id => { draftImages.splice(Number(id), 1); drawPv(); },
  stock: async id => {
    const it = items.find(x => x.id === id); if (!it) return;
    if (await guard(() => updateDoc(doc(db, "items", id), { inStock: it.inStock === false }))) { await loadItems(); render(); }
  },
  delask: id => {
    const it = items.find(x => x.id === id); if (!it) return;
    modal(head("Remove this item?") + `<p>${esc(it.title)} will disappear from the shop.</p>
      <div class="acts"><button class="btn danger" data-act="delgo" data-id="${esc(id)}">Remove item</button><button class="btn" data-act="close">Keep it</button></div>`);
  },
  delgo: async id => {
    if (await guard(() => deleteDoc(doc(db, "items", id)))) { closeModal(); await loadItems(); render(); toast("Item removed."); }
  },
  delorder: async id => {
    if (await guard(() => deleteDoc(doc(db, "orders", id)))) { await loadOrders(); render(); }
  }
};

const FORM = {
  item: async () => {
    const g = i => $("#" + i).value.trim();
    const price = Number(g("i-price")), dl = $("#i-deliv").checked, pk = $("#i-pick").checked;
    let err = "";
    if (!g("i-title")) err = "Give the item a name.";
    else if (!(price > 0)) err = "Enter a price above zero.";
    else if (!dl && !pk) err = "Choose delivery, pick-up or both.";
    else if (JSON.stringify(draftImages).length > 850000) err = "The photos are too large together. Remove one.";
    if (err) { $("#i-err").innerHTML = `<p class="err" role="alert">${esc(err)}</p>`; return; }
    const data = {
      title: g("i-title"), price, category: $("#i-cat").value, condition: $("#i-cond").value,
      description: g("i-desc"), inStock: $("#i-stock").value === "1", delivery: dl, pickup: pk,
      deliveryFee: Number(g("i-fee")) || 0, images: draftImages.slice(), updatedAt: serverTimestamp()
    };
    const btn = $("#i-save"); btn.disabled = true; btn.textContent = "Saving…";
    const ok = await guard(async () => {
      if (draft && draft.id) await updateDoc(doc(db, "items", draft.id), data);
      else await addDoc(collection(db, "items"), { ...data, createdAt: serverTimestamp() });
    }, "Could not save. Check your internet and try again.");
    if (!ok) { btn.disabled = false; btn.textContent = "Post item"; return; }
    closeModal(); await loadItems(); render(); toast("Item saved.");
  },
  settings: async () => {
    const g = i => $("#" + i).value.trim();
    const data = { shopName: g("s-name") || "Shop", tagline: g("s-tag"), whatsapp: g("s-wa"), pickupAddress: g("s-addr"), momoNumber: g("s-momo"), momoName: g("s-momon") };
    if (data.whatsapp.replace(/\D/g, "").length < 9) { $("#s-err").innerHTML = '<p class="err" role="alert">Enter a valid WhatsApp number.</p>'; return; }
    if (await guard(() => setDoc(doc(db, "settings", "shop"), data))) {
      settings = { ...settings, ...data }; $("#brand").textContent = settings.shopName + " admin"; toast("Settings saved."); render();
    }
  }
};

document.addEventListener("click", e => {
  if (e.target.id === "ov") return closeModal();
  const t = e.target.closest("[data-tab]");
  if (t) { tab = t.dataset.tab; return render(); }
  const a = e.target.closest("[data-act]");
  if (a && ACT[a.dataset.act]) ACT[a.dataset.act](a.dataset.id);
});
document.addEventListener("submit", e => {
  const f = e.target.closest("[data-form]");
  if (f) { e.preventDefault(); FORM[f.dataset.form](); }
});
document.addEventListener("change", async e => {
  if (e.target.id === "i-files") addFiles(e.target.files);
  const s = e.target.closest("[data-status]");
  if (s) {
    if (await guard(() => updateDoc(doc(db, "orders", s.dataset.status), { status: s.value }))) { await loadOrders(); render(); }
  }
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#ov").hidden) closeModal(); });
