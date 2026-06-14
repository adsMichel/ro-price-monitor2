export default async function handler(req, res) {
  try {
    const { item, period = "ALL" } = req.query;

    if (!item) {
      return res.status(400).json({ error: "Parâmetro 'item' obrigatório" });
    }

    const routerPath = `/pt/intro/shop-search/market-price?serverType=FREYA&period=${encodeURIComponent(period)}&searchWord=${encodeURIComponent(item)}`;
    const pageKey    = `__PAGE__?{"serverType":"FREYA","period":"${period}","searchWord":"${item}"}`;

    const stateTree = encodeURIComponent(JSON.stringify([
      "",
      { children: [
        ["locale","pt","d"],
        { children: ["(primary)", { children: ["intro", { children: ["shop-search", { children: [
          ["id","market-price","d"],
          { children: [pageKey, {}, routerPath] }
        , null, null] }, null, null] }, null, null] }, null, null] },
        null, null
      ]},
      null, null, true
    ]));

    const url = `https://ro.gnjoylatam.com/pt/intro/shop-search/market-price?serverType=FREYA&period=${encodeURIComponent(period)}&searchWord=${encodeURIComponent(item)}`;

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

    // ── Debug: scan full text for any data keys ─────────────
    if (req.query.debug === "1") {
      const keys = ["priceList","list","marketPrice","avgPrice","itemPrice",
                    "referenceDate","tradeDate","searchWord","totalCount","count"];
      const found = keys
        .map(k => ({ key: k, idx: text.indexOf(`"${k}"`) }))
        .filter(c => c.idx > -1)
        .map(c => ({ key: c.key, window: text.substring(Math.max(0, c.idx - 20), c.idx + 200) }));

      return res.json({ length: text.length, found, fullText: text });
    }

    // ── Parse: try known field names ────────────────────────
    const fieldCandidates = ["priceList","list","marketPriceList","itemPriceList","tradeList","data","items"];

    for (const field of fieldCandidates) {
      const key   = `"${field}":[`;
      const start = text.indexOf(key);
      if (start === -1) continue;

      let depth = 0, arrayEnd = start + key.length - 1;
      for (let i = arrayEnd; i < text.length; i++) {
        if (text[i] === "[") depth++;
        else if (text[i] === "]") { depth--; if (depth === 0) { arrayEnd = i + 1; break; } }
      }

      try {
        const list = JSON.parse(text.substring(start + key.length - 1, arrayEnd));
        if (!list.length) continue;

        const prices = list.map(x => Number(x.avgPrice ?? x.itemPrice ?? x.price ?? x.minPrice ?? 0)).filter(Boolean);
        const stats  = prices.length ? {
          min: Math.min(...prices),
          max: Math.max(...prices),
          avg: Math.round(prices.reduce((a,b) => a+b, 0) / prices.length),
        } : null;

        return res.json({ success: true, item, period, count: list.length, stats, priceList: list });
      } catch (_) { continue; }
    }

    return res.status(404).json({ error: "Dados não encontrados", length: text.length, snippet: text.substring(0, 1000) });

  } catch (err) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}