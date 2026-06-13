import { getFavorites, removeFavorite } from "./storage.js";
import { renderFavoritesChips } from "./chips.js";

export function renderFavorites(searchFn) {
    const favorites = getFavorites();
    renderFavoritesChips(favorites, searchFn);
}