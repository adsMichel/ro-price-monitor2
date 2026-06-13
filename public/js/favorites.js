import {
    getFavorites,
    removeFavorite
}
from "./storage.js";

export function renderFavorites(searchFn) {

    const container =
        document.getElementById("favorites");

    const favorites =
        getFavorites();

    container.innerHTML = `

        <h2>Favoritos</h2>

        <div class="favorites-list">

            ${favorites.map(item => `
                <button
                    class="favorite-item"
                    data-item="${item}">
                    ⭐ ${item}
                </button>
            `).join("")}

        </div>

    `;

    container
        .querySelectorAll(".favorite-item")
        .forEach(btn => {

            btn.onclick = () =>
                searchFn(
                    btn.dataset.item
                );
        });
}