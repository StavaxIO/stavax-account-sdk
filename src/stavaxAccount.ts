import axios, {AxiosInstance} from "axios";
import {Session, SessionData, StavaxAccountConfig, TgBotScreen} from "./types";
import {connect, getConnectors} from "@wagmi/core";
import {isTelegram, isTelegramMobile, openTelegramLink} from "./telegram";
import {Result} from "./result";

const productionAPI = 'https://account-api.stavax.io'

export class StavaxAccount {
    private readonly api: AxiosInstance;

    constructor(private config: StavaxAccountConfig) {
        if (!this.config.projectID) {
            throw new Error('invalid project config');
        }

        this.api = axios.create({
            baseURL: this.config.apiURL || productionAPI,
            timeout: this.config.requestTimeout || 60_000,
        });
    }

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

    async createSession(data?: SessionData): Promise<Session | undefined> {
        try {
            const res = await this.api.post<{ data: Session }>(
                '/wallet-sessions/new', {
                    project_id: this.config.projectID,
                    data: data || {}
                },
            )
            return res.data?.data
        } catch (err) {
            console.error(err)
            return undefined
        }
    }

    async openTgBot(force?: boolean): Promise<Result<void>> {
        return this.openTgBotScreen(TgBotScreen.home, force)
    }

    async openTgBotScreen(screen: TgBotScreen, force?: boolean): Promise<Result<void>> {
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

        const session = await this.createSession({href})
        if (!session) {
            return new Result(void 0, new Error('cannot create new stavax session'))
        }

        return this.openTgBotWithSession(session, force)
    }

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

    getTgBotWebAppURL(session: Session): Result<string> {
        if (!this.config.tgBotWebAppURL) {
            return new Result('', new Error('missing tgBotWebAppURL config'))
        }
        const command = encodeURIComponent(`sid=${session.id}`);
        return new Result(`${this.config.tgBotWebAppURL}?startapp=${command}`)
    }
}
