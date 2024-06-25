import {Config} from "@wagmi/core/src/createConfig";

export interface StavaxAccountConfig {
    projectID: string
    apiURL?: string
    tgBotWebAppURL?: string
    disableAutoOpenTgBot?: boolean
    openTgBotOnDesktop?: boolean
    requestTimeout?: number
    wagmiConfig: Config
}

export interface SessionData {
    /**
     * WalletConnect uri to pair
     */
    uri?: string
    /**
     * Path to target page
     */
    href?: string
}

export interface Session {
    id: string
    data: SessionData
}

export enum TgBotScreen {
    home = 'home',
    deposit = 'deposit',
    withdraw = 'withdraw'
}
