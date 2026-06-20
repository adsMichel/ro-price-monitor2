import { getTriggered } from "./storage.js";

// ─── Últimas Atualizações panel ──────────────────────────────
// Shows items that fired a price alert with name, price and time.

export function renderRecents(searchFn) {
    const list      = document.getElementById("recents-list");
    const triggered = getTriggered();

    if (!triggered.length) {
        list.innerHTML = `<p class="empty-state">Nenhuma atualização ainda. Inicie o monitoramento para acompanhar os preços.</p>`;
        return;
    }

    const fmt  = v  => Number(v).toLocaleString("pt-BR");
    const time = iso => {
        const d = new Date(iso);
        return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    };

    list.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:6px;">
            ${triggered.map(entry => `
                <div class="triggered-row" data-item="${entry.name}" style="
                    display:grid; grid-template-columns:1fr auto auto;
                    align-items:center; gap:12px;
                    background:var(--bg-deep); border:1px solid var(--border);
                    border-radius:var(--radius-md); padding:.6rem 1rem;
                    cursor:pointer; transition:border-color .15s;"
                    title="Clique para pesquisar">

                    <span style="font-size:13px; color:var(--parchment);
                        white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        ${entry.name}
                    </span>

                    <span style="font-family:var(--font-display); font-size:13px;
                        color:var(--green); font-weight:600; white-space:nowrap;">
                        ${fmt(entry.price)} z
                    </span>

                    <span style="font-size:11px; color:var(--parchment-dim); white-space:nowrap;">
                        ${time(entry.time)}
                    </span>
                </div>
            `).join("")}
        </div>`;

    // Hover effect + click to search
    list.querySelectorAll(".triggered-row").forEach(row => {
        row.addEventListener("mouseenter", () => {
            row.style.borderColor = "var(--gold-dim)";
        });
        row.addEventListener("mouseleave", () => {
            row.style.borderColor = "var(--border)";
        });
        row.addEventListener("click", () => searchFn(row.dataset.item));
    });
}