import { getFavorites, saveHistory } from "./storage.js";
import { searchItem } from "./api.js";
import { shouldAlert } from "./alerts.js";

export async function monitorFavorites() {
    const favorites = getFavorites();

    console.log(`[MONITOR] Verificando ${favorites.length} itens`);

    setMonitorState("loading");

    for (const item of favorites) {
        try {
            const data = await searchItem(item);

            const history = JSON.parse(
                localStorage.getItem("ro_history") || "{}"
            );

            const previous = history[item]?.at(-1);

            if (previous && data.stats.min < previous.price) {
                notifyPriceDrop(item, previous.price, data.stats.min);
            } else if (shouldAlert(item, data.stats.min)) {
                notifyPriceDrop(item, previous?.price ?? data.stats.min, data.stats.min);
            }

            saveHistory(item, data.stats.min);

            console.log(`[MONITOR] ${item}: ${data.stats.min}`);

        } catch (err) {
            console.error(`[MONITOR] Erro em ${item}`, err);
        }
    }

    setMonitorState("done");
    updateLastChecked();
}

// ─── UI feedback ────────────────────────────────────────────

function setMonitorState(state) {
    const btn = document.getElementById("monitorNowBtn");
    if (!btn) return;

    if (state === "loading") {
        btn.disabled = true;
        btn.style.opacity = "0.6";
        btn.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"
                style="animation: ro-spin 1s linear infinite">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
            </svg>
            Monitorando…`;

        // Inject keyframe once
        if (!document.getElementById("ro-spin-style")) {
            const style = document.createElement("style");
            style.id = "ro-spin-style";
            style.textContent = `@keyframes ro-spin { to { transform: rotate(360deg); } }`;
            document.head.appendChild(style);
        }
    } else {
        btn.disabled = false;
        btn.style.opacity = "";
        btn.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
            </svg>
            Monitorar Agora`;
    }
}

function updateLastChecked() {
    const el = document.getElementById("stat-updated");
    if (!el) return;
    el.textContent = new Date().toLocaleTimeString("pt-BR", {
        hour:   "2-digit",
        minute: "2-digit",
    });
}

// ─── Notification ────────────────────────────────────────────

function notifyPriceDrop(item, oldPrice, newPrice) {
    if (Notification.permission !== "granted") return;

    new Notification("Preço caiu! ⬇", {
        body: `${item}\n${oldPrice.toLocaleString("pt-BR")} z → ${newPrice.toLocaleString("pt-BR")} z`,
    });
}