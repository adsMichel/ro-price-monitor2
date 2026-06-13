import { getFavorites, getSettings, saveSettings } from "./storage.js";

// Settings shape stored under ro_settings:
// { alerts: { [itemName]: { enabled: boolean, threshold: number } } }

// ─── Public API ─────────────────────────────────────────────

export function openAlerts() {
    const favorites = getFavorites();
    _renderModal(favorites);
}

// Called by monitor.js to check if a price drop should fire an alert
export function shouldAlert(itemName, newPrice) {
    const settings = getSettings();
    const cfg = settings?.alerts?.[itemName];
    return cfg?.enabled && newPrice <= cfg.threshold;
}

// ─── Modal ──────────────────────────────────────────────────

function _renderModal(favorites) {
    _removeModal();

    const settings = getSettings();
    const alerts   = settings.alerts || {};

    const overlay = document.createElement("div");
    overlay.id = "ro-alerts-overlay";
    overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 1000;
        background: rgba(10,7,20,0.85);
        display: flex; align-items: center; justify-content: center;
        padding: 1rem;`;

    overlay.innerHTML = `
        <div id="ro-alerts-modal" style="
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            width: 100%; max-width: 520px;
            max-height: 90vh; overflow-y: auto;
            padding: 1.5rem;">

            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1.25rem;">
                <span style="font-family:var(--font-display); font-size:14px; letter-spacing:.1em; text-transform:uppercase; color:var(--parchment);">
                    Alertas de Preço
                </span>
                <button id="ro-alerts-close" style="
                    background:none; border:none; cursor:pointer;
                    color:var(--parchment-dim); font-size:20px; line-height:1;
                    padding:4px 8px;" aria-label="Fechar">✕</button>
            </div>

            ${favorites.length === 0 ? `
                <p style="color:var(--parchment-dim); font-size:14px; text-align:center; padding:2rem 0;">
                    Adicione itens aos favoritos para configurar alertas.
                </p>` : `
                <p style="font-size:13px; color:var(--parchment-dim); margin-bottom:1.25rem; line-height:1.5;">
                    Você receberá uma notificação quando o preço mínimo cair abaixo do limite definido.
                </p>
                <div id="ro-alerts-list"></div>
                <div style="margin-top:1.25rem; text-align:right;">
                    <button id="ro-alerts-save" class="btn btn-primary" style="padding:.55rem 1.25rem; font-size:14px;">
                        Salvar alertas
                    </button>
                </div>
            `}
        </div>`;

    document.body.appendChild(overlay);

    overlay.addEventListener("click", e => { if (e.target === overlay) _removeModal(); });
    document.getElementById("ro-alerts-close").addEventListener("click", _removeModal);

    if (favorites.length > 0) {
        _renderRows(favorites, alerts);
        document.getElementById("ro-alerts-save").addEventListener("click", () => _save(favorites));
    }
}

function _renderRows(favorites, alerts) {
    const list = document.getElementById("ro-alerts-list");
    list.innerHTML = favorites.map(item => {
        const cfg     = alerts[item] || { enabled: false, threshold: 0 };
        const checked = cfg.enabled ? "checked" : "";
        return `
            <div style="
                display:grid; grid-template-columns:1fr auto 140px;
                align-items:center; gap:12px;
                padding:.75rem 0;
                border-bottom:1px solid var(--border);">

                <span style="font-size:14px; color:var(--parchment); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"
                    title="${item}">${item}</span>

                <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:13px; color:var(--parchment-dim); white-space:nowrap;">
                    <input type="checkbox" class="ro-alert-toggle" data-item="${item}" ${checked}
                        style="accent-color:var(--gold); width:15px; height:15px; cursor:pointer;">
                    Ativo
                </label>

                <div style="display:flex; align-items:center; gap:4px;">
                    <input type="number" class="ro-alert-threshold" data-item="${item}"
                        value="${cfg.threshold || ""}" placeholder="limite z"
                        min="0" step="100"
                        style="width:100%; background:var(--bg-deep);
                            border:1px solid var(--border); border-radius:var(--radius-sm);
                            color:var(--parchment); font-family:var(--font-ui);
                            font-size:13px; padding:.4rem .6rem; outline:none;">
                </div>
            </div>`;
    }).join("");
}

function _save(favorites) {
    const settings = getSettings();
    const alerts   = settings.alerts || {};

    favorites.forEach(item => {
        const toggle    = document.querySelector(`.ro-alert-toggle[data-item="${item}"]`);
        const threshold = document.querySelector(`.ro-alert-threshold[data-item="${item}"]`);
        alerts[item] = {
            enabled:   toggle?.checked   ?? false,
            threshold: Number(threshold?.value) || 0,
        };
    });

    saveSettings({ ...settings, alerts });
    _removeModal();
    _showToast("Alertas salvos com sucesso.");
}

function _removeModal() {
    document.getElementById("ro-alerts-overlay")?.remove();
}

// ─── Toast ──────────────────────────────────────────────────

function _showToast(message) {
    const existing = document.getElementById("ro-toast");
    existing?.remove();

    const toast = document.createElement("div");
    toast.id = "ro-toast";
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%);
        background: var(--bg-raised); border: 1px solid var(--border);
        color: var(--parchment); font-family: var(--font-ui); font-size: 13px;
        padding: .6rem 1.25rem; border-radius: var(--radius-md);
        z-index: 2000; opacity: 1; transition: opacity .4s;
        white-space: nowrap;`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 400);
    }, 2500);
}