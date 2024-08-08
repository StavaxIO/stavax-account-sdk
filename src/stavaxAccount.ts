import type {Session, SessionData, StavaxAccountConfig} from "./types.js";
import {TgBotScreen} from "./types.js";
import {connect, getConnectors} from "@wagmi/core";
import {isTelegram, isTelegramMobile, openTelegramLink} from "./telegram.js";
import { walletConnect, metaMask } from '@wagmi/connectors'
import {Result} from "./result.js";

const productionAPI = 'https://account-api.stavax.io'
const productionBotURL = 'https://t.me/stavax_account_bot/app'

export class StavaxAccount {
    /**
     * Constructs a new instance of the StavaxAccount class.
     *
     * @param {StavaxAccountConfig} config - The configuration object for the StavaxAccount.
     * @throws {Error} Throws an error if the projectID is missing in the config.
     */
    constructor(private config: StavaxAccountConfig) {
        if (!this.config.projectID) {
            throw new Error('invalid project config');
        }

        if (!this.config.apiURL) {
            this.config.apiURL = productionAPI
        }

        if (!this.config.tgBotWebAppURL) {
            this.config.tgBotWebAppURL = productionBotURL
        }

        if (!this.config.requestTimeout) {
            this.config.requestTimeout = 60_000
        }
    }

    /**
     * Connects to the Stavax account with the provided configuration,
     * resolves with a session object if successful,
     * or undefined if the connection fails.
     *
     * @return {Promise<Session | undefined>} Promise that resolves with a session object or undefined.
     */
    async connect(): Promise<Session | undefined> {
        const that = this
        return new Promise((resolve, reject) => {
            const connectors = getConnectors(this.config.wagmiConfig)

            const walletConnectConnector = connectors.find(c => c.id === 'walletConnect')
            if (!walletConnectConnector) {
                reject(new Error('missing walletConnect connector'))
                return
            }

            async function onDisplayURI(payload: any) {
                if (payload.type != 'display_uri') {
                    return;
                }
                walletConnectConnector?.emitter.off('message', onDisplayURI)
                const session = await that.createSession({
                    uri: payload.data as string,
                })
                if (!session) {
                    reject(new Error('cannot create stavax account session'))
                    return
                }

                if (!that.config.disableAutoOpenTgBot) {
                    const result = that.openTgBotWithSession(session)
                    if (result.error) {
                        reject(result.error)
                        return
                    }
                }

                resolve(session)
            }

            walletConnectConnector.emitter.on('message', onDisplayURI)
            connect(this.config.wagmiConfig, {
                connector: walletConnectConnector
            })
        })
    }

    /**
     * Asynchronously creates a session.
     *
     * @param {SessionData} data - Optional data for the session.
     * @return {Promise<Session | undefined>} A promise that resolves with the created session or undefined.
     */
    async createSession(data?: SessionData): Promise<Session | undefined> {
        try {
            const res = await fetch(this.config.apiURL + '/wallet-sessions/new', {
                    method: 'POST',
                    mode: 'cors',
                    body: JSON.stringify({
                        project_id: this.config.projectID,
                        data: data || {}
                    })
                },
            )
            if (!res.ok) {
                console.error('failed to create new stavax session')
                return undefined
            }
            const json = await res.json()
            return json.data
        } catch (err) {
            console.error(err)
            return undefined
        }
    }

    /**
     * Asynchronously opens the Telegram bot
     *
     * @param {boolean} [force] - Optional flag indicating whether to force opening the screen.
     * @return {Promise<Result<void>>} A promise that resolves with a Result object indicating the success or failure of the operation.
     */
    async openTgBot(force?: boolean): Promise<Result<void>> {
        return this.openTgBotScreen(TgBotScreen.home, force)
    }

    /**
     * Opens the Telegram bot for interaction with a delay.
     *
     * @param {number} [delayMs=500] - The delay in milliseconds.
     * @param {boolean} [force] - Optional flag indicating whether to force opening the screen.
     * @return {() => void} A function that clears the timeout.
     */
    openTgBotForInteractWithDelay(delayMs: number = 500, force?: boolean): () => void {
        const tid = setTimeout(() => {
            return this.openTgBotForInteract(force)
        }, delayMs)

        return () => clearTimeout(tid)
    }

    /**
     * Asynchronously opens the Telegram bot for interact
     *
     * @param {boolean} [force] - Optional flag indicating whether to force opening the screen.
     * @return {Promise<Result<void>>} A promise that resolves with a Result object indicating the success or failure of the operation.
     */
    async openTgBotForInteract(force?: boolean): Promise<Result<void>> {
        return this.openTgBotScreen(TgBotScreen.home, force, {
            openForInteract: true
        })
    }

    /**
     * Asynchronously opens the Telegram bot screen with the specified screen and force options.
     *
     * @param {TgBotScreen} screen - The screen to open on the Telegram bot.
     * @param {boolean} [force] - Optional flag indicating whether to force opening the screen.
     * @param {SessionData} [extraData] - Optional extra data pass to session.
     * @return {Promise<Result<void>>} A promise that resolves with a Result object indicating the success or failure of the operation.
     */
    async openTgBotScreen(screen: TgBotScreen, force?: boolean, extraData?: SessionData): Promise<Result<void>> {
        let href: string = ''
        switch (screen) {
            case TgBotScreen.home:
                href = '/'
                break
            case TgBotScreen.deposit:
                href = '/currency/qr-code'
                break
            case TgBotScreen.withdraw:
                href = '/withdraw'
                break
            default:
                return new Result(void 0, new Error('invalid TgBotScreen'))
        }

        return this.openTgBotWithSessionData({
            ...(extraData || {}),
            href,
        }, force)
    }

    /**
     * Opens the Telegram bot with the specified session data and force options.
     *
     * @param {SessionData} data - The session data object.
     * @param {boolean} [force] - Optional flag indicating whether to force opening the bot.
     * @return {Result<void>} A Result object indicating the success or failure of opening the bot.
     */
    async openTgBotWithSessionData(data: SessionData, force?: boolean): Promise<Result<void>> {
        const session = await this.createSession(data)
        if (!session) {
            return new Result(void 0, new Error('cannot create new stavax session'))
        }

        return this.openTgBotWithSession(session, force)
    }

    /**
     * Opens the Telegram bot with the specified session and force options.
     *
     * @param {Session} session - The session object.
     * @param {boolean} [force] - Optional flag indicating whether to force opening the bot.
     * @return {Result<void>} A Result object indicating the success or failure of opening the bot.
     */
    openTgBotWithSession(session: Session, force?: boolean): Result<void> {
        if (force || (isTelegram() && (isTelegramMobile() || this.config.openTgBotOnDesktop))) {
            const result = this.getTgBotWebAppURL(session)
            if (result.error) {
                return new Result(void 0, result.error)
            }
            openTelegramLink(result.value)
        }

        return new Result(void 0)
    }

    /**
     * Retrieves the URL for the Telegram bot web app based on the provided session.
     *
     * @param {Session} session - The session object.
     * @return {Result<string>} A Result object containing the URL for the Telegram bot web app, or an error if the configuration is missing.
     */
    getTgBotWebAppURL(session: Session): Result<string> {
        const command = encodeURIComponent(`sid=${session.id}`);
        return new Result(`${this.config.tgBotWebAppURL}?startapp=${command}`)
    }

    log() {
        console.log(walletConnect)
        console.log(metaMask())
    }
}
