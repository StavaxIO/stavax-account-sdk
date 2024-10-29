import type {Config} from '@wagmi/core';

/**
 * Configuration options for StavaxAccount.
 *
 * @interface StavaxAccountConfig
 * @property {string} projectID - Stavax Account ProjectID. This is required.
 * @property {Config} wagmiConfig - Configuration object for Wagmi. This is required.
 * @property {string} [apiURL] - Optional. URL to override the default API URL.
 * @property {string} [tgBotWebAppURL] - Optional. URL to override the default Telegram bot web app URL.
 * @property {string} [webURL] - Optional. URL to override the default Stavax Account web URL.
 * @property {boolean} [disableAutoOpenTgBot=false] - Optional. Disables automatic opening of the Telegram bot. Default is `false`.
 * @property {boolean} [openTgBotOnDesktop=false] - Optional. Whether to open the Telegram bot on desktop. Default is `false`.
 * @property {number} [requestTimeout=60000] - Optional. Timeout for requests in milliseconds. Default is 60,000 ms (60 seconds).
 * @property {boolean} [enableSmartSession=false] - Optional. Enables the smart session. Default is `false`.
 * @property {boolean} [disableSmartSessionFailSafe=false] - Optional. Disables the smart session fail-safe logic. By default, the SDK will fall back to the Wagmi function if the Stavax API responds with an unsuccessful status. Default is `false`.
 * @property {boolean} [usingEmbeddedMode=false] - Optional. Open Embedded Stavax Account (iframe) instead of Stavax Account Bot
 */
export interface StavaxAccountConfig {
    projectID: string;
    wagmiConfig?: Config;
    apiURL?: string;
    tgBotWebAppURL?: string;
    webURL?: string;
    disableAutoOpenTgBot?: boolean;
    openTgBotOnDesktop?: boolean;
    requestTimeout?: number;
    enableSmartSession?: boolean;
    disableSmartSessionFailSafe?: boolean;
    usingEmbeddedMode?: boolean;
    usingInjectedMode?: boolean;
}

export interface SessionData {
    /**
     * WalletConnect uri to pair
     */
    uri?: string;
    /**
     * Path to target page
     */
    href?: string;
    /**
     * Show loading in bot while wait for event
     */
    openForInteract?: boolean;
}

export interface Session {
    id: string;
    project_id: string;
    data: SessionData;
}

export interface SmartSession {
    id: string;
}

export enum TgBotScreen {
    home = 'home',
    deposit = 'deposit',
    withdraw = 'withdraw'
}

export type SupportedPlatform = 'ethereum'

export interface PageMetadata {
    title: string,
    url: string,
    icon?: string | undefined | null,
}

export interface EthereumProviderRequest {
    account?: { chainId: number; address: string | null };
    method: string;
    params: any[];
}
