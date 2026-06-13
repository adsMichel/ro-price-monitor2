import {
    getFavorites,
    saveHistory
} from "./storage.js";

import { searchItem } from "./api.js";

export async function monitorFavorites() {

    const favorites =
        getFavorites();

    console.log(
        `[MONITOR] Verificando ${favorites.length} itens`
    );

    for (const item of favorites) {

        try {

            const data =
                await searchItem(item);

            const history =
                JSON.parse(
                    localStorage.getItem(
                        "ro_history"
                    ) || "{}"
                );

            const previous =
                history[item]?.at(-1);

            if (
                previous &&
                data.stats.min < previous.price
            ) {

                notifyPriceDrop(
                    item,
                    previous.price,
                    data.stats.min
                );
            }

            saveHistory(
                item,
                data.stats.min
            );

            console.log(
                `[MONITOR] ${item}: ${data.stats.min}`
            );

        } catch (err) {

            console.error(
                `[MONITOR] Erro em ${item}`,
                err
            );
        }
    }

    function notifyPriceDrop(
        item,
        oldPrice,
        newPrice
    ) {

        if (
            Notification.permission
            !== "granted"
        ) {
            return;
        }

        new Notification(
            "Preço caiu!",
            {
                body:
                    `${item}\n` +
                    `${oldPrice.toLocaleString()} → ${newPrice.toLocaleString()}`
            }
        );
    }
}