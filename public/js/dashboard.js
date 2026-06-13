import { getRecents } from "./storage.js";
import { renderRecentsChips } from "./chips.js";

export function renderRecents(searchFn) {
    const recents = getRecents();
    renderRecentsChips(recents, searchFn);
}