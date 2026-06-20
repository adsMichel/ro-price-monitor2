import { searchItem } from "./api.js";

import {
    saveRecent,
    saveHistory,
    addFavorite
} from "./storage.js";

import { renderFavorites } from "./favorites.js";
import { renderRecents }   from "./dashboard.js";
import { monitorFavorites, setSearchFn } from "./monitor.js";
import { openHistory }      from "./history.js";
import { openAlerts }       from "./alerts.js";
import { openTrending }     from "./trending.js";

const btn        = document.getElementById("searchBtn");
const monitorBtn = document.getElementById("monitorNowBtn");

const alertsBtn  = [...document.querySelectorAll(".btn-secondary")]
                    .find(b => b.textContent.includes("Alertas"));
const historyBtn  = [...document.querySelectorAll(".btn-secondary")]
                    .find(b => b.textContent.includes("Histórico"));
const trendingBtn = [...document.querySelectorAll(".btn-secondary")]
                    .find(b => b.textContent.includes("Mais Vendidos"));

if (Notification.permission !== "granted") {
    Notification.requestPermission();
}

function formatZeny(value) {
    return Number(value).toLocaleString("pt-BR");
}

btn.addEventListener("click", () => search());
// monitorBtn listener is defined in the interval manager below
alertsBtn?.addEventListener("click",  () => openAlerts());
historyBtn?.addEventListener("click", () => openHistory());
trendingBtn?.addEventListener("click", () => openTrending());

// ─── Search ────────────────────────────────────────────────

async function search(itemFromFavorite = null) {
    if (itemFromFavorite && typeof itemFromFavorite !== "string") {
        itemFromFavorite = null;
    }

    const item =
        itemFromFavorite ||
        document.getElementById("itemName").value.trim();

    if (!item) return;

    setResultsLoading(item);

    const data = await searchItem(item);

    saveRecent(item);
    saveHistory(item, data.stats.min);

    renderFavorites(search);
    renderRecents(search);
    renderStats(data);
    renderTable(data.stores);
}

// ─── Loading state ─────────────────────────────────────────

function setResultsLoading(item) {
    const body = document.getElementById("results-body");
    body.innerHTML = `
        <p class="empty-state" style="color:var(--gold-dim);">
            Buscando preços para <strong style="color:var(--parchment)">${item}</strong>…
        </p>`;
}

// ─── Stats ─────────────────────────────────────────────────

function renderStats(data) {
    const el = (id) => document.getElementById(id);

    const now = new Date().toLocaleTimeString("pt-BR", {
        hour:   "2-digit",
        minute: "2-digit",
    });

    el("stat-monitored").textContent = data.stores?.length ?? "—";
    el("stat-updated").textContent   = now;
    el("stat-top-up").textContent    = formatZeny(data.stats.min) + " z";
    el("stat-top-down").textContent  = formatZeny(data.stats.max) + " z";

    const labels = document.querySelectorAll(".stat-label");
    if (labels[2]) labels[2].textContent = "Menor Preço";
    if (labels[3]) labels[3].textContent = "Maior Preço";

    renderFavoriteButton(data);
}

