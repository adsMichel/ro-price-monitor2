import { searchItem } from "./api.js";

import {
    saveRecent,
    saveHistory,
    addFavorite
}
    from "./storage.js";

import {
    renderFavorites
}
    from "./favorites.js";

import {
    renderRecents
}
    from "./dashboard.js";

const btn =
    document.getElementById("searchBtn");

const stats =
    document.getElementById("stats");

const results =
    document.getElementById("results");

function formatZeny(value) {

    return Number(value)
        .toLocaleString("pt-BR");
}

btn.addEventListener(
    "click",
    search
);

async function search(itemFromFavorite = null) {

    const item =
        itemFromFavorite ||
        document.getElementById("itemName")
            .value
            .trim();

    if (!item)
        return;

    results.innerHTML =
        "Pesquisando...";

    const data =
        await searchItem(item);

    saveRecent(item);

    saveHistory(
        item,
        data.stats.min
    );

    renderFavorites(search);

    renderRecents(search);

    renderStats(data);

    renderTable(data.stores);
}

function renderStats(data) {

    stats.className = "stats";

    stats.innerHTML = `

    <div class="card">
        <h3>Menor</h3>
        ${formatZeny(data.stats.min)} z
    </div>

    <div class="card">
        <h3>Médio</h3>
        ${formatZeny(data.stats.avg)} z
    </div>

    <div class="card">
        <h3>Maior</h3>
        ${formatZeny(data.stats.max)} z
    </div>

    <div class="card">
        <button id="favoriteBtn">
            ⭐ Favoritar
        </button>
    </div>

    `;

    document
        .getElementById("favoriteBtn")
        .addEventListener("click", () => {

            addFavorite(data.item);

            renderFavorites(search);

            alert(
                `${data.item} adicionado aos favoritos`
            );
        });
}

function renderTable(stores) {

    stores.sort(
        (a, b) => a.itemPrice - b.itemPrice
    );

    results.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Loja</th>
                    <th>Vendedor</th>
                    <th>Preço</th>
                    <th>Qtd</th>
                </tr>
            </thead>

            <tbody>

            ${stores.map(x => `
                <tr>
                <td>
                    <img
                        src="${x.databaseImgPath}"
                        width="32"
                        height="32">
                    </td>
                    <td>${x.storeName}</td>
                    <td>${x.itemSellerCharName}</td>
                    <td>${formatZeny(x.itemPrice)} z</td>
                    <td>${x.itemCnt}</td>
                </tr>
            `).join("")}

            </tbody>
        </table>
    `;
}

renderFavorites(search);
renderRecents(search);