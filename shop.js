// Public shop: browse items, order or ask a question on WhatsApp.
import { db, esc, ghs, waLink, loadSettings, safeImg, CATEGORIES, toast } from "./common.js";
import { collection, getDocs, query, orderBy, addDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const $ = (s, r = document) => r.querySelector(s);
let settings, items = [], cat = "All", q = "", current = null;

init();

async function init() {
  settings = await loadSettings();
  document.title = settings.shopName + " | Shop";
  $("#brand").textContent = settings.shopName;
  $("#tagline").textContent = settings.tagline || "";
  $("#addr").textContent = settings.pickupAddress || "";
  const hello = waLink(settings.whatsapp, `Hello ${settings.shopName}, I have a question about your shop.`);
  $("#wa-top").href = hello;
  $("#wa-foot").href = hello;
  try {
    const snap = await getDocs(query(collection(db, "items"), orderBy("createdAt", "desc")));
    items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    $("#grid").innerHTML = '<p class="empty">The shop could not load. Check your internet and refresh the page.</p>';
    return;
  }
  render();
}

function render() {
  $("#pills").innerHTML = ["All", ...CATEGORIES].map(c =>
    `<button class="pill-b" data-cat="${esc(c)}" aria-pressed="${cat === c}">${esc(c)}</button>`).join("");
  const term = q.trim().toLowerCase();
  const rows = items.filter(i =>
    (cat === "All" || i.category === cat) &&
    (!term || ((i.title || "") + " " + (i.description || "")).toLowerCase().includes(term)));
  if (!items.length) {
    $("#grid").innerHTML = '<p class="empty">No items yet. Please check back soon, or message us on WhatsApp.</p>';
  } else if (!rows.length) {
    $("#grid").innerHTML = '<p class="empty">No items match. Try another word or category.</p>';
  } else {
    $("#grid").innerHTML = '<div class="grid">' + rows.map(card).join("") + "</div>";
  }
}

function fulfil(i) {
  const a = [];
  if (i.delivery) a.push("Delivery");
  if (i.pickup) a.push("Pick-up");
  return a.join(" or ") || "Ask us";
}

function card(i) {
  const img = safeImg((i.images || [])[0]);
  return `<article class="card" data-open="${esc(i.id)}" tabindex="0" role="button" aria-label="${esc(i.title)}">
    <div class="ph">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : `<span>${esc(i.category || "Item")}</span>`}
      ${i.inStock === false ? '<em class="tagbadge">Sold out</em>' : ""}</div>
    <div class="cb"><h3>${esc(i.title)}</h3><p class="price">${ghs(i.price)}</p>
      <p class="sub">${esc(i.condition || "")} · ${esc(fulfil(i))}</p></div></article>`;
}

function modal(html) {
  const o = $("#ov");
  o.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  o.hidden = false;
}
function closeModal() { $("#ov").hidden = true; $("#ov").innerHTML = ""; current = null; }
const head = t => `<div class="sh-head"><h2>${t}</h2><button class="x" data-close aria-label="Close">✕</button></div>`;

function openItem(id) {
  const i = items.find(x => x.id === id);
  if (!i) return;
  current = i;
  const imgs = (i.images || []).map(safeImg).filter(Boolean);
  const out = i.inStock === false;
  const ask = waLink(settings.whatsapp,
    `Hello ${settings.shopName}, I am interested in: ${i.title} (${ghs(i.price)}). Is it available?`);
  modal(head(esc(i.title)) +
    `<div class="gal"><div class="big" id="big">${imgs[0] ? `<img src="${esc(imgs[0])}" alt="">` : "<span>No photo yet</span>"}</div>` +
    (imgs.length > 1 ? `<div class="ths">${imgs.map((u, n) =>
      `<img src="${esc(u)}" alt="Photo ${n + 1}" data-photo="${n}" aria-current="${n === 0}">`).join("")}</div>` : "") + "</div>" +
    `<p class="price" style="font-size:1.5rem">${ghs(i.price)}</p>
     <div class="facts"><span>${esc(i.category || "Other")}</span><span>${esc(i.condition || "New")}</span><span>${out ? "Sold out" : "In stock"}</span></div>
     <p class="desc">${esc(i.description || "")}</p>
     <div class="panel" style="background:var(--soft);border:0">
       ${i.delivery ? `<p><b>Delivery</b> ${Number(i.deliveryFee) ? ghs(i.deliveryFee) : "free"}</p>` : ""}
       ${i.pickup ? `<p><b>Pick-up</b> ${esc(settings.pickupAddress || "ask us")}</p>` : ""}
     </div>
     <div class="acts"><button class="btn wa" data-order ${out ? "disabled" : ""}>Order on WhatsApp</button>
     <a class="btn" href="${esc(ask)}" target="_blank" rel="noopener">Ask a question</a></div>`);
}

function openOrderForm() {
  const i = current;
  if (!i) return;
  const m = i.delivery ? "delivery" : "pickup";
  modal(head("Your order") +
    `<form id="of" class="fields" novalidate>
      <p><b>${esc(i.title)}</b> · ${ghs(i.price)}</p>
      <div class="two">
        <label class="f">Quantity<input id="of-qty" type="number" min="1" max="100" value="1" inputmode="numeric"></label>
        <label class="f">Your name<input id="of-name" autocomplete="name"></label>
      </div>
      <label class="f">Your phone number<input id="of-phone" type="tel" autocomplete="tel" placeholder="024 000 0000"></label>
      <div class="opts" role="radiogroup" aria-label="How do you want to get it?">
        <label class="opt"><input type="radio" name="m" value="delivery" ${m === "delivery" ? "checked" : ""} ${i.delivery ? "" : "disabled"}>
          <span><b>Delivery</b><small>${i.delivery ? (Number(i.deliveryFee) ? ghs(i.deliveryFee) + " delivery fee" : "Free delivery") : "Not offered for this item"}</small></span></label>
        <label class="opt"><input type="radio" name="m" value="pickup" ${m === "pickup" ? "checked" : ""} ${i.pickup ? "" : "disabled"}>
          <span><b>Pick-up</b><small>${i.pickup ? esc(settings.pickupAddress || "Collect from us") : "Not offered for this item"}</small></span></label>
      </div>
      <label class="f" id="of-addr-w">Delivery address<small>Area, landmark and house number.</small><textarea id="of-addr"></textarea></label>
      <label class="f">Note to the seller (optional)<input id="of-note" maxlength="200"></label>
      <div class="sum" id="of-sum"></div>
      <p class="sub">You pay in WhatsApp after we confirm the order. Nothing is charged on this page.</p>
      <div id="of-err"></div>
      <button class="btn wa" id="of-go" type="submit">Send order on WhatsApp</button>
    </form>`);
  updateSum();
}

function formState() {
  const i = current;
  const qty = Math.min(100, Math.max(1, Math.floor(Number($("#of-qty").value) || 1)));
  const m = ($("input[name=m]:checked") || {}).value || (i.delivery ? "delivery" : "pickup");
  const fee = m === "delivery" ? (Number(i.deliveryFee) || 0) : 0;
  return { qty, m, fee, sub: qty * Number(i.price), total: qty * Number(i.price) + fee };
}

function updateSum() {
  const s = formState();
  $("#of-addr-w").hidden = s.m !== "delivery";
  $("#of-sum").innerHTML =
    `<div><span>${s.qty} × ${ghs(current.price)}</span><span>${ghs(s.sub)}</span></div>
     <div><span>${s.m === "delivery" ? "Delivery" : "Pick-up"}</span><span>${s.fee ? ghs(s.fee) : "Free"}</span></div>
     <div class="tot"><span>Total to pay</span><span>${ghs(s.total)}</span></div>`;
}

async function submitOrder() {
  const i = current, s = formState();
  const name = $("#of-name").value.trim();
  const phone = $("#of-phone").value.trim();
  const address = $("#of-addr").value.trim();
  const note = $("#of-note").value.trim();
  let err = "";
  if (!name) err = "Enter your name.";
  else if (phone.replace(/\D/g, "").length < 9) err = "Enter a phone number we can call.";
  else if (s.m === "delivery" && !address) err = "Enter the delivery address.";
  if (err) { $("#of-err").innerHTML = `<p class="err" role="alert">${esc(err)}</p>`; return; }

  const lines = [
    `Hello ${settings.shopName}, I would like to order:`,
    `• ${i.title} × ${s.qty} (${ghs(i.price)} each)`,
    s.m === "delivery" ? `Delivery (${s.fee ? ghs(s.fee) : "free"}) to: ${address}` : "Pick-up at the shop",
    `Total: ${ghs(s.total)}`,
    `Name: ${name}`,
    `Phone: ${phone}`
  ];
  if (note) lines.push(`Note: ${note}`);
  lines.push("Please send the payment details.");
  const link = waLink(settings.whatsapp, lines.join("\n"));

  const btn = $("#of-go");
  btn.disabled = true;
  btn.textContent = "Opening WhatsApp…";
  // Save a copy so the shop owner sees it in the admin page. If this fails, WhatsApp still opens.
  const record = {
    itemId: i.id, title: String(i.title), price: Number(i.price), qty: s.qty, total: s.total,
    method: s.m, name, phone, address, note, status: "new", createdAt: serverTimestamp()
  };
  try {
    await Promise.race([addDoc(collection(db, "orders"), record), new Promise(r => setTimeout(r, 2000))]);
  } catch (e) { /* the WhatsApp message is the real order */ }
  window.location.href = link;
}

document.addEventListener("click", e => {
  if (e.target.id === "ov" || e.target.closest("[data-close]")) return closeModal();
  const c = e.target.closest("[data-cat]");
  if (c) { cat = c.dataset.cat; return render(); }
  const o = e.target.closest("[data-open]");
  if (o) return openItem(o.dataset.open);
  if (e.target.closest("[data-order]")) return openOrderForm();
  const p = e.target.closest("[data-photo]");
  if (p && current) {
    const imgs = (current.images || []).map(safeImg).filter(Boolean);
    $("#big").innerHTML = `<img src="${esc(imgs[Number(p.dataset.photo)])}" alt="">`;
    document.querySelectorAll(".ths img").forEach((x, n) => x.setAttribute("aria-current", String(n === Number(p.dataset.photo))));
  }
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !$("#ov").hidden) closeModal();
  if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches(".card[data-open]")) {
    e.preventDefault(); openItem(e.target.dataset.open);
  }
});
document.addEventListener("input", e => {
  if (e.target.id === "q") { q = e.target.value; render(); }
  if (e.target.closest && e.target.closest("#of")) updateSum();
});
document.addEventListener("change", e => { if (e.target.closest && e.target.closest("#of")) updateSum(); });
document.addEventListener("submit", e => {
  if (e.target.id === "of") { e.preventDefault(); submitOrder(); }
});
