import { searchItem } from "./api.js";

import {
    saveRecent,
    saveHistory,
    addFavorite
} from "./storage.js";

import { renderFavorites } from "./favorites.js";
import { renderRecents }   from "./dashboard.js";
import { monitorFavorites } from "./monitor.js";

const btn        = document.getElementById("searchBtn");
const monitorBtn = document.getElementById("monitorNowBtn");

if (Notification.permission !== "granted") {
    Notification.requestPermission();
}

function formatZeny(value) {
    return Number(value).toLocaleString("pt-BR");
}

btn.addEventListener("click", () => search());

monitorBtn.addEventListener("click", monitorFavorites);

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
//
// Instead of replacing the entire #stats panel (which would destroy
// the panel chrome built in index.html), we update the four
// pre-existing stat-value elements and refresh the favorite button.

function renderStats(data) {
    // Update the four metric cards
    const el = (id) => document.getElementById(id);

    const now = new Date().toLocaleTimeString("pt-BR", {
        hour:   "2-digit",
        minute: "2-digit",
    });

    el("stat-monitored").textContent = data.stores?.length ?? "—";
    el("stat-updated").textContent   = now;

    // Calculate best gainer / loser from stores for the overview cards
    // (falls back gracefully if history data isn't available yet)
    el("stat-top-up").textContent   = formatZeny(data.stats.min) + " z";
    el("stat-top-down").textContent = formatZeny(data.stats.max) + " z";

    // Re-label those two cards to reflect what they actually show
    const labels = document.querySelectorAll(".stat-label");
    if (labels[2]) labels[2].textContent = "Menor Preço";
    if (labels[3]) labels[3].textContent = "Maior Preço";

    // Inject / refresh the Favorite button inside the results panel header
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

    // Replace to remove any stale listener
    const fresh = favBtn.cloneNode(true);
    header.replaceChild(fresh, favBtn);
    fresh.addEventListener("click", () => {
        addFavorite(data.item);
        renderFavorites(search);
    });
}

// ─── Results table ─────────────────────────────────────────
//
// Writes only into #results-body, preserving the panel chrome.

function renderTable(stores) {
    const body = document.getElementById("results-body");

    stores.sort((a, b) => a.itemPrice - b.itemPrice);

    if (!stores.length) {
        body.innerHTML = `<p class="empty-state">Nenhum resultado encontrado no mercado.</p>`;
        return;
    }

    body.innerHTML = `
        <table class="results-table">
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
        </table>
    `;
}

// ─── Favorites chips ────────────────────────────────────────
//
// renderFavorites() and renderRecents() are defined in their own
// modules; we export `search` so those modules can call it.
// BUT we also expose chip-rendering helpers here so the modules
// can delegate markup to this file if they choose to call them.

export function renderFavoritesChips(items) {
    const list = document.getElementById("favorites-list");
    if (!items?.length) {
        list.innerHTML = `<p class="empty-state">Nenhum favorito ainda. Pesquise um item e adicione aos favoritos.</p>`;
        return;
    }
    list.innerHTML = items.map(name => chipHTML(name, "gold")).join("");
    list.querySelectorAll(".chip").forEach(chip => {
        chip.addEventListener("click", () => search(chip.dataset.item));
    });
}

export function renderRecentsChips(items) {
    const list = document.getElementById("recents-list");
    if (!items?.length) {
        list.innerHTML = `<p class="empty-state">Nenhuma pesquisa recente.</p>`;
        return;
    }
    // Most recent first, cap at 10
    list.innerHTML = [...items].reverse().slice(0, 10).map(name => chipHTML(name, "dim")).join("");
    list.querySelectorAll(".chip").forEach(chip => {
        chip.addEventListener("click", () => search(chip.dataset.item));
    });
}

function chipHTML(name, style) {
    const dotClass = style === "gold" ? "up" : "flat";
    return `
        <span class="chip" data-item="${name}" title="Clique para pesquisar">
            <span class="chip-dot ${dotClass}"></span>
            ${name}
        </span>`;
}

// ─── Init ──────────────────────────────────────────────────

renderFavorites(search);
renderRecents(search);

setInterval(monitorFavorites, 5 * 60 * 1000);