function renderFavoriteButton(data) {
    const resultsPanel = document.getElementById("results");
    const header = resultsPanel.querySelector(".panel-header");

    let favBtn = header.querySelector("#favoriteBtn");
    if (!favBtn) {
        favBtn = document.createElement("button");
        favBtn.id = "favoriteBtn";
        favBtn.className = "btn btn-secondary";
        favBtn.style.cssText =
            "margin-left:auto; padding:4px 12px; font-size:13px; display:flex; align-items:center; gap:6px;";
        header.appendChild(favBtn);
    }

    favBtn.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        Favoritar`;

    const fresh = favBtn.cloneNode(true);
    header.replaceChild(fresh, favBtn);
    fresh.addEventListener("click", () => {
        addFavorite(data.item);
        renderFavorites(search);
    });
}

// ─── Results table ─────────────────────────────────────────

function renderTable(stores) {
    const body = document.getElementById("results-body");

    stores.sort((a, b) => a.itemPrice - b.itemPrice);

    if (!stores.length) {
        body.innerHTML = `<p class="empty-state">Nenhum resultado encontrado no mercado.</p>`;
        return;
    }

    body.innerHTML = `
        <div class="table-scroll"><table class="results-table">
            <thead>
                <tr>
                    <th></th>
                    <th>Item</th>
                    <th>Loja</th>
                    <th>Vendedor</th>
                    <th style="text-align:right">Preço</th>
                    <th style="text-align:right">Qtd</th>
                </tr>
            </thead>
            <tbody>
                ${stores.map((x, i) => `
                    <tr>
                        <td>
                            <img
                                src="${x.databaseImgPath}"
                                width="28"
                                height="28"
                                style="display:block; image-rendering:pixelated; border-radius:4px;"
                                alt="">
                        </td>
                        <td>${x.itemName ?? "—"}</td>
                        <td style="color:var(--parchment-dim)">${x.storeName}</td>
                        <td style="color:var(--parchment-dim)">${x.itemSellerCharName}</td>
                        <td style="text-align:right">
                            <span class="price-tag ${i === 0 ? "best-price" : ""}">
                                ${formatZeny(x.itemPrice)} z
                            </span>
                        </td>
                        <td style="text-align:right; color:var(--parchment-dim)">
                            ${x.itemCnt}
                        </td>
                    </tr>
                `).join("")}
            </tbody>
        </table></div>
    `;
}

// ─── Monitor manager ───────────────────────────────────────

let _monitorTimer = null;

const ICON_IDLE = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
</svg>`;

const ICON_STOP = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
</svg>`;

function hasActiveAlerts() {
    const settings = JSON.parse(localStorage.getItem("ro_settings") || "{}");
    const alerts   = settings.alerts || {};
    return Object.values(alerts).some(cfg => cfg.enabled && cfg.threshold > 0);
}

// ── Button states ────────────────────────────────────────────
export function refreshMonitorBtn() {
    const btn = document.getElementById("monitorNowBtn");
    if (!btn || btn.disabled) return;

    if (_monitorTimer) {
        btn.classList.add("is-active");
        btn.innerHTML = `<span class="monitor-dot"></span>${ICON_STOP}<span class="btn-label">Parar</span>`;
    } else {
        btn.classList.remove("is-active");
        btn.innerHTML = `${ICON_IDLE}<span class="btn-label">Monitorar</span>`;
    }
}

function startMonitor(minutes) {
    if (_monitorTimer) clearInterval(_monitorTimer);
    _monitorTimer = setInterval(monitorFavorites, minutes * 60 * 1000);
    window._roMonitorActive = true;
    refreshMonitorBtn();
}

function stopMonitor() {
    if (_monitorTimer) clearInterval(_monitorTimer);
    _monitorTimer = null;
    window._roMonitorActive = false;
    refreshMonitorBtn();
}

// ── Interval picker modal ─────────────────────────────────────
function openIntervalPicker() {
    const existing = document.getElementById("ro-interval-overlay");
    if (existing) { existing.remove(); return; }

    const overlay = document.createElement("div");
    overlay.id = "ro-interval-overlay";
    overlay.style.cssText = `
        position:fixed; inset:0; z-index:1000;
        background:rgba(10,7,20,0.8);
        display:flex; align-items:center; justify-content:center; padding:1rem;`;

    overlay.innerHTML = `
        <div style="
            background:var(--bg-card); border:1px solid var(--border);
            border-radius:var(--radius-lg); width:100%; max-width:360px; padding:1.5rem;">

            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1.25rem;">
                <span style="font-family:var(--font-display); font-size:14px; letter-spacing:.1em;
                    text-transform:uppercase; color:var(--parchment);">
                    Iniciar Monitoramento
                </span>
                <button id="ro-interval-close" style="background:none; border:none; cursor:pointer;
                    color:var(--parchment-dim); font-size:20px; padding:4px 8px;">✕</button>
            </div>

            <p style="font-size:13px; color:var(--parchment-dim); margin-bottom:1.25rem; line-height:1.5;">
                Escolha o intervalo de verificação de preços:
            </p>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:1.25rem;">
                ${[
                    { label: "5 minutos",  value: 5  },
                    { label: "15 minutos", value: 15 },
                    { label: "30 minutos", value: 30 },
                    { label: "1 hora",     value: 60 },
                ].map(opt => `
                    <button class="ro-interval-opt" data-minutes="${opt.value}" style="
                        background:var(--bg-raised); border:1px solid var(--border);
                        border-radius:var(--radius-md); color:var(--parchment-dim);
                        font-family:var(--font-ui); font-size:14px; font-weight:500;
                        padding:.75rem 1rem; cursor:pointer; text-align:center;
                        transition:all .15s;">
                        ${opt.label}
                    </button>`).join("")}
            </div>
        </div>`;

    document.body.appendChild(overlay);

    overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
    document.getElementById("ro-interval-close").addEventListener("click", () => overlay.remove());

    overlay.querySelectorAll(".ro-interval-opt").forEach(btn => {
        btn.addEventListener("mouseenter", () => {
            btn.style.borderColor = "var(--purple-light)";
            btn.style.color       = "var(--parchment)";
            btn.style.background  = "var(--purple-dim)";
        });
        btn.addEventListener("mouseleave", () => {
            btn.style.borderColor = "var(--border)";
            btn.style.color       = "var(--parchment-dim)";
            btn.style.background  = "var(--bg-raised)";
        });
        btn.addEventListener("click", async () => {
            const minutes = Number(btn.dataset.minutes);
            overlay.remove();
            startMonitor(minutes);
            await monitorFavorites();
            refreshMonitorBtn();
        });
    });
}

// ── Monitor button click ──────────────────────────────────────
monitorBtn.addEventListener("click", () => {
    if (_monitorTimer) {
        // Currently monitoring → stop
        stopMonitor();
        return;
    }

    if (!hasActiveAlerts()) {
        _showToast("Configure um alerta de preço ativo antes de monitorar.");
        return;
    }

    // Not monitoring + has alerts → open interval picker
    openIntervalPicker();
});

function _showToast(message) {
    const existing = document.getElementById("ro-app-toast");
    existing?.remove();
    const toast = document.createElement("div");
    toast.id = "ro-app-toast";
    toast.textContent = message;
    toast.style.cssText = `
        position:fixed; bottom:1.5rem; left:50%; transform:translateX(-50%);
        background:var(--bg-raised); border:1px solid var(--border);
        color:var(--parchment); font-family:var(--font-ui); font-size:13px;
        padding:.6rem 1.25rem; border-radius:var(--radius-md);
        z-index:2000; white-space:nowrap; opacity:1; transition:opacity .4s;`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = "0"; setTimeout(() => toast.remove(), 400); }, 3000);
}

// Expose so monitor.js can refresh the button after each cycle
window.refreshMonitorBtn = refreshMonitorBtn;

// Give monitor.js access to the search function for re-rendering recents
setSearchFn(search);

// ─── Init ──────────────────────────────────────────────────

renderFavorites(search);
renderRecents(search);
refreshMonitorBtn();