const FAVORITES_KEY = "ro_favorites";
const RECENTS_KEY = "ro_recents";
const HISTORY_KEY = "ro_history";
const SETTINGS_KEY = "ro_settings";

export function getFavorites() {
    return JSON.parse(
        localStorage.getItem(FAVORITES_KEY) || "[]"
    );
}

export function addFavorite(itemName) {

    const favorites = getFavorites();

    if (!favorites.includes(itemName)) {
        favorites.push(itemName);

        localStorage.setItem(
            FAVORITES_KEY,
            JSON.stringify(favorites)
        );
    }
}

export function removeFavorite(itemName) {

    const favorites =
        getFavorites()
            .filter(x => x !== itemName);

    localStorage.setItem(
        FAVORITES_KEY,
        JSON.stringify(favorites)
    );
}

export function isFavorite(itemName) {
    return getFavorites().includes(itemName);
}

export function saveRecent(itemName) {

    let recents =
        JSON.parse(
            localStorage.getItem(RECENTS_KEY) || "[]"
        );

    recents =
        recents.filter(x => x !== itemName);

    recents.unshift(itemName);

    recents = recents.slice(0, 10);

    localStorage.setItem(
        RECENTS_KEY,
        JSON.stringify(recents)
    );
}

export function getRecents() {

    return JSON.parse(
        localStorage.getItem(RECENTS_KEY) || "[]"
    );
}

export function saveHistory(itemName, minPrice) {

    const history =
        JSON.parse(
            localStorage.getItem(HISTORY_KEY) || "{}"
        );

    if (!history[itemName]) {
        history[itemName] = [];
    }

    history[itemName].push({
        date: new Date().toISOString(),
        price: minPrice
    });

    history[itemName] =
        history[itemName].slice(-100);

    localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(history)
    );
}

export function getHistory(itemName) {

    const history =
        JSON.parse(
            localStorage.getItem(HISTORY_KEY) || "{}"
        );

    return history[itemName] || [];
}

export function getSettings() {

    return JSON.parse(
        localStorage.getItem(SETTINGS_KEY)
        || "{}"
    );
}

export function saveSettings(settings) {

    localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(settings)
    );
}