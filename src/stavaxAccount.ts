import {walletConnect}                                                from '@wagmi/connectors';
import {
    connect,
    type ConnectReturnType,
    getAccount,
    getChainId,
    getConnectors,
    sendTransaction,
    type SendTransactionParameters,
    type SendTransactionReturnType,
    type WriteContractParameters,
}                                                                     from '@wagmi/core';
import {encodeFunctionData, type Hex, toHex}                          from 'viem';
import {Result}                                                       from './result.js';
import {isTelegram, isTelegramMobile, openTelegramLink}               from './telegram.js';
import type {Session, SessionData, SmartSession, StavaxAccountConfig} from './types.js';
import {TgBotScreen}                                                  from './types.js';
import {randomString}                                                 from './utils.js';

const productionAPI = 'https://account-api.stavax.io';
const productionBotURL = 'https://t.me/stavax_account_bot/app';
const productionWebURL = 'https://account.stavax.io';
const stavaxSDKDeviceIDKey = 'stavax-sdk-device-id';

export {walletConnect as walletConnectConnector};

function getSDKDeviceID(): string | undefined {
    if ('localStorage' in window) {
        let key = localStorage.getItem(stavaxSDKDeviceIDKey);
        if (key) {
            return key;
        }

        key = randomString(64);
        localStorage.setItem(stavaxSDKDeviceIDKey, key);
        return key;
    }

    return undefined;
}

class Drawer {
    private static _instance: Drawer;
    private isOpen: boolean = false;
    private readonly config: StavaxAccountConfig;
    private readonly drawerRoot: HTMLDivElement;
    private readonly drawerOverlay: HTMLDivElement;

    constructor(config: StavaxAccountConfig) {
        this.config = config;
        const {drawerRoot, drawerOverlay} = this.createRoot();
        this.drawerRoot = drawerRoot;
        this.drawerOverlay = drawerOverlay;

        window.addEventListener('message', this.onWindowMessage.bind(this));
    }

    public openURL(url: string) {
        let iframe = this.drawerRoot.querySelector('iframe');
        if (!iframe) {
            iframe = this.htmlToElement(`<iframe class="stavax-iframe"></iframe>`) as HTMLIFrameElement;
            this.drawerRoot.appendChild(iframe);
        }
        iframe.src = url;

        this.changeOpen(true);
    }

    public close() {
        this.changeOpen(false);
    }

    private changeOpen(state: boolean) {
        this.isOpen = state;
        this.drawerRoot.setAttribute('data-state', this.isOpen ? 'open' : 'closed');
        this.drawerOverlay.setAttribute('data-state', this.isOpen ? 'open' : 'closed');
        this.drawerOverlay.style.display = this.isOpen ? 'block' : 'none';

        this.drawerRoot.setAttribute('stavax-drawer-visible', this.isOpen ? 'true' : 'false');
        this.drawerOverlay.setAttribute('stavax-drawer-visible', this.isOpen ? 'true' : 'false');
    }

    private onWindowMessage(message: MessageEvent<{
        from: string,
        eventType?: string,
        method: string,
        params: any[]
    }>) {
        if (message.origin != this.config.webURL) {
            return;
        }
        let {data} = message;

        if (data.from != 'stavax_account') {
            return;
        }

        const i = data.method.indexOf('_');
        const scope = data.method.substring(0, i);
        const method = data.method.substring(i + 1);

        switch (scope) {
            case 'tgWebAppNavigation':
                // @ts-ignore
                return Telegram.WebApp[method](...data.params);
            case 'tgWebApp':
                if (method == 'close') {
                    this.close();
                }
        }
    }

    static instance(config: StavaxAccountConfig) {
        if (Drawer._instance) {
            return Drawer._instance;
        }

        return Drawer._instance = new Drawer(config);
    }

