import { fetchMarketPrice } from "./api.js";

// ─── Public API ─────────────────────────────────────────────

export function openTrending() {
    _renderModal();
}

// ─── Modal ──────────────────────────────────────────────────

function _renderModal() {
    _removeModal();

    const overlay = document.createElement("div");
    overlay.id = "ro-trending-overlay";
    overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 1000;
        background: rgba(10,7,20,0.85);
        display: flex; align-items: center; justify-content: center;
        padding: 1rem;`;

    overlay.innerHTML = `
        <div style="
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            width: 100%; max-width: 680px;
            max-height: 90vh; overflow-y: auto;
            padding: 1.5rem;">

            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1.25rem;">
                <span style="font-family:var(--font-display); font-size:14px; letter-spacing:.1em; text-transform:uppercase; color:var(--parchment);">
                    🔥 Mais Vendidos
                </span>
                <button id="ro-trending-close" style="
                    background:none; border:none; cursor:pointer;
                    color:var(--parchment-dim); font-size:20px; line-height:1;
                    padding:4px 8px;" aria-label="Fechar">✕</button>
            </div>

            <!-- Period selector -->
            <div style="display:flex; gap:6px; margin-bottom:1.25rem;">
                <span style="font-size:11px; letter-spacing:.1em; text-transform:uppercase;
                    color:var(--parchment-dim); align-self:center; margin-right:4px;">Período</span>
                ${["ALL","1","7","30"].map((v, i) => {
                    const labels = ["Todo período","1 Dia","7 Dias","30 Dias"];
                    return `<button class="ro-trending-period ${i === 2 ? "active" : ""}"
                        data-period="${v}" style="
                        flex:1; padding:.4rem; border-radius:var(--radius-sm);
                        font-family:var(--font-ui); font-size:12px; cursor:pointer;
                        border:1px solid ${i === 2 ? "rgba(139,47,201,0.5)" : "var(--border)"};
                        background:${i === 2 ? "var(--purple-dim)" : "var(--bg-raised)"};
                        color:${i === 2 ? "var(--purple-light)" : "var(--parchment-dim)"};">
                        ${labels[i]}
                    </button>`;
                }).join("")}
            </div>

            <div id="ro-trending-body">
                <p style="color:var(--gold-dim); font-size:13px; text-align:center; padding:2rem 0;">
                    Carregando ranking…</p>
            </div>
        </div>`;

    document.body.appendChild(overlay);

    overlay.addEventListener("click", e => { if (e.target === overlay) _removeModal(); });
    document.getElementById("ro-trending-close").addEventListener("click", _removeModal);

    // Period buttons
    document.querySelectorAll(".ro-trending-period").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".ro-trending-period").forEach(b => {
                b.style.background  = "var(--bg-raised)";
                b.style.color       = "var(--parchment-dim)";
                b.style.borderColor = "var(--border)";
            });
            btn.style.background  = "var(--purple-dim)";
            btn.style.color       = "var(--purple-light)";
            btn.style.borderColor = "rgba(139,47,201,0.5)";
            _loadRanking(btn.dataset.period);
        });
    });

    // Load default (7 days)
    _loadRanking("7");
}

// ─── Load & render ranking ───────────────────────────────────

async function _loadRanking(period) {
    const body = document.getElementById("ro-trending-body");
    if (!body) return;

    body.innerHTML = `<p style="color:var(--gold-dim); font-size:13px; text-align:center; padding:2rem 0;">
        Carregando ranking…</p>`;

    try {
        const data = await fetchMarketPrice(" ", period);

        if (!data.success || !data.priceList?.length) {
            body.innerHTML = `<p style="color:var(--parchment-dim); font-size:13px; text-align:center; padding:2rem 0;">
                Nenhum dado disponível para este período.</p>`;
            return;
        }

        // Sort by totalItemCnt descending (server already sorts, but enforce it)
        const list = [...data.priceList].sort((a, b) => b.totalItemCnt - a.totalItemCnt);
        const fmt  = v => Number(v).toLocaleString("pt-BR");
        const maxCnt = list[0].totalItemCnt;

        body.innerHTML = `
            <div style="font-size:12px; color:var(--parchment-dim); margin-bottom:1rem;">
                ${fmt(data.totalCount)} itens no mercado &middot; Top ${list.length} por volume
            </div>

            <div style="display:flex; flex-direction:column; gap:8px;">
                ${list.map((x, i) => {
                    const barW   = Math.round((x.totalItemCnt / maxCnt) * 100);
                    const medal  = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `<span style="color:var(--parchment-dim); font-size:12px; min-width:20px; text-align:center;">${i + 1}</span>`;
                    const img    = x.databaseImgPath
                        ? `<img src="${x.databaseImgPath}" width="32" height="32"
                            style="image-rendering:pixelated; border-radius:4px;
                            border:1px solid var(--border); background:var(--bg-deep); flex-shrink:0;">`
                        : `<div style="width:32px; height:32px; border-radius:4px;
                            border:1px solid var(--border); background:var(--bg-deep);
                            display:flex; align-items:center; justify-content:center;
                            font-size:10px; color:var(--parchment-dim); flex-shrink:0;">?</div>`;

                    return `
                        <div style="
                            background:var(--bg-deep); border:1px solid var(--border);
                            border-radius:var(--radius-md); padding:.75rem 1rem;
                            display:grid; grid-template-columns:24px 36px 1fr auto;
                            align-items:center; gap:10px;">

                            <div style="text-align:center; font-size:${i < 3 ? "18px" : "12px"};">${medal}</div>

                            ${img}

                            <div>
                                <div style="font-size:13px; color:var(--parchment); margin-bottom:4px;
                                    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                                    ${x.itemName}
                                </div>
                                <div style="height:4px; background:var(--bg-raised);
                                    border-radius:2px; overflow:hidden;">
                                    <div style="height:100%; width:${barW}%;
                                        background:linear-gradient(90deg, var(--purple), var(--gold));
                                        border-radius:2px;"></div>
                                </div>
                            </div>

                            <div style="text-align:right; flex-shrink:0;">
                                <div style="font-family:var(--font-display); font-size:13px;
                                    color:var(--gold-light); font-weight:600; white-space:nowrap;">
                                    ${fmt(x.totalItemCnt)}
                                </div>
                                <div style="font-size:11px; color:var(--parchment-dim); white-space:nowrap;">
                                    avg ${fmt(x.avgItemPrice)} z
                                </div>
                            </div>
                        </div>`;
                }).join("")}
            </div>`;

    } catch (err) {
        body.innerHTML = `<p style="color:var(--red); font-size:13px; text-align:center; padding:2rem 0;">
            Erro: ${err.message}</p>`;
    }
}

// ─── Cleanup ─────────────────────────────────────────────────

function _removeModal() {
    document.getElementById("ro-trending-overlay")?.remove();
}