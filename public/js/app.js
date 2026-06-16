import { searchItem } from "./api.js";

import {
    saveRecent,
    saveHistory,
    addFavorite
} from "./storage.js";

import { renderFavorites } from "./favorites.js";
import { renderRecents }   from "./dashboard.js";
import { monitorFavorites } from "./monitor.js";
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

// ─── Interval manager ──────────────────────────────────────

const INTERVAL_OPTIONS = [5, 15, 30, 60]; // minutes
let _monitorTimer = null;

const ICON_IDLE = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
</svg>`;

// Returns true if there is at least one active alert with a threshold > 0
function hasActiveAlerts() {
    const settings = JSON.parse(localStorage.getItem("ro_settings") || "{}");
    const alerts   = settings.alerts || {};
    return Object.values(alerts).some(cfg => cfg.enabled && cfg.threshold > 0);
}

function getIntervalMinutes() {
    const settings = JSON.parse(localStorage.getItem("ro_settings") || "{}");
    const saved    = settings.monitorInterval;
    return INTERVAL_OPTIONS.includes(saved) ? saved : 30;
}

function saveIntervalMinutes(minutes) {
    const settings = JSON.parse(localStorage.getItem("ro_settings") || "{}");
    settings.monitorInterval = minutes;
    localStorage.setItem("ro_settings", JSON.stringify(settings));
}

// ── Button state ────────────────────────────────────────────
// idle    → "Monitorar"   no glow, no dot
// active  → "Monitorando" purple glow + pulsing dot
export function refreshMonitorBtn() {
    const btn = document.getElementById("monitorNowBtn");
    if (!btn || btn.disabled) return;

    if (hasActiveAlerts() && _monitorTimer) {
        btn.classList.add("is-active");
        btn.innerHTML = `<span class="monitor-dot"></span>${ICON_IDLE}<span class="btn-label">Monitorando</span>`;
    } else {
        btn.classList.remove("is-active");
        btn.innerHTML = `${ICON_IDLE}<span class="btn-label">Monitorar</span>`;
    }
}

function startMonitorInterval(minutes) {
    if (_monitorTimer) clearInterval(_monitorTimer);
    _monitorTimer = setInterval(monitorFavorites, minutes * 60 * 1000);
    window._roMonitorActive = true;
    refreshMonitorBtn();
}

function stopMonitorInterval() {
    if (_monitorTimer) clearInterval(_monitorTimer);
    _monitorTimer = null;
    window._roMonitorActive = false;
    refreshMonitorBtn();
}

function initIntervalSelector() {
    const current = getIntervalMinutes();

    document.querySelectorAll(".interval-btn").forEach(btn => {
        const minutes = Number(btn.dataset.minutes);
        btn.classList.toggle("active", minutes === current);

        btn.addEventListener("click", () => {
            document.querySelectorAll(".interval-btn")
                .forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            saveIntervalMinutes(minutes);
            startMonitorInterval(minutes);
        });
    });

    // Only start the interval if there are active alerts configured
    if (hasActiveAlerts()) {
        startMonitorInterval(current);
    } else {
        refreshMonitorBtn();
    }
}

// ── Monitor button click handler ────────────────────────────
// • No active alerts  → show toast, do nothing
// • Active alerts + timer running → STOP monitoring
// • Active alerts + timer stopped → START monitoring + run a cycle now
monitorBtn.addEventListener("click", async () => {
    if (!hasActiveAlerts()) {
        _showToast("Configure um alerta de preço ativo antes de monitorar.");
        return;
    }

    if (_monitorTimer) {
        // Currently monitoring → stop
        stopMonitorInterval();
    } else {
        // Not monitoring → start interval and run one cycle immediately
        startMonitorInterval(getIntervalMinutes());
        await monitorFavorites();
        refreshMonitorBtn();
    }
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

// Expose refreshMonitorBtn globally so monitor.js can call it after a cycle
window.refreshMonitorBtn = refreshMonitorBtn;

// ─── Init ──────────────────────────────────────────────────

renderFavorites(search);
renderRecents(search);
initIntervalSelector();