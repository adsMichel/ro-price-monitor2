export default async function handler(req, res) {
  try {
    const item = req.query.item;

    // ─── Fetch all pages ────────────────────────────────────
    const allStores = [];
    let page        = 1;
    let totalCount  = null;

    while (true) {
      const url = `https://ro.gnjoylatam.com/intro/shop-search/trading?storeType=BUY&serverType=FREYA&searchWord=${encodeURIComponent(item)}&p=${page}&_rsc=test`;

      const response = await fetch(url, {
        headers: { RSC: "1" }
      });

      const text = await response.text();

      // ── Parse list ────────────────────────────────────────
      const listStart = text.indexOf('"list":[');
      if (listStart === -1) break; // no list on this page → stop

      const totalCountPos = text.indexOf('],"totalCount"', listStart);
      if (totalCountPos === -1) break;

      const jsonArray = text.substring(listStart + 7, totalCountPos + 1);
      const list      = JSON.parse(jsonArray);

      if (!list.length) break; // empty page → stop

      allStores.push(...list);

      // ── Parse totalCount once (from first page) ───────────
      if (totalCount === null) {
        const tcMatch = text.slice(totalCountPos).match(/"totalCount":(\d+)/);
        totalCount = tcMatch ? Number(tcMatch[1]) : null;
      }

      // ── Stop conditions ───────────────────────────────────
      // 1. We have everything the server says exists
      if (totalCount !== null && allStores.length >= totalCount) break;

      // 2. Page returned fewer items than a full page (20) → last page
      if (list.length < 20) break;

      page++;

      // 3. Safety cap — never fetch more than 10 pages (~200 listings)
      if (page > 10) break;
    }

    if (!allStores.length) {
      return res.status(404).json({ error: "Lista não encontrada" });
    }

    // ─── Stats across all pages ─────────────────────────────
    const prices = allStores.map(x => Number(x.itemPrice));

    const stats = {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
    };

    return res.json({
      success:    true,
      item,
      page,
      count:      allStores.length,
      totalCount,
      stats,
      stores:     allStores,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}