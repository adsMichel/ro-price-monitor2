import { getTriggered } from "./storage.js";
import { renderRecentsChips } from "./chips.js";

// "Últimas Atualizações" panel — only shows items that fired a price alert
export function renderRecents(searchFn) {
    const triggered = getTriggered();
    renderRecentsChips(triggered, searchFn);
}