    private createRoot() {
        const shadowHost = document.createElement('div');
        const shadowRoot = shadowHost.attachShadow({mode: 'open'});
        const style = document.createElement('style');
        style.textContent = `.stavax-drawer,.stavax-overlay{pointer-events:auto;position:fixed;right:0;bottom:0;left:0;z-index:50}[stavax-drawer]{touch-action:none;will-change:transform;transition:transform .5s cubic-bezier(.32, .72, 0, 1)}[stavax-drawer][stavax-drawer-direction=bottom]{transform:translate3d(0,100%,0)}[stavax-drawer][stavax-drawer-visible=true][stavax-drawer-direction=bottom]{transform:translate3d(0,var(--snap-point-height,0),0)}[stavax-overlay]{opacity:0;transition:opacity .5s cubic-bezier(.32, .72, 0, 1)}[stavax-overlay][stavax-drawer-visible=true],[stavax-overlay][stavax-snap-points-overlay=true]:not([stavax-drawer-visible=false]){opacity:1}[stavax-drawer]::after{content:'';position:absolute;background:inherit;background-color:inherit}[stavax-drawer][stavax-drawer-direction=bottom]::after{top:100%;bottom:initial;left:0;right:0;height:200%}[stavax-overlay][stavax-snap-points=true]:not([stavax-snap-points-overlay=true]):not([data-state=closed]){opacity:0}.stavax-drawer{overflow:hidden;background-color:#1f2937;border:none;margin-top:6rem;display:flex;flex-direction:column;height:auto;border-top-left-radius:10px;border-top-right-radius:10px}.stavax-overlay{top:0;background-color:rgba(0,0,0,.8)}.stavax-iframe{height:100dvh}`;
        const drawerOverlay = this.htmlToElement(`<div class="stavax-overlay" data-state="closed" stavax-drawer-visible="false" stavax-overlay stavax-snap-points="false" stavax-snap-points-overlay="true" data-aria-hidden="true" aria-hidden="true"></div>`) as HTMLDivElement;
        const drawerRoot = this.htmlToElement(`<div class="stavax-drawer" data-state="closed" stavax-drawer stavax-drawer-direction="bottom" stavax-drawer-visible="false" tabindex="-1"></div>`) as HTMLDivElement;
        shadowRoot.appendChild(style);
        shadowRoot.appendChild(drawerOverlay);
        shadowRoot.appendChild(drawerRoot);
        document.body.appendChild(shadowHost);
        return {
            drawerOverlay,
            drawerRoot,
            shadowRoot,
            shadowHost,
        };
    }

    private htmlToElement(html: string) {
        let template = document.createElement('template');
        html = html.trim(); // Never return a text node of whitespace as the result
        template.innerHTML = html;
        return template.content.firstChild;
    }
}

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
            this.config.apiURL = productionAPI;
        }

        if (!this.config.tgBotWebAppURL) {
            this.config.tgBotWebAppURL = productionBotURL;
        }

        if (!this.config.webURL) {
            this.config.webURL = productionWebURL;
        }

        if (!this.config.requestTimeout) {
            this.config.requestTimeout = 60_000;
        }
    }

    /**
     * Connects to the Stavax account with the provided configuration,
     * resolves with a session object if successful,
     * or undefined if the connection fails.
     *
     * @param {string} uri - Optional wallet connect URI
     *
     * @return {Promise<Session | undefined>} Promise that resolves with a session object or undefined.
     */
    async connect(uri?: string): Promise<Session | undefined> {
        if (uri) {
            const session = await this.createSession({uri});
            if (!session) {
                throw new Error('cannot create stavax account session');
            }

            if (!this.config.disableAutoOpenTgBot) {
                const result = this.openTgBotWithSession(session);
                if (result.error) {
                    throw result.error;
                }
            }
            return session;
        }

        return this._startConnect();
    }

    /**
     * Connects to the Stavax account with the provided configuration,
     * resolves with wagmi connect data if successful,
     * @param handleStavaxSession - Optional callback to handle the Stavax session object
     */
    async wagmiConnect(handleStavaxSession?: (session: Session) => void): Promise<ConnectReturnType> {
        return new Promise(async (resolve, reject) => {
            try {
                const session = await this._startConnect(data => resolve(data), err => reject(err));
                handleStavaxSession?.(session!);
            } catch (err) {
                reject(err);
            }
        });
    }

    async sendTransaction(parameters: SendTransactionParameters): Promise<SendTransactionReturnType | undefined> {
        if (this.config.enableSmartSession) {
            const smartSession = await this.findSmartSession(parameters);
            if (smartSession) {
                const txHash = await this.sendSmartSessionTransaction(smartSession.id, parameters);
                if (txHash || this.config.disableSmartSessionFailSafe) {
                    return txHash;
                }
            }
        }

        if (!this.config.disableAutoOpenTgBot) {
            this.openTgBotForInteract().then(() => console.log(`openTgBotForInteract`));
        }

        return sendTransaction(this.config.wagmiConfig, parameters);
    }

    async writeContract(parameters: WriteContractParameters): Promise<SendTransactionReturnType | undefined> {
        const {abi, address, args, dataSuffix, functionName, ...request} = parameters;
        const data = encodeFunctionData({
            abi,
            args,
            functionName,
        });

        return this.sendTransaction({
            to  : address,
            data: `${data}${dataSuffix ? dataSuffix.replace('0x', '') : ''}`,
            ...request,
        });
    }

    private async _startConnect(onSuccess?: (data: ConnectReturnType) => void, onError?: (err: any) => void): Promise<Session | undefined> {
        const that = this;
        return new Promise((resolve, reject) => {
            const connectors = getConnectors(this.config.wagmiConfig);

            const walletConnectConnector = connectors.find(c => c.id === 'walletConnect');
            if (!walletConnectConnector) {
                reject(new Error('missing walletConnect connector'));
                return;
            }

            async function onDisplayURI(payload: any) {
                if (payload.type != 'display_uri') {
                    return;
                }
                walletConnectConnector?.emitter.off('message', onDisplayURI);
                const uri = payload.data as string;
                if (!uri) {
                    reject(new Error('cannot get wallet connect URI'));
                    return;
                }
                that.connect(uri).then(resolve).catch(reject);
            }

            walletConnectConnector.emitter.on('message', onDisplayURI);
            connect(this.config.wagmiConfig, {
                connector: walletConnectConnector,
            }).then(data => {
                onSuccess?.(data);
            }).catch(err => {
                console.error(err);
                onError?.(err);
            });
        });
    }

    /**
     * Asynchronously creates a session.
     *
     * @param {SessionData} data - Optional data for the session.
     * @return {Promise<Session | undefined>} A promise that resolves with the created session or undefined.
     */
    private async createSession(data?: SessionData): Promise<Session | undefined> {
        try {
            const res = await this._fetch('/wallet-sessions/new', {
                    method: 'POST',
                    body  : JSON.stringify({
                        project_id: this.config.projectID,
                        data      : data || {},
                    }),
                },
            );
            if (!res.ok) {
                console.error('failed to create new stavax session');
                return undefined;
            }
            const json = await res.json();
            return json.data;
        } catch (err) {
            console.error(err);
            return undefined;
        }
    }

    private async findSmartSession(parameters: SendTransactionParameters): Promise<SmartSession | undefined> {
        try {
            const res = await this._fetch('/sdk-api/smart-wallets/sessions/find-session', {
                    method: 'POST',
                    body  : JSON.stringify({
                        sender_address: parameters.account || getAccount(this.config.wagmiConfig).address,
                        chain_id      : parameters.chainId || getChainId(this.config.wagmiConfig),
                        to            : parameters.to,
                        value         : toHex(parameters.value || 0n),
                        data          : parameters.data,
                    }),
                },
            );
            if (!res.ok) {
                console.error('cannot find smart session');
                return undefined;
            }
            const json = await res.json();
            return json.data;
        } catch (err) {
            console.error(err);
            return undefined;
        }
    }

    private async sendSmartSessionTransaction(smartSessionID: string, parameters: SendTransactionParameters): Promise<Hex | undefined> {
        try {
            const res = await this._fetch('/sdk-api/smart-wallets/sessions/send-transaction', {
                    method: 'POST',
                    body  : JSON.stringify({
                        smart_session_id: smartSessionID,
                        sender_address  : parameters.account || getAccount(this.config.wagmiConfig).address,
                        chain_id        : parameters.chainId || getChainId(this.config.wagmiConfig),
                        to              : parameters.to,
                        value           : toHex(parameters.value || 0n),
                        data            : parameters.data,
                    }),
                },
            );
            if (!res.ok) {
                console.error('cannot send smart session');
                return undefined;
            }
            const json = await res.json();
            return json.data?.tx_hash;
        } catch (err) {
            console.error(err);
            return undefined;
        }
    }

    private async _fetch(path: string, options?: RequestInit): Promise<Response> {
        return fetch(this.config.apiURL + path, {
                mode   : 'cors',
                headers: {
                    'X-Project-ID'   : this.config.projectID,
                    'X-SDK-Device-ID': getSDKDeviceID()!,
                },
                ...(options || {}),
            },
        );
    }

    /**
     * Asynchronously opens the Telegram bot
     *
     * @param {boolean} [force] - Optional flag indicating whether to force opening the screen.
     * @return {Promise<Result<void>>} A promise that resolves with a Result object indicating the success or failure of the operation.
     */
    async openTgBot(force?: boolean): Promise<Result<void>> {
        return this.openTgBotScreen(TgBotScreen.home, force);
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
            return this.openTgBotForInteract(force);
        }, delayMs);

        return () => clearTimeout(tid);
    }

    /**
     * Asynchronously opens the Telegram bot for interact
     *
     * @param {boolean} [force] - Optional flag indicating whether to force opening the screen.
     * @return {Promise<Result<void>>} A promise that resolves with a Result object indicating the success or failure of the operation.
     */
    async openTgBotForInteract(force?: boolean): Promise<Result<void>> {
        return this.openTgBotScreen(TgBotScreen.home, force, {
            openForInteract: true,
        });
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
        let href: string = '';
        switch (screen) {
            case TgBotScreen.home:
                href = '/';
                break;
            case TgBotScreen.deposit:
                href = '/currency/qr-code';
                break;
            case TgBotScreen.withdraw:
                href = '/withdraw';
                break;
            default:
                return new Result(void 0, new Error('invalid TgBotScreen'));
        }

        return this.openTgBotWithSessionData({
            ...(extraData || {}),
            href,
        }, force);
    }

    /**
     * Opens the Telegram bot with the specified session data and force options.
     *
     * @param {SessionData} data - The session data object.
     * @param {boolean} [force] - Optional flag indicating whether to force opening the bot.
     * @return {Result<void>} A Result object indicating the success or failure of opening the bot.
     */
    async openTgBotWithSessionData(data: SessionData, force?: boolean): Promise<Result<void>> {
        const session = await this.createSession(data);
        if (!session) {
            return new Result(void 0, new Error('cannot create new stavax session'));
        }

        return this.openTgBotWithSession(session, force);
    }

    /**
     * Opens the Telegram bot with the specified session and force options.
     *
     * @param {Session} session - The session object.
     * @param {boolean} [force] - Optional flag indicating whether to force opening the bot.
     * @return {Result<void>} A Result object indicating the success or failure of opening the bot.
     */
    openTgBotWithSession(session: Session, force?: boolean): Result<void> {
        console.log('isTelegram() && this.config.usingEmbeddedMode', isTelegram() && this.config.usingEmbeddedMode);
        if (isTelegram() && this.config.usingEmbeddedMode) {
            Drawer.instance(this.config).openURL(this.getIframeURL(session, Telegram.WebApp.initData));
            return new Result(void 0);
        }

        if (force || (isTelegram() && (isTelegramMobile() || this.config.openTgBotOnDesktop))) {
            const result = this.getTgBotWebAppURL(session);
            if (result.error) {
                return new Result(void 0, result.error);
            }
            openTelegramLink(result.value);
        }

        return new Result(void 0);
    }

    private getIframeURL(session: Session, initData: string): string {
        let url = this.config.webURL;
        if (session.data.uri || (session.data.href && session.data.href != '/')) {
            url += `?tgWebAppStartParam=${encodeURIComponent(`sid=${session.id}`)}`;
        }
        return `${url}#tgWebAppData=${encodeURIComponent(initData)}&tgWebAppVersion=6.0&tgWebAppPlatform=stv_iframe`;
    }

    /**
     * Retrieves the URL for the Telegram bot web app based on the provided session.
     *
     * @param {Session} session - The session object.
     * @return {Result<string>} A Result object containing the URL for the Telegram bot web app, or an error if the configuration is missing.
     */
    getTgBotWebAppURL(session: Session): Result<string> {
        const command = encodeURIComponent(`sid=${session.id}`);
        return new Result(`${this.config.tgBotWebAppURL}?startapp=${command}`);
    }
}
