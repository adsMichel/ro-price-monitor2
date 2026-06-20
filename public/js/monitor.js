import { getFavorites, saveHistory, saveRecent } from "./storage.js";
import { searchItem } from "./api.js";
import { shouldAlert } from "./alerts.js";
import { renderRecents } from "./dashboard.js";

// Registered by app.js so the monitor can trigger UI updates
let _searchFn = () => {};
export function setSearchFn(fn) { _searchFn = fn; }

export async function monitorFavorites() {
    const allFavorites = getFavorites();

    // Only monitor items that have an active alert with a threshold > 0
    const settings = JSON.parse(localStorage.getItem("ro_settings") || "{}");
    const alerts   = settings.alerts || {};
    const favorites = allFavorites.filter(item =>
        alerts[item]?.enabled && alerts[item]?.threshold > 0
    );

    if (!favorites.length) {
        console.log("[MONITOR] Nenhum item com alerta ativo para verificar");
        setMonitorState("done");
        updateLastChecked();
        return;
    }

    console.log(`[MONITOR] Verificando ${favorites.length} de ${allFavorites.length} favoritos com alerta ativo`);

    setMonitorState("loading");

    for (const item of favorites) {
        try {
            const data = await searchItem(item);

            const history = JSON.parse(
                localStorage.getItem("ro_history") || "{}"
            );

            const previous = history[item]?.at(-1);

            // ── Check 1: threshold alert (independent, fires whenever price <= limit)
            if (shouldAlert(item, data.stats.min)) {
                notifyPriceDrop(item, previous?.price ?? data.stats.min, data.stats.min);
                // Add to recents so the user can see the result immediately
                saveRecent(item);
                renderRecents(_searchFn);
            }
            // ── Check 2: historical drop (fires only if price fell since last check)
            else if (previous && data.stats.min < previous.price) {
                notifyPriceDrop(item, previous.price, data.stats.min);
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

    // Inject spin keyframe once
    if (!document.getElementById("ro-spin-style")) {
        const style = document.createElement("style");
        style.id = "ro-spin-style";
        style.textContent = `@keyframes ro-spin { to { transform: rotate(360deg); } }`;
        document.head.appendChild(style);
    }

    const iconSpin = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"
        style="animation: ro-spin 1s linear infinite" aria-hidden="true">
        <polyline points="1 4 1 10 7 10"/>
        <path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
    </svg>`;

    const iconIdle = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="1 4 1 10 7 10"/>
        <path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
    </svg>`;

    if (state === "loading") {
        btn.disabled = true;
        btn.style.opacity = "0.6";
        btn.classList.remove("is-active");
        btn.innerHTML = `${iconSpin}<span class="btn-label">Verificando…</span>`;
    } else {
        btn.disabled = false;
        btn.style.opacity = "";
        // Delegate final appearance to app.js which knows about alert state
        if (typeof window.refreshMonitorBtn === "function") {
            window.refreshMonitorBtn();
        }
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