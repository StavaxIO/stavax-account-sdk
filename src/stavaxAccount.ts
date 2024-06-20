import axios, {AxiosInstance} from "axios";
import {Session, SessionData, StavaxAccountConfig} from "./types";
import {connect, getConnectors} from "@wagmi/core";

const productionAPI = 'https://account-api.stavax.io'

type ApiResponse<T> = {
    data: T
}

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

            async function onDisplayURI(payload: any) {
                if (payload.type != 'display_uri') {
                    return;
                }
                connectors[0].emitter.off('message', onDisplayURI)
                const session = await that.createSession({
                    uri: payload.data as string,
                }).catch(() => undefined)
                if (!session) {
                    reject(new Error("cannot create stavax account session"))
                    return
                }

                resolve(session)
            }

            connectors[0].emitter.on('message', onDisplayURI)
            connect(this.config.wagmiConfig, {
                connector: connectors[0]
            })
        })
    }

    async createSession(data?: SessionData): Promise<Session | undefined> {
        const res = await this.api.post<ApiResponse<Session>>(
            '/wallet-sessions/new', {
                project_id: this.config.projectID,
                data: data || {}
            },
        )
        return res.data.data
    }

    getTelegramBotURL(session: Session) {
        if (!this.config.tgBotWebAppURL) {
            return undefined
        }
        const command = encodeURIComponent(`sid=${session.id}`);
        return `${this.config.tgBotWebAppURL}?startapp=${command}`
    }
}
