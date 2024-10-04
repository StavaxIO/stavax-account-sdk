import type {StavaxAccountConfig} from './types.js';

export class Drawer {
    private static _instance: Drawer;
    private isOpen: boolean = false;
    private iframeReady: boolean = false;
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

    public async openURL(url: string): Promise<void> {
        return new Promise((resolve, _) => {
            let iframe = this.drawerRoot.querySelector('iframe');
            if (!iframe) {
                iframe = this.htmlToElement(`<iframe class="stavax-iframe"></iframe>`) as HTMLIFrameElement;
                this.drawerRoot.appendChild(iframe);
            }
            iframe.src = url;

            this.changeOpen(true);

            if (this.iframeReady) {
                resolve();
                return;
            }

            const itv = setInterval(() => {
                if (this.iframeReady) {
                    clearInterval(itv);
                    resolve();
                }
            }, 100);
        });
    }

    public postMessage(message: any) {
        const iframe = this.drawerRoot.querySelector('iframe');
        iframe?.contentWindow?.postMessage(message, this.config.webURL!);
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
            case 'stv':
                if (method == 'app_ready') {
                    this.iframeReady = true;
                }
                break;
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
        style.textContent = `.stavax-drawer,.stavax-overlay{pointer-events:auto;position:fixed;right:0;bottom:0;left:0;z-index:50}[stavax-drawer]{touch-action:none;will-change:transform;transition:transform .5s cubic-bezier(.32, .72, 0, 1)}[stavax-drawer][stavax-drawer-direction=bottom]{transform:translate3d(0,100%,0)}[stavax-drawer][stavax-drawer-visible=true][stavax-drawer-direction=bottom]{transform:translate3d(0,var(--snap-point-height,0),0)}[stavax-overlay]{opacity:0;transition:opacity .5s cubic-bezier(.32, .72, 0, 1)}[stavax-overlay][stavax-drawer-visible=true],[stavax-overlay][stavax-snap-points-overlay=true]:not([stavax-drawer-visible=false]){opacity:1}[stavax-drawer]::after{content:'';position:absolute;background:inherit;background-color:inherit}[stavax-drawer][stavax-drawer-direction=bottom]::after{top:100%;bottom:initial;left:0;right:0;height:200%}[stavax-overlay][stavax-snap-points=true]:not([stavax-snap-points-overlay=true]):not([data-state=closed]){opacity:0}.stavax-drawer{overflow:hidden;background-color:#1f2937;border:none;margin-top:6rem;display:flex;flex-direction:column;height:auto}.stavax-overlay{top:0;background-color:rgba(0,0,0,.8)}.stavax-iframe{height:100dvh;border:0}`;
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
