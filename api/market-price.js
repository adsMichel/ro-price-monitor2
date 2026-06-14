export default async function handler(req, res) {
  try {
    const { item, period = "ALL" } = req.query;

    if (!item) {
      return res.status(400).json({ error: "Parâmetro 'item' obrigatório" });
    }

    const routerPath = `/pt/intro/shop-search/market-price?serverType=FREYA&period=${encodeURIComponent(period)}&searchWord=${encodeURIComponent(item)}`;
    const pageKey    = `__PAGE__?{"serverType":"FREYA","period":"${period}","searchWord":"${item}"}`;

    // Variant A: full navigation (no "refresh", no prefetch)
    const stateTreeA = encodeURIComponent(JSON.stringify([
      "",
      {
        children: [
          ["locale","pt","d"],
          { children: ["(primary)", { children: ["intro", { children: ["shop-search", { children: [
            ["id","market-price","d"],
            { children: [pageKey, {}, routerPath] }
          , null, null] }, null, null] }, null, null] }, null, null] },
          null, null
        ]
      },
      null, null, true
    ]));

    // Variant B: state tree from your actual browser capture (with searchWord in PAGE key)
    const stateTreeB = encodeURIComponent(JSON.stringify([
      "",
      { children: [
        ["locale","pt","d"],
        { children: ["(primary)", { children: ["intro", { children: ["shop-search", { children: [
          ["id","market-price","d"],
          { children: [`__PAGE__`, {}, routerPath, "refresh"] }
        , null, null] }, null, null] }, null, null] }, null, null] },
        null, null
      ]},
      null, null, true
    ]));

    const url = `https://ro.gnjoylatam.com/pt/intro/shop-search/market-price?serverType=FREYA&period=${encodeURIComponent(period)}&searchWord=${encodeURIComponent(item)}`;

    const baseHeaders = {
      "accept":          "*/*",
      "accept-encoding": "gzip, deflate, br, zstd",
      "accept-language": "pt-BR,pt;q=0.9",
      "rsc":             "1",
      "next-url":        "/pt/intro/shop-search/market-price",
      "referer":         url,
      "sec-fetch-dest":  "empty",
      "sec-fetch-mode":  "cors",
      "sec-fetch-site":  "same-origin",
      "user-agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0",
      "cookie":          process.env.RO_SESSION_COOKIE ?? "",
    };

    // Try variant A first (no prefetch), then B (with prefetch)
    const variants = [
      { ...baseHeaders, "next-router-state-tree": stateTreeA },
      { ...baseHeaders, "next-router-state-tree": stateTreeA, "next-router-prefetch": "1" },
      { ...baseHeaders, "next-router-state-tree": stateTreeB },
    ];

    const results = [];

    for (const [i, headers] of variants.entries()) {
      const r    = await fetch(url, { headers });
      const text = await r.text();
      results.push({ variant: i, status: r.status, length: text.length, snippet: text.substring(0, 300) });
    }

    return res.json({ debug: true, results });

  } catch (err) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}