function telegramCheck<T>(cb: () => T, defaultValue: T): T {
    if (typeof Telegram === 'undefined') {
        return defaultValue
    }

    return cb()
}

export function openTelegramLink(url: string): void {
    telegramCheck(function () {
        Telegram.WebApp.openTelegramLink(url)
    }, void 0)
}

export function isTelegramMobile(): boolean {
    return telegramCheck(function () {
        return !['weba', 'tdesktop'].includes(Telegram.WebApp.platform)
    }, false)
}

export function isTelegram(): boolean {
    return telegramCheck(function () {
        return !!Telegram.WebApp.platform && 'unknown' !== Telegram.WebApp.platform
    }, false)
}
