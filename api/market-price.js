export default async function handler(req, res) {
  try {
    const { item, period = "ALL" } = req.query;

    if (!item) {
      return res.status(400).json({ error: "Parâmetro 'item' obrigatório" });
    }

    const url =
      `https://ro.gnjoylatam.com/intro/shop-search/market-price` +
      `?serverType=FREYA` +
      `&period=${encodeURIComponent(period)}` +
      `&searchWord=${encodeURIComponent(item)}` +
      `&_rsc=g89u3`;

    const response = await fetch(url, {
      headers: {
        // ── Required RSC headers ────────────────────────────
        "RSC":                        "1",
        "Next-Router-Prefetch":       "1",
        "Next-Url":                   "/intro/shop-search/market-price",
        "Next-Router-State-Tree":     "%5B%22%22%2C%7B%22children%22%3A%5B%22intro%22%2C%7B%22children%22%3A%5B%22shop-search%22%2C%7B%22children%22%3A%5B%22market-price%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%5D%7D%5D%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D",

        // ── Browser-like headers ────────────────────────────
        "accept":                     "*/*",
        "accept-language":            "pt-BR,pt;q=0.9,en;q=0.8",
        "accept-encoding":            "gzip, deflate, br",
        "user-agent":                 "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",

        // ── Session cookies from your browser ───────────────
        // ⚠️  These expire. If the endpoint starts returning 401/empty,
        //     capture fresh cookies from DevTools and update here.
        "cookie": process.env.RO_SESSION_COOKIE ?? "",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Upstream retornou ${response.status}`,
      });
    }

    const text = await response.text();

    // ── Parse priceList ─────────────────────────────────────
    // The RSC payload contains a "priceList" key with the historical data
    const listStart = text.indexOf('"priceList":[');
    if (listStart === -1) {
      return res.status(404).json({ error: "priceList não encontrado na resposta" });
    }

    // Find the closing bracket of the array
    let depth = 0;
    let arrayStart = listStart + '"priceList":'.length;
    let arrayEnd   = arrayStart;

    for (let i = arrayStart; i < text.length; i++) {
      if (text[i] === "[") depth++;
      else if (text[i] === "]") {
        depth--;
        if (depth === 0) { arrayEnd = i + 1; break; }
      }
    }

    const priceList = JSON.parse(text.substring(arrayStart, arrayEnd));

    if (!priceList.length) {
      return res.status(404).json({ error: "Nenhum dado encontrado para este item" });
    }

    // ── Parse totalCount if present ─────────────────────────
    const tcMatch    = text.match(/"totalCount":(\d+)/);
    const totalCount = tcMatch ? Number(tcMatch[1]) : priceList.length;

    // ── Stats ───────────────────────────────────────────────
    const prices = priceList.map(x => Number(x.avgPrice ?? x.price ?? 0)).filter(Boolean);

    const stats = prices.length ? {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
    } : null;

    return res.json({
      success:    true,
      item,
      period,
      count:      priceList.length,
      totalCount,
      stats,
      priceList,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}