export default async function handler(req, res) {
  try {

    const item = req.query.item;

    const url =
    `https://ro.gnjoylatam.com/intro/shop-search/trading?storeType=BUY&serverType=FREYA&searchWord=${encodeURIComponent(item)}&_rsc=test`;

    const response = await fetch(url, {
      headers: {
        RSC: "1"
      }
    });

    const text = await response.text();

    const listStart = text.indexOf('"list":[');

    if (listStart === -1) {
      return res.status(404).json({
        error: "Lista não encontrada"
      });
    }

    const totalCountPos = text.indexOf('],"totalCount"', listStart);

    if (totalCountPos === -1) {
      return res.status(404).json({
        error: "totalCount não encontrado"
      });
    }

    const jsonArray =
      text.substring(
        listStart + 7,
        totalCountPos + 1
      );

    const list = JSON.parse(jsonArray);

    const prices =
      list.map(x => Number(x.itemPrice));

    const stats = {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: Math.round(
        prices.reduce((a, b) => a + b, 0) / prices.length
      )
    };

    return res.json({
      success: true,
      item,
      count: list.length,
      stats,
      stores: list
    });

  } catch (err) {

    return res.status(500).json({
      error: err.message,
      stack: err.stack
    });

  }
}