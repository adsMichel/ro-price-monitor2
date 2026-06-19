// Shared chip-rendering helpers used by both favorites.js and dashboard.js.
// Kept in a separate module to avoid circular imports with app.js.

import { removeFavorite, getHistory } from "./storage.js";

// ─── Trend calculation ───────────────────────────────────────
// Compares the last 2 price records in local history
// Returns: "up" | "down" | "flat" | null (no history)

function getTrend(itemName) {
    const history = getHistory(itemName);
    if (history.length < 2) return null;

    const last = history.at(-1).price;
    const prev = history.at(-2).price;

    if (last < prev) return "down";
    if (last > prev) return "up";
    return "flat";
}

// ─── Trend arrow SVG ─────────────────────────────────────────

function trendArrow(trend) {
    if (!trend) return "";

    const arrows = {
        up:   { path: "M12 19V5M5 12l7-7 7 7", color: "var(--red)",   title: "Preço subindo"  },
        down: { path: "M12 5v14M5 12l7 7 7-7",  color: "var(--green)", title: "Preço caindo"   },
        flat: { path: "M5 12h14",                color: "var(--parchment-dim)", title: "Preço estável" },
    };

    const { path, color, title } = arrows[trend];

    return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none"
        stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
        title="${title}" style="flex-shrink:0;">
        <path d="${path}"/>
    </svg>`;
}

// ─── Chip HTML ───────────────────────────────────────────────

function chipHTML(name, dotClass, removable = false, trend = null) {
    return `
        <span class="chip" data-item="${name}" title="Clique para pesquisar">
            <span class="chip-dot ${dotClass}"></span>
            ${name}
            ${trendArrow(trend)}
            ${removable ? `<button class="chip-remove" data-item="${name}" title="Remover favorito" aria-label="Remover ${name}">✕</button>` : ""}
        </span>`;
}

// ─── Favorites ───────────────────────────────────────────────

export function renderFavoritesChips(items, searchFn) {
    const list = document.getElementById("favorites-list");
    if (!items?.length) {
        list.innerHTML = `<p class="empty-state">Nenhum favorito ainda. Pesquise um item e adicione aos favoritos.</p>`;
        return;
    }

    list.innerHTML = items.map(name => {
        const trend = getTrend(name);
        return chipHTML(name, "up", true, trend);
    }).join("");

    // Click on chip → search
    list.querySelectorAll(".chip").forEach(chip => {
        chip.addEventListener("click", (e) => {
            if (e.target.closest(".chip-remove")) return;
            searchFn(chip.dataset.item);
        });
    });

    // Click on remove → remove favorite and re-render
    list.querySelectorAll(".chip-remove").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            removeFavorite(btn.dataset.item);
            renderFavoritesChips(
                list.querySelectorAll(".chip").length > 1
                    ? items.filter(i => i !== btn.dataset.item)
                    : [],
                searchFn
            );
        });
    });
}

// ─── Recents ─────────────────────────────────────────────────

export function renderRecentsChips(items, searchFn) {
    const list = document.getElementById("recents-list");
    if (!items?.length) {
        list.innerHTML = `<p class="empty-state">Nenhuma pesquisa recente.</p>`;
        return;
    }
    list.innerHTML = [...items].reverse().slice(0, 10).map(name => chipHTML(name, "flat")).join("");
    list.querySelectorAll(".chip").forEach(chip =>
        chip.addEventListener("click", () => searchFn(chip.dataset.item))
    );
}