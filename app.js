/* Citation du jour — logique de l'application et génération de la fiche image */

const FORMATS = {
  story:  { w: 1080, h: 1350, quoteMax: 74, quoteMin: 40, pad: 108, eyebrowY: 150, brandY: 1240 },
  square: { w: 1080, h: 1080, quoteMax: 68, quoteMin: 36, pad: 96,  eyebrowY: 120, brandY: 980 },
  wide:   { w: 1200, h: 630,  quoteMax: 54, quoteMin: 28, pad: 84,  eyebrowY: 96,  brandY: 556 }
};

const COLORS = { paper: "#F7F4EC", ink: "#1F3A5F", soft: "#5A6B7B", gold: "#B08D57", line: "#E2DBCD" };

const FAV_KEY = "cdj-favs";
const NOTIF_KEY = "cdj-notif";

let DATA = [];
let index = 0;
let theme = localStorage.getItem("cdj-theme") || "light";
let favs = [];
try { favs = JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch { favs = []; }
if (!Array.isArray(favs)) favs = [];
let notif = { enabled: false, time: "08:00", last: "" };
try { notif = { ...notif, ...JSON.parse(localStorage.getItem(NOTIF_KEY) || "{}") }; } catch { /* défaut */ }
let notifTimer = null;
let toastTimer = null;

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function toast(msg) {
  const el = $("status");
  if (!el) return;
  el.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.textContent = ""; }, 3600);
}

const $ = (id) => document.getElementById(id);
const fmtLong = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

async function boot() {
  document.documentElement.dataset.theme = theme;
  if (Array.isArray(window.CALENDRIER_DATA)) {
    DATA = window.CALENDRIER_DATA;
  } else {
    try {
      const res = await fetch("data/calendrier.json", { cache: "no-cache" });
      DATA = await res.json();
    } catch (err) {
      $("quote").textContent = "Calendrier indisponible.";
      $("hint").textContent = "Ouvrez la page depuis un serveur local (python serve.py) ou vérifiez data/calendrier.js.";
      return;
    }
  }
  const param = new URLSearchParams(location.search).get("date");
  const target = param || todayISO();
  const found = DATA.findIndex((r) => r.date === target);
  index = found >= 0 ? found : 0;
  render();
  wire();
  initFav();
  initNotif();
  registerSW();
}

function current() { return DATA[index]; }

function render() {
  const r = current();
  if (!r) return;
  $("eyebrow").textContent = r.theme ? `Citation du jour · ${r.theme}` : "Citation du jour";
  $("quote").textContent = r.citation;
  $("author").textContent = r.auteur;
  const srcOk = r.source && !r.source.startsWith("Attribuée") && r.source !== "Tradition orale" && r.source !== "Attribution traditionnelle";
  $("source").textContent = srcOk ? r.source : "";
  const d = new Date(r.date + "T12:00:00");
  $("dayLabel").textContent = capitalize(fmtLong.format(d)) + (r.ferie ? ` · ${r.ferie}` : "");
  $("prevBtn").disabled = index === 0;
  $("nextBtn").disabled = index === DATA.length - 1;
  document.title = `${r.auteur} — Citation du jour`;
  paintFav();
}

function wire() {
  $("prevBtn").onclick = () => { if (index > 0) { index--; render(); } };
  $("nextBtn").onclick = () => { if (index < DATA.length - 1) { index++; render(); } };
  $("themeBtn").onclick = () => {
    theme = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("cdj-theme", theme);
  };
  $("shareBtn").onclick = share;

  $("starBtn").onclick = toggleFav;
  $("favBtn").onclick = () => openDrawer("favDrawer");
  $("bellBtn").onclick = () => openDrawer("setDrawer");
  $("scrim").onclick = closeAllDrawers;
  document.querySelectorAll("[data-close]").forEach((b) => {
    b.onclick = () => closeDrawer(b.dataset.close);
  });

  $("notifToggle").onchange = (e) => setNotifications(e.target.checked);
  $("notifTime").onchange = (e) => {
    notif.time = e.target.value || "08:00";
    saveNotif();
    syncNotifUI();
    scheduleNotification();
  };
  $("testBtn").onclick = async () => {
    await showDailyNotification(current(), true);
    toast("Notification de test envoyée");
  };

  document.onkeydown = (e) => {
    if (e.key === "ArrowLeft") $("prevBtn").click();
    if (e.key === "ArrowRight") $("nextBtn").click();
    if (e.key === "Escape") closeAllDrawers();
  };

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") maybeFireLateNotification();
  });
}

/* ---------- génération de l'image ---------- */

function wrapLines(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; }
    else { line = test; }
  }
  if (line) lines.push(line);
  return lines;
}

function drawBackground(ctx, W, H) {
  ctx.fillStyle = COLORS.paper;
  ctx.fillRect(0, 0, W, H);

  const g = ctx.createRadialGradient(W * 0.1, -H * 0.1, 0, W * 0.1, -H * 0.1, Math.max(W, H) * 0.9);
  g.addColorStop(0, "rgba(176,141,87,0.16)");
  g.addColorStop(1, "rgba(176,141,87,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 1.5;
  const m = 34;
  ctx.strokeRect(m, m, W - m * 2, H - m * 2);
}

function drawCard(formatKey) {
  const f = FORMATS[formatKey];
  const W = f.w, H = f.h;
  const canvas = $("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const r = current();

  drawBackground(ctx, W, H);

  const cx = W / 2;
  const maxWidth = W - f.pad * 2;

  // filigrane
  ctx.save();
  ctx.globalAlpha = 0.055;
  ctx.fillStyle = COLORS.ink;
  ctx.font = `700 ${Math.round(W * 0.5)}px Georgia, 'Times New Roman', serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("«", cx, H * 0.52);
  ctx.restore();

  // surtitre
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = COLORS.gold;
  ctx.font = `600 ${Math.round(W * 0.019)}px 'Segoe UI', system-ui, sans-serif`;
  const eyebrow = "CITATION DU JOUR";
  ctx.save();
  ctx.letterSpacing = "6px";
  ctx.fillText(eyebrow, cx, f.eyebrowY);
  ctx.restore();

  // date
  ctx.fillStyle = COLORS.soft;
  ctx.font = `400 ${Math.round(W * 0.022)}px 'Segoe UI', system-ui, sans-serif`;
  ctx.fillText(capitalize(fmtLong.format(new Date(r.date + "T12:00:00"))), cx, f.eyebrowY + Math.round(W * 0.038));

  // citation : taille adaptative
  const text = `« ${r.citation} »`;
  const availH = H * 0.46;
  let size = f.quoteMax, lines = [];
  while (size >= f.quoteMin) {
    ctx.font = `400 ${size}px Georgia, 'Times New Roman', serif`;
    lines = wrapLines(ctx, text, maxWidth);
    if (lines.length * size * 1.36 <= availH) break;
    size -= 2;
  }
  const lineH = size * 1.36;
  const blockH = lines.length * lineH;
  let y = H * 0.5 - blockH / 2 + size * 0.82;
  ctx.fillStyle = COLORS.ink;
  ctx.font = `400 ${size}px Georgia, 'Times New Roman', serif`;
  for (const line of lines) {
    ctx.fillText(line, cx, y);
    y += lineH;
  }

  // filet
  const ruleY = H * 0.5 + blockH / 2 + Math.round(H * 0.055);
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 34, ruleY);
  ctx.lineTo(cx + 34, ruleY);
  ctx.stroke();

  // auteur
  ctx.fillStyle = COLORS.ink;
  ctx.font = `600 ${Math.round(W * 0.024)}px 'Segoe UI', system-ui, sans-serif`;
  ctx.fillText(r.auteur, cx, ruleY + Math.round(H * 0.045));

  // source
  const srcOk = r.source && !r.source.startsWith("Attribuée") && r.source !== "Tradition orale" && r.source !== "Attribution traditionnelle";
  if (srcOk) {
    ctx.fillStyle = COLORS.soft;
    ctx.font = `italic 400 ${Math.round(W * 0.018)}px 'Segoe UI', system-ui, sans-serif`;
    ctx.fillText(r.source, cx, ruleY + Math.round(H * 0.045) + Math.round(W * 0.032));
  }

  // marque
  ctx.fillStyle = COLORS.soft;
  ctx.font = `400 ${Math.round(W * 0.015)}px 'Segoe UI', system-ui, sans-serif`;
  ctx.save();
  ctx.letterSpacing = "3px";
  ctx.fillText("CALENDRIER PHILOSOPHIQUE 2026-2027", cx, f.brandY);
  ctx.restore();

  return canvas;
}

function toBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

function safeName(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase().slice(0, 40);
}

async function share() {
  const r = current();
  const fmt = $("format").value;
  const canvas = drawCard(fmt);
  const blob = await toBlob(canvas);
  const file = new File([blob], `citation-${r.date}-${safeName(r.auteur)}.png`, { type: "image/png" });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: "Citation du jour",
        text: `« ${r.citation} » — ${r.auteur}`
      });
      $("status").textContent = "Fiche partagée";
      return;
    } catch (e) { /* annulé : on retombe sur le téléchargement */ }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = file.name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  $("status").textContent = "Fiche enregistrée dans Téléchargements";
  setTimeout(() => { $("status").textContent = ""; }, 4000);
}

function registerSW() {
  if (location.protocol === "file:") return;
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

/* ---------- favoris ---------- */

function saveFavs() {
  localStorage.setItem(FAV_KEY, JSON.stringify(favs));
}
function isFav(date) {
  return favs.includes(date);
}
function toggleFav() {
  const d = current().date;
  if (isFav(d)) {
    favs = favs.filter((x) => x !== d);
    toast("Retiré des favoris");
  } else {
    favs.push(d);
    favs.sort();
    toast("Ajouté aux favoris");
  }
  saveFavs();
  paintFav();
}
function paintFav() {
  const r = current();
  if (!r || !$("starBtn")) return;
  const on = isFav(r.date);
  const b = $("starBtn");
  b.textContent = on ? "★" : "☆";
  b.classList.toggle("on", on);
  b.setAttribute("aria-pressed", String(on));
  b.title = on ? "Retirer des favoris" : "Ajouter aux favoris";
  const c = $("favCount");
  c.textContent = favs.length;
  c.hidden = favs.length === 0;
  renderFavList();
}
function renderFavList() {
  const list = $("favList");
  if (!list) return;
  list.innerHTML = "";
  $("favEmpty").hidden = favs.length > 0;
  $("favSub").textContent = favs.length
    ? `${favs.length} citation${favs.length > 1 ? "s" : ""} gardée${favs.length > 1 ? "s" : ""}.`
    : "Vos citations gardées, dans l'ordre du calendrier.";
  for (const d of favs) {
    const r = DATA.find((x) => x.date === d);
    if (!r) continue;
    const li = document.createElement("li");
    li.innerHTML = `<button class="fav-item" type="button"><span class="fav-date">${esc(r.jour_date)}</span><span class="fav-quote">« ${esc(r.citation)} »</span><span class="fav-author">${esc(r.auteur)}</span></button><button class="fav-del" type="button" aria-label="Retirer des favoris">✕</button>`;
    li.querySelector(".fav-item").onclick = () => {
      const i = DATA.findIndex((x) => x.date === d);
      if (i >= 0) { index = i; render(); }
      closeDrawer("favDrawer");
    };
    li.querySelector(".fav-del").onclick = () => {
      favs = favs.filter((x) => x !== d);
      saveFavs();
      paintFav();
      toast("Retiré des favoris");
    };
    list.appendChild(li);
  }
}
function initFav() {
  paintFav();
}

/* ---------- tiroirs ---------- */

function openDrawer(id) {
  document.querySelectorAll(".drawer").forEach((d) => {
    if (d.id !== id) { d.classList.remove("open"); d.setAttribute("aria-hidden", "true"); }
  });
  const el = $(id);
  if (!el) return;
  const sc = $("scrim");
  sc.hidden = false;
  requestAnimationFrame(() => sc.classList.add("show"));
  el.classList.add("open");
  el.setAttribute("aria-hidden", "false");
  document.body.classList.add("drawer-open");
}
function closeDrawer(id) {
  const el = $(id);
  if (!el) return;
  el.classList.remove("open");
  el.setAttribute("aria-hidden", "true");
  if (!document.querySelector(".drawer.open")) {
    const sc = $("scrim");
    sc.classList.remove("show");
    document.body.classList.remove("drawer-open");
    setTimeout(() => { if (!document.querySelector(".drawer.open")) sc.hidden = true; }, 260);
  }
}
function closeAllDrawers() {
  document.querySelectorAll(".drawer.open").forEach((d) => closeDrawer(d.id));
}

/* ---------- notifications ---------- */

function saveNotif() {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(notif));
}
function notifSupported() {
  return "Notification" in window;
}
function syncNotifUI() {
  const t = $("notifToggle");
  if (!t) return;
  t.checked = !!notif.enabled;
  $("notifTime").value = notif.time || "08:00";
  const st = $("notifState");
  const dot = $("bellDot");
  const perm = notifSupported() ? Notification.permission : "unsupported";
  if (perm === "unsupported") {
    t.disabled = true;
    st.textContent = "Non pris en charge";
  } else if (perm === "denied") {
    st.textContent = "Autorisation refusée";
  } else if (notif.enabled) {
    st.textContent = `Activé · ${notif.time}`;
  } else {
    st.textContent = "Désactivé";
  }
  dot.hidden = !(notif.enabled && perm === "granted");
}
async function setNotifications(on) {
  if (on) {
    if (!notifSupported()) { toast("Notifications non prises en charge"); syncNotifUI(); return; }
    if (Notification.permission === "denied") { toast("Notifications bloquées dans le navigateur"); syncNotifUI(); return; }
    if (Notification.permission !== "granted") {
      const p = await Notification.requestPermission();
      if (p !== "granted") { syncNotifUI(); toast("Autorisation refusée"); return; }
    }
  }
  notif.enabled = !!on;
  saveNotif();
  syncNotifUI();
  if (on) {
    scheduleNotification();
    toast(`Rappel activé à ${notif.time}`);
  } else {
    clearTimeout(notifTimer);
    toast("Rappel désactivé");
  }
}
function nextFireDate() {
  const [h, m] = (notif.time || "08:00").split(":").map(Number);
  const now = new Date();
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h || 0, m || 0, 0, 0);
  if (t <= now) t.setDate(t.getDate() + 1);
  return t;
}
function scheduleNotification() {
  clearTimeout(notifTimer);
  if (!notif.enabled) return;
  const ms = Math.max(1000, nextFireDate() - new Date());
  notifTimer = setTimeout(async () => {
    await maybeFireLateNotification();
    scheduleNotification();
  }, Math.min(ms, 2147480000));
}
async function maybeFireLateNotification() {
  if (!notif.enabled) return;
  const [h, m] = (notif.time || "08:00").split(":").map(Number);
  const now = new Date();
  const passed = now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
  const today = todayISO();
  if (!passed || notif.last === today) return;
  await showDailyNotification(current());
  notif.last = today;
  saveNotif();
}
async function showDailyNotification(row, test = false) {
  if (!row) return;
  const title = test ? "Test — Citation du jour" : "Citation du jour";
  const opts = {
    body: `« ${row.citation} » — ${row.auteur}`,
    tag: test ? "cdj-test" : "cdj-daily",
    icon: "icons/icon-192.png",
    badge: "icons/icon-192.png",
    data: { date: row.date }
  };
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.showNotification) {
        await reg.showNotification(title, opts);
        return;
      }
    }
    if (notifSupported()) new Notification(title, opts);
  } catch (err) {
    toast("Impossible d'afficher la notification");
  }
}
function initNotif() {
  syncNotifUI();
  if (!notifSupported()) return;
  if ("permissions" in navigator) {
    navigator.permissions.query({ name: "notifications" }).then((p) => {
      p.onchange = () => {
        if (p.state === "denied" && notif.enabled) { notif.enabled = false; saveNotif(); clearTimeout(notifTimer); }
        syncNotifUI();
      };
    }).catch(() => {});
  }
  if (notif.enabled) {
    scheduleNotification();
    setTimeout(maybeFireLateNotification, 1200);
    registerPeriodicSync();
  }
}
async function registerPeriodicSync() {
  try {
    const reg = await navigator.serviceWorker.ready;
    if ("periodicSync" in reg) {
      await reg.periodicSync.register("cdj-daily", { minInterval: 12 * 60 * 60 * 1000 });
    }
  } catch (err) { /* non pris en charge : sans effet */ }
}

boot().catch((err) => {
  $("quote").textContent = "Affichage impossible";
  $("hint").textContent = String(err && err.message ? err.message : err);
});
