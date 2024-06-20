import {Config} from "@wagmi/core/src/createConfig";

export interface StavaxAccountConfig {
    projectID: string
    apiURL?: string
    tgBotWebAppURL?: string
    requestTimeout?: number
    wagmiConfig: Config
}

export interface SessionData {
    uri?: string
}

export interface Session {
    id: string
    data: SessionData
}
