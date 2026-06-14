import { getHistory, getFavorites, getRecents } from "./storage.js";
import { fetchMarketPrice } from "./api.js";

// ─── Public API ─────────────────────────────────────────────

export function openHistory(preselectedItem = null) {
    const items = _getKnownItems();
    _renderModal(items, preselectedItem || items[0] || null);
}

// ─── Known items (union of favorites + recents) ─────────────

function _getKnownItems() {
    const set = new Set([...getFavorites(), ...getRecents()]);
    return [...set];
}

// ─── Modal ──────────────────────────────────────────────────

function _renderModal(items, selectedItem) {
    _removeModal();

    const overlay = document.createElement("div");
    overlay.id = "ro-history-overlay";
    overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 1000;
        background: rgba(10,7,20,0.85);
        display: flex; align-items: center; justify-content: center;
        padding: 1rem;`;

    overlay.innerHTML = `
        <div id="ro-history-modal" style="
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            width: 100%; max-width: 680px;
            max-height: 90vh; overflow-y: auto;
            padding: 1.5rem;">

            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1.25rem;">
                <span style="font-family:var(--font-display); font-size:14px; letter-spacing:.1em; text-transform:uppercase; color:var(--parchment);">
                    Histórico de Preços
                </span>
                <button id="ro-history-close" style="
                    background:none; border:none; cursor:pointer;
                    color:var(--parchment-dim); font-size:20px; line-height:1;
                    padding:4px 8px;" aria-label="Fechar">✕</button>
            </div>

            ${items.length === 0 ? `
                <p style="color:var(--parchment-dim); font-size:14px; text-align:center; padding:2rem 0;">
                    Nenhum histórico disponível. Pesquise itens para começar a registrar preços.
                </p>` : `
                <div style="display:grid; grid-template-columns:1fr auto; gap:10px; margin-bottom:1rem; align-items:end;">
                    <div>
                        <label style="font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:var(--gold-dim); display:block; margin-bottom:.5rem;">Item</label>
                        <select id="ro-history-select" style="
                            width:100%; background:var(--bg-deep);
                            border:1px solid var(--border); border-radius:var(--radius-md);
                            color:var(--parchment); font-family:var(--font-ui); font-size:14px;
                            padding:.55rem .9rem; outline:none; cursor:pointer;">
                            ${items.map(i => `<option value="${i}" ${i === selectedItem ? "selected" : ""}>${i}</option>`).join("")}
                        </select>
                    </div>
                    <div>
                        <label style="font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:var(--gold-dim); display:block; margin-bottom:.5rem;">Período</label>
                        <select id="ro-history-period" style="
                            background:var(--bg-deep); border:1px solid var(--border);
                            border-radius:var(--radius-md); color:var(--parchment);
                            font-family:var(--font-ui); font-size:14px;
                            padding:.55rem .9rem; outline:none; cursor:pointer;">
                            <option value="ALL">Todo período</option>
                            <option value="1M">1 Mês</option>
                            <option value="3M">3 Meses</option>
                            <option value="6M">6 Meses</option>
                        </select>
                    </div>
                </div>
                <div style="display:flex; gap:8px; margin-bottom:1rem;">
                    <button class="ro-source-btn active" data-source="server" style="
                        flex:1; padding:.45rem; border-radius:var(--radius-sm); font-family:var(--font-ui);
                        font-size:12px; cursor:pointer; border:1px solid rgba(139,47,201,0.4);
                        background:var(--purple-dim); color:var(--purple-light);">
                        📡 Dados do Servidor
                    </button>
                    <button class="ro-source-btn" data-source="local" style="
                        flex:1; padding:.45rem; border-radius:var(--radius-sm); font-family:var(--font-ui);
                        font-size:12px; cursor:pointer; border:1px solid var(--border);
                        background:var(--bg-raised); color:var(--parchment-dim);">
                        💾 Histórico Local
                    </button>
                </div>
                <div id="ro-history-chart-area"></div>
            `}
        </div>`;

    document.body.appendChild(overlay);

    overlay.addEventListener("click", e => { if (e.target === overlay) _removeModal(); });
    document.getElementById("ro-history-close").addEventListener("click", _removeModal);

    const select  = document.getElementById("ro-history-select");
    const period  = document.getElementById("ro-history-period");

    let currentSource = "server";

    function refresh() {
        const item = select?.value;
        const per  = period?.value || "ALL";
        if (!item) return;
        if (currentSource === "server") {
            _renderChartFromServer(item, per);
        } else {
            _renderChart(item);
        }
    }

    document.querySelectorAll(".ro-source-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".ro-source-btn").forEach(b => {
                b.style.background    = "var(--bg-raised)";
                b.style.color         = "var(--parchment-dim)";
                b.style.borderColor   = "var(--border)";
            });
            btn.style.background  = "var(--purple-dim)";
            btn.style.color       = "var(--purple-light)";
            btn.style.borderColor = "rgba(139,47,201,0.4)";
            currentSource = btn.dataset.source;
            refresh();
        });
    });

    if (select) {
        select.addEventListener("change", refresh);
        period?.addEventListener("change", refresh);
        if (selectedItem) refresh();
    }
}

function _renderChart(itemName) {
    const area = document.getElementById("ro-history-chart-area");
    if (!area) return;

    const history = getHistory(itemName);

    if (!history.length) {
        area.innerHTML = `<p style="color:var(--parchment-dim); font-size:13px; text-align:center; padding:1.5rem 0;">
            Sem registros locais para <strong style="color:var(--parchment)">${itemName}</strong>.<br>
            <span style="font-size:12px;">Pesquise o item para começar a gravar o histórico.</span></p>`;
        return;
    }

    const prices = history.map(h => h.price);
    const min    = Math.min(...prices);
    const max    = Math.max(...prices);
    const range  = max - min || 1;

    const W = 620, H = 180, PAD = { top: 16, right: 16, bottom: 36, left: 72 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top  - PAD.bottom;

    const pts = history.map((h, i) => {
        const x = PAD.left + (i / Math.max(history.length - 1, 1)) * chartW;
        const y = PAD.top  + (1 - (h.price - min) / range) * chartH;
        return { x, y, h };
    });

    const polyline = pts.map(p => `${p.x},${p.y}`).join(" ");
    const area_pts = `${pts[0].x},${PAD.top + chartH} ` +
                     pts.map(p => `${p.x},${p.y}`).join(" ") +
                     ` ${pts.at(-1).x},${PAD.top + chartH}`;

    // Y-axis labels (3 ticks)
    const yTicks = [min, (min + max) / 2, max].map((v, i) => {
        const y = PAD.top + (1 - (v - min) / range) * chartH;
        return `<text x="${PAD.left - 8}" y="${y + 4}" text-anchor="end"
            font-size="10" fill="var(--parchment-dim)" font-family="var(--font-ui)">
            ${Number(v).toLocaleString("pt-BR")}z</text>`;
    });

    // X-axis labels (first, mid, last)
    const xIndices = [0, Math.floor((history.length - 1) / 2), history.length - 1];
    const xTicks = xIndices.map(i => {
        const p = pts[i];
        const d = new Date(history[i].date);
        const label = `${d.getDate().toString().padStart(2,"0")}/${(d.getMonth()+1).toString().padStart(2,"0")} ${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
        return `<text x="${p.x}" y="${H - 6}" text-anchor="middle"
            font-size="9" fill="var(--parchment-dim)" font-family="var(--font-ui)">${label}</text>`;
    });

    area.innerHTML = `
        <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"
            style="width:100%; height:auto; display:block; margin-top:.5rem;">

            <!-- Area fill -->
            <polygon points="${area_pts}" fill="rgba(200,150,12,0.08)"/>

            <!-- Grid lines -->
            ${[0, 0.5, 1].map(t => {
                const y = PAD.top + t * chartH;
                return `<line x1="${PAD.left}" y1="${y}" x2="${W - PAD.right}" y2="${y}"
                    stroke="rgba(200,150,12,0.12)" stroke-width="1"/>`;
            }).join("")}

            <!-- Line -->
            <polyline points="${polyline}"
                fill="none" stroke="var(--gold)" stroke-width="1.8"
                stroke-linejoin="round" stroke-linecap="round"/>

            <!-- Dots -->
            ${pts.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3"
                fill="var(--bg-card)" stroke="var(--gold)" stroke-width="1.5"/>`).join("")}

            <!-- Y ticks -->
            ${yTicks.join("")}

            <!-- X ticks -->
            ${xTicks.join("")}

            <!-- Axes -->
            <line x1="${PAD.left}" y1="${PAD.top}" x2="${PAD.left}" y2="${PAD.top + chartH}"
                stroke="var(--border)" stroke-width="1"/>
            <line x1="${PAD.left}" y1="${PAD.top + chartH}" x2="${W - PAD.right}" y2="${PAD.top + chartH}"
                stroke="var(--border)" stroke-width="1"/>
        </svg>

        <div style="display:flex; gap:1.5rem; margin-top:.75rem; font-size:12px; color:var(--parchment-dim);">
            <span>Mín: <strong style="color:var(--green)">${min.toLocaleString("pt-BR")} z</strong></span>
            <span>Máx: <strong style="color:var(--red)">${max.toLocaleString("pt-BR")} z</strong></span>
            <span>Registros: <strong style="color:var(--parchment)">${history.length}</strong></span>
        </div>`;
}

async function _renderChartFromServer(itemName, period) {
    const area = document.getElementById("ro-history-chart-area");
    if (!area) return;

    area.innerHTML = `<p style="color:var(--gold-dim); font-size:13px; text-align:center; padding:1.5rem 0;">
        Buscando dados do servidor…</p>`;

    try {
        const data = await fetchMarketPrice(itemName, period);

        if (!data.success || !data.priceList?.length) {
            area.innerHTML = `<p style="color:var(--parchment-dim); font-size:13px; text-align:center; padding:1.5rem 0;">
                Nenhum dado do servidor para <strong style="color:var(--parchment)">${itemName}</strong>.</p>`;
            return;
        }

        // Normalize server data to same shape as local history
        const history = data.priceList.map(x => ({
            date:  x.date ?? x.referenceDate ?? new Date().toISOString(),
            price: Number(x.avgPrice ?? x.price ?? 0),
        })).filter(h => h.price > 0);

        _drawChart(area, history, itemName);

    } catch (err) {
        area.innerHTML = `<p style="color:var(--red); font-size:13px; text-align:center; padding:1.5rem 0;">
            Erro ao buscar dados: ${err.message}</p>`;
    }
}

function _removeModal() {
    document.getElementById("ro-history-overlay")?.remove();
}