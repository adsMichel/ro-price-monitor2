import { getFavorites } from "./storage.js";

export function renderFavorites(searchFn) {
    // Delegate to sidebar renderer registered in app.js
    if (typeof window._renderSidebarFavorites === "function") {
        window._renderSidebarFavorites(searchFn);
    }
}