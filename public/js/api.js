export async function searchItem(itemName) {
    const response = await fetch(
        `/api/search?item=${encodeURIComponent(itemName)}`
    );
    return await response.json();
}

export async function fetchMarketPrice(itemName, period = "ALL") {
    const response = await fetch(
        `/api/market-price?item=${encodeURIComponent(itemName)}&period=${period}`
    );
    return await response.json();
}