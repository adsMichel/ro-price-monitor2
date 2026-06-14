export default async function handler(req, res) {
  try {
    const { item, period = "ALL" } = req.query;

    if (!item) {
      return res.status(400).json({ error: "Parâmetro 'item' obrigatório" });
    }

    // Build the Next-Router-State-Tree with search params embedded
    const pageKey = `__PAGE__?{"serverType":"FREYA","period":"${period}","searchWord":"${item}"}`;
    const routerPath = `/pt/intro/shop-search/market-price?serverType=FREYA&period=${encodeURIComponent(period)}&searchWord=${encodeURIComponent(item)}`;

    const stateTree = encodeURIComponent(JSON.stringify([
      "",
      {
        children: [
          ["locale", "pt", "d"],
          {
            children: [
              "(primary)",
              {
                children: [
                  "intro",
                  {
                    children: [
                      "shop-search",
                      {
                        children: [
                          ["id", "market-price", "d"],
                          {
                            children: [
                              pageKey,
                              {},
                              routerPath,
                              "refresh"
                            ]
                          },
                          null,
                          null
                        ]
                      },
                      null,
                      null
                    ]
                  },
                  null,
                  null
                ]
              },
              null,
              null
            ]
          },
          null,
          null
        ]
      },
      null,
      null,
      true
    ]));

    const url =
      `https://ro.gnjoylatam.com/pt/intro/shop-search/market-price` +
      `?serverType=FREYA` +
      `&period=${encodeURIComponent(period)}` +
      `&searchWord=${encodeURIComponent(item)}`;

    const response = await fetch(url, {
      headers: {
        "accept":                    "*/*",
        "accept-encoding":           "gzip, deflate, br, zstd",
        "accept-language":           "pt-BR,pt;q=0.9,en;q=0.8",
        "rsc":                       "1",
        "next-router-prefetch":      "1",
        "next-router-state-tree":    stateTree,
        "next-url":                  "/pt/intro/shop-search/market-price",
        "referer":                   `https://ro.gnjoylatam.com/pt/intro/shop-search/market-price?serverType=FREYA&period=${encodeURIComponent(period)}&searchWord=${encodeURIComponent(item)}`,
        "sec-fetch-dest":            "empty",
        "sec-fetch-mode":            "cors",
        "sec-fetch-site":            "same-origin",
        "user-agent":                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0",
        "cookie":                    process.env.RO_SESSION_COOKIE ?? "",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Upstream retornou ${response.status}` });
    }

    const text = await response.text();

    // ── Debug mode ──────────────────────────────────────────
    if (req.query.debug === "1") {
      const candidates = ["priceList", "list", "marketPrice", "avgPrice", "itemPrice", "referenceDate", "tradeDate"]
        .map(k => ({ key: k, idx: text.indexOf(`"${k}"`) }))
        .filter(c => c.idx > -1)
        .map(c => ({ key: c.key, window: text.substring(Math.max(0, c.idx - 30), c.idx + 300) }));

      return res.json({ debug: true, length: text.length, candidates });
    }

    // ── Parse data ──────────────────────────────────────────
    const fieldCandidates = ["priceList", "list", "marketPriceList", "itemPriceList", "tradeList", "data"];

    for (const field of fieldCandidates) {
      const key   = `"${field}":[`;
      const start = text.indexOf(key);
      if (start === -1) continue;

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

      try {
        const list = JSON.parse(text.substring(arrayStart, arrayEnd));
        if (!list.length) continue;

        const prices = list.map(x =>
          Number(x.avgPrice ?? x.itemPrice ?? x.price ?? x.minPrice ?? 0)
        ).filter(Boolean);

        const stats = prices.length ? {
          min: Math.min(...prices),
          max: Math.max(...prices),
          avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
        } : null;

        return res.json({ success: true, item, period, count: list.length, stats, priceList: list });
      } catch (_) { continue; }
    }

    // Nothing found
    return res.status(404).json({
      error:   "Dados não encontrados",
      length:  text.length,
      snippet: text.substring(0, 500),
    });

  } catch (err) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}