// Shared chip-rendering helpers used by both favorites.js and dashboard.js.
// Kept in a separate module to avoid circular imports with app.js.

import { removeFavorite } from "./storage.js";

function chipHTML(name, dotClass, removable = false) {
    return `
        <span class="chip" data-item="${name}" title="Clique para pesquisar">
            <span class="chip-dot ${dotClass}"></span>
            ${name}
            ${removable ? `<button class="chip-remove" data-item="${name}" title="Remover favorito" aria-label="Remover ${name}">✕</button>` : ""}
        </span>`;
}

export function renderFavoritesChips(items, searchFn) {
    const list = document.getElementById("favorites-list");
    if (!items?.length) {
        list.innerHTML = `<p class="empty-state">Nenhum favorito ainda. Pesquise um item e adicione aos favoritos.</p>`;
        return;
    }
    list.innerHTML = items.map(name => chipHTML(name, "up", true)).join("");

    // Click on chip → search
    list.querySelectorAll(".chip").forEach(chip => {
        chip.addEventListener("click", (e) => {
            // Don't search if clicking the remove button
            if (e.target.closest(".chip-remove")) return;
            searchFn(chip.dataset.item);
        });
    });

    // Click on remove button → remove favorite and re-render
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