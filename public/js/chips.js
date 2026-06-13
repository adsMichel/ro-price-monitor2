// Shared chip-rendering helpers used by both favorites.js and dashboard.js.
// Kept in a separate module to avoid circular imports with app.js.

function chipHTML(name, dotClass) {
    return `
        <span class="chip" data-item="${name}" title="Clique para pesquisar">
            <span class="chip-dot ${dotClass}"></span>
            ${name}
        </span>`;
}

export function renderFavoritesChips(items, searchFn) {
    const list = document.getElementById("favorites-list");
    if (!items?.length) {
        list.innerHTML = `<p class="empty-state">Nenhum favorito ainda. Pesquise um item e adicione aos favoritos.</p>`;
        return;
    }
    list.innerHTML = items.map(name => chipHTML(name, "up")).join("");
    list.querySelectorAll(".chip").forEach(chip =>
        chip.addEventListener("click", () => searchFn(chip.dataset.item))
    );
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