import type {Config} from "@wagmi/core";

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
    /**
     * Show loading in bot while wait for event
     */
    openForInteract?: boolean
}

export interface Session {
    id: string
    data: SessionData
}

export interface SmartSession {
    id: string
}

export enum TgBotScreen {
    home = 'home',
    deposit = 'deposit',
    withdraw = 'withdraw'
}
