export async function searchItem(itemName) {

    const response =
        await fetch(
            `/api/search?item=${encodeURIComponent(itemName)}`
        );

    return await response.json();
}