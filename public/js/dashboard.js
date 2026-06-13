import {
    getRecents
}
from "./storage.js";

export function renderRecents(searchFn) {

    const container =
        document.getElementById("recents");

    const recents =
        getRecents();

    container.innerHTML = `

        <h2>Pesquisas recentes</h2>

        <div class="favorites-list">

            ${recents.map(item => `
                <button
                    class="favorite-item"
                    data-item="${item}">
                    ${item}
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