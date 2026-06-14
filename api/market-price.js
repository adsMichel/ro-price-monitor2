export default async function handler(req, res) {
  try {
    const { item, period = "ALL" } = req.query;

    if (!item) {
      return res.status(400).json({ error: "Parâmetro 'item' obrigatório" });
    }

    // Period values: ALL, 30 (1 month), 90 (3 months), 180 (6 months)
    const url = `https://ro.gnjoylatam.com/pt/intro/shop-search/market-price?serverType=FREYA&period=${encodeURIComponent(period)}&searchWord=${encodeURIComponent(item)}`;

    // State tree uses ALL and the previous path — period is resolved via URL only
    const prevPath = `/intro/shop-search/market-price?serverType=FREYA&period=ALL&searchWord=${encodeURIComponent(item)}`;
    const pageKey  = `__PAGE__?{"serverType":"FREYA","period":"ALL","searchWord":"${item}"}`;

    const stateTree = encodeURIComponent(JSON.stringify([
      "",
      { children: [
        ["locale","pt","d"],
        { children: ["(primary)", { children: ["intro", { children: ["shop-search", { children: [
          ["id","market-price","d"],
          { children: [pageKey, {}, prevPath, "refresh"] }
        , null, null, true] }, null, null, true] }, null, null] }, null, null] },
        null, null
      ]},
      null, null, true
    ]));

    const response = await fetch(url, {
      headers: {
        "accept":                 "*/*",
        "accept-encoding":        "gzip, deflate, br, zstd",
        "accept-language":        "pt-BR,pt;q=0.9",
        "rsc":                    "1",
        "next-url":               "/pt/intro/shop-search/market-price",
        "next-router-state-tree": stateTree,
        "referer":                url,
        "sec-fetch-dest":         "empty",
        "sec-fetch-mode":         "cors",
        "sec-fetch-site":         "same-origin",
        "user-agent":             "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0",
        "cookie":                 process.env.RO_SESSION_COOKIE ?? "",
      },
    });

    const text = await response.text();

    // ── Parse "list":[...] from RSC stream ──────────────────
    // Data lives inside the $L12 component payload:
    // 10:[...null,{"queryParams":{...},"list":[{...}],"totalCount":N}]
    const key   = '"list":[';
    const start = text.indexOf(key);

    if (start === -1) {
      return res.status(404).json({ error: "Dados não encontrados", length: text.length });
    }

    let depth = 0;
    const arrayStart = start + key.length - 1;
    let arrayEnd     = arrayStart;

    for (let i = arrayStart; i < text.length; i++) {
      if (text[i] === "[") depth++;
      else if (text[i] === "]") {
        depth--;
        if (depth === 0) { arrayEnd = i + 1; break; }
      }
    }

    const list = JSON.parse(text.substring(arrayStart, arrayEnd));

    if (!list.length) {
      return res.status(404).json({ error: "Nenhum item encontrado para: " + item });
    }

    // ── Parse totalCount ────────────────────────────────────
    const tcMatch    = text.slice(arrayEnd).match(/"totalCount":(\d+)/);
    const totalCount = tcMatch ? Number(tcMatch[1]) : list.length;

    // ── Normalise fields ────────────────────────────────────
    // Server returns: minItemPrice, maxItemPrice, avgItemPrice
    const stats = {
      min: list[0].minItemPrice,
      max: list[0].maxItemPrice,
      avg: list[0].avgItemPrice,
    };

    return res.json({
      success:    true,
      item,
      period,
      count:      list.length,
      totalCount,
      stats,
      priceList:  list,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}