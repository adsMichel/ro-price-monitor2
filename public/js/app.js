import { searchItem } from "./api.js";
import { saveRecent, saveHistory, addFavorite, getFavorites, getHistory, getSettings } from "./storage.js";
import { renderFavorites } from "./favorites.js";
import { renderRecents }   from "./dashboard.js";
import { monitorFavorites, setSearchFn } from "./monitor.js";
import { openHistory }   from "./history.js";
import { openAlerts }    from "./alerts.js";
import { openTrending }  from "./trending.js";

const btn        = document.getElementById("searchBtn");
const monitorBtn = document.getElementById("monitorNowBtn");
const itemInput  = document.getElementById("itemName");

// Wire toolbar buttons by title
const alertsBtn   = [...document.querySelectorAll(".btn-ghost")].find(b => b.title.includes("Alertas"));
const historyBtn  = [...document.querySelectorAll(".btn-ghost")].find(b => b.title.includes("Histórico"));
const trendingBtn = [...document.querySelectorAll(".btn-ghost")].find(b => b.title.includes("Mais Vendidos"));

if (Notification.permission !== "granted") Notification.requestPermission();

const fmt = v => Number(v).toLocaleString("pt-BR");

btn.addEventListener("click", () => search());
itemInput.addEventListener("keydown", e => { if (e.key === "Enter") search(); });
alertsBtn?.addEventListener("click",  () => openAlerts());
historyBtn?.addEventListener("click", () => openHistory());
trendingBtn?.addEventListener("click", () => openTrending());

// ─── Search ────────────────────────────────────────────────

async function search(itemFromFavorite = null) {
    if (itemFromFavorite && typeof itemFromFavorite !== "string") itemFromFavorite = null;
    const item = itemFromFavorite || itemInput.value.trim();
    if (!item) return;

    setResultsLoading(item);
    const data = await searchItem(item);

    saveRecent(item);
    saveHistory(item, data.stats.min);

    renderFavorites(search);
    renderRecents(search);
    renderSidebarMonitored();
    renderStats(data);
    renderTable(data.stores);
}

// ─── Loading state ──────────────────────────────────────────

function setResultsLoading(item) {
    document.getElementById("results-body").innerHTML = `
        <p class="empty-state" style="color:var(--gold-light)">
            Buscando <strong>${item}</strong>…
        </p>`;
}

// ─── Stats tiles ────────────────────────────────────────────

function renderStats(data) {
    const el  = id => document.getElementById(id);
    const now = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    el("stat-monitored").textContent = data.stores?.length ?? "—";
    el("stat-updated").textContent   = now;
    el("stat-top-up").textContent    = fmt(data.stats.min) + " z";
    el("stat-top-down").textContent  = fmt(data.stats.max) + " z";

    renderFavoriteButton(data);
}

function renderFavoriteButton(data) {
    const header = document.querySelector("#results .results-panel-header");
    let favBtn = header.querySelector("#favoriteBtn");
    if (!favBtn) {
        favBtn = document.createElement("button");
        favBtn.id = "favoriteBtn";
        favBtn.className = "btn btn-ghost";
        favBtn.style.cssText = "margin-left:auto; height:26px; font-size:11px; gap:4px;";
        header.appendChild(favBtn);
    }
    favBtn.innerHTML = `
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        Favoritar`;
    const fresh = favBtn.cloneNode(true);
    header.replaceChild(fresh, favBtn);
    fresh.addEventListener("click", () => {
        addFavorite(data.item);
        renderFavorites(search);
        renderSidebarMonitored();
    });
}

// ─── Results table ──────────────────────────────────────────

function renderTable(stores) {
    const body = document.getElementById("results-body");
    stores.sort((a, b) => a.itemPrice - b.itemPrice);
    if (!stores.length) {
        body.innerHTML = `<p class="empty-state">Nenhum resultado encontrado.</p>`;
        return;
    }
    body.innerHTML = `
        <div class="table-scroll"><table class="results-table">
            <thead><tr>
                <th></th><th>Item</th><th>Loja</th><th>Vendedor</th>
                <th style="text-align:right">Preço</th><th style="text-align:right">Qtd</th>
            </tr></thead>
            <tbody>
                ${stores.map((x, i) => `
                    <tr>
                        <td><img src="${x.databaseImgPath}" width="24" height="24"
                            style="display:block;image-rendering:pixelated;border-radius:3px;" alt=""></td>
                        <td style="font-weight:500">${x.itemName ?? "—"}</td>
                        <td style="color:var(--text-muted)">${x.storeName}</td>
                        <td style="color:var(--text-muted)">${x.itemSellerCharName}</td>
                        <td style="text-align:right">
                            <span class="price-tag ${i === 0 ? "best-price" : ""}">
                                ${fmt(x.itemPrice)} z
                            </span>
                        </td>
                        <td style="text-align:right;color:var(--text-muted)">${x.itemCnt}</td>
                    </tr>`).join("")}
            </tbody>
        </table></div>`;
}

// ─── Sidebar: monitored items ────────────────────────────────
// Shows items that have an active alert configured

export function renderSidebarMonitored() {
    const container = document.getElementById("sidebar-monitored");
    const settings  = getSettings();
    const alerts    = settings.alerts || {};
    const favorites = getFavorites();

    // Items with active alert + threshold
    const monitored = favorites.filter(name =>
        alerts[name]?.enabled && alerts[name]?.threshold > 0
    );

    if (!monitored.length) {
        container.innerHTML = `<div class="sidebar-empty">Nenhum alerta ativo.<br>Configure alertas para monitorar.</div>`;
        return;
    }

    container.innerHTML = monitored.map(name => {
        const history  = getHistory(name);
        const last     = history.at(-1);
        const prev     = history.at(-2);
        const price    = last?.price ?? null;
        const trend    = !last || !prev ? "flat"
                       : price < prev.price ? "down"
                       : price > prev.price ? "up"
                       : "flat";

        const priceClass = trend === "up" ? "up" : trend === "down" ? "down" : "flat";
        const time = last ? new Date(last.date).toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" }) : "—";
        const threshold = alerts[name]?.threshold ?? 0;

        return `
            <div class="monitor-card trend-${trend}" data-item="${name}" title="Clique para pesquisar">
                <div class="monitor-card-img">
                    <span style="font-size:9px;color:var(--text-dim)">?</span>
                </div>
                <div class="monitor-card-info">
                    <div class="monitor-card-name">${name}</div>
                    <div class="monitor-card-meta">
                        <span class="monitor-card-time">${time}</span>
                    </div>
                </div>
                <div class="monitor-card-price">
                    <div class="monitor-card-value ${priceClass}">
                        ${price !== null ? fmt(price) + " z" : "—"}
                    </div>
                    <div class="monitor-card-badge">alerta: ${fmt(threshold)} z</div>
                </div>
            </div>`;
    }).join("");

    container.querySelectorAll(".monitor-card").forEach(card => {
        card.addEventListener("click", () => search(card.dataset.item));
    });
}

// ─── Favorites in sidebar ────────────────────────────────────
// Override renderFavorites to use sidebar fav-row style

import { renderFavoritesChips } from "./chips.js";
import { removeFavorite }       from "./storage.js";

// Monkey-patch: favorites panel now uses fav-row in sidebar
window._renderSidebarFavorites = function(searchFn) {
    const container = document.getElementById("favorites-list");
    const items     = getFavorites();

    if (!items.length) {
        container.innerHTML = `<div class="sidebar-empty" style="padding:12px 16px;">Nenhum favorito ainda.</div>`;
        return;
    }

    const { getHistory: gh } = { getHistory: name => {
        const h = JSON.parse(localStorage.getItem("ro_history") || "{}");
        return h[name] || [];
    }};

    container.innerHTML = items.map(name => {
        const history = JSON.parse(localStorage.getItem("ro_history") || "{}")[name] || [];
        const last  = history.at(-1);
        const prev  = history.at(-2);
        const trend = !last || !prev ? "flat"
                    : last.price < prev.price ? "down"
                    : last.price > prev.price ? "up"
                    : "flat";
        return `
            <div class="fav-row" data-item="${name}" title="Clique para pesquisar">
                <span class="fav-row-dot ${trend}"></span>
                <span class="fav-row-name">${name}</span>
                <button class="fav-row-remove chip-remove" data-item="${name}" title="Remover">✕</button>
            </div>`;
    }).join("");

    container.querySelectorAll(".fav-row").forEach(row => {
        row.addEventListener("click", e => {
            if (e.target.closest(".fav-row-remove")) return;
            searchFn(row.dataset.item);
        });
    });
    container.querySelectorAll(".fav-row-remove").forEach(btn => {
        btn.addEventListener("click", e => {
            e.stopPropagation();
            removeFavorite(btn.dataset.item);
            window._renderSidebarFavorites(searchFn);
            renderSidebarMonitored();
        });
    });
};

// ─── Monitor manager ────────────────────────────────────────

let _monitorTimer = null;

const ICON_IDLE = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>`;
const ICON_STOP = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`;

function hasActiveAlerts() {
    const settings = JSON.parse(localStorage.getItem("ro_settings") || "{}");
    const alerts   = settings.alerts || {};
    return Object.values(alerts).some(cfg => cfg.enabled && cfg.threshold > 0);
}

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

function openIntervalPicker() {
    const existing = document.getElementById("ro-interval-overlay");
    if (existing) { existing.remove(); return; }

    const overlay = document.createElement("div");
    overlay.id = "ro-interval-overlay";
    overlay.style.cssText = `position:fixed;inset:0;z-index:1000;background:rgba(11,13,17,0.85);display:flex;align-items:center;justify-content:center;padding:1rem;`;
    overlay.innerHTML = `
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);width:100%;max-width:320px;padding:20px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
                <span style="font-size:13px;font-weight:600;color:var(--text);">Iniciar Monitoramento</span>
                <button id="ro-interval-close" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:18px;padding:0 4px;">✕</button>
            </div>
            <p style="font-size:12px;color:var(--text-muted);margin-bottom:14px;line-height:1.5;">Escolha o intervalo de verificação:</p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                ${[{label:"5 minutos",value:5},{label:"15 minutos",value:15},{label:"30 minutos",value:30},{label:"1 hora",value:60}]
                .map(opt => `<button class="ro-interval-opt btn btn-ghost" data-minutes="${opt.value}"
                    style="height:36px;font-size:12px;justify-content:center;">${opt.label}</button>`).join("")}
            </div>
        </div>`;

    document.body.appendChild(overlay);
    overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
    document.getElementById("ro-interval-close").addEventListener("click", () => overlay.remove());
    overlay.querySelectorAll(".ro-interval-opt").forEach(btn => {
        btn.addEventListener("mouseenter", () => { btn.style.borderColor = "var(--purple-light)"; btn.style.color = "var(--text)"; btn.style.background = "var(--purple-dim)"; });
        btn.addEventListener("mouseleave", () => { btn.style.borderColor = "var(--border)"; btn.style.color = "var(--text-muted)"; btn.style.background = "transparent"; });
        btn.addEventListener("click", async () => {
            overlay.remove();
            startMonitor(Number(btn.dataset.minutes));
            await monitorFavorites();
            refreshMonitorBtn();
        });
    });
}

monitorBtn.addEventListener("click", () => {
    if (_monitorTimer) { stopMonitor(); return; }
    if (!hasActiveAlerts()) { _showToast("Configure um alerta de preço ativo antes de monitorar."); return; }
    openIntervalPicker();
});

function _showToast(msg) {
    document.getElementById("ro-app-toast")?.remove();
    const t = document.createElement("div");
    t.id = "ro-app-toast";
    t.textContent = msg;
    t.style.cssText = `position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:var(--bg-raised);border:1px solid var(--border);color:var(--text);font-size:12px;padding:8px 16px;border-radius:var(--radius-md);z-index:2000;white-space:nowrap;opacity:1;transition:opacity .3s;`;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 300); }, 3000);
}

window.refreshMonitorBtn = refreshMonitorBtn;
setSearchFn(search);

// ─── Init ───────────────────────────────────────────────────

// Use sidebar-style favorites render
import("./favorites.js").then(() => {
    window._renderSidebarFavorites(search);
});

renderRecents(search);
renderSidebarMonitored();
refreshMonitorBtn();