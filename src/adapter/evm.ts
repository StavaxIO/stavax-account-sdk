import type {StavaxAccount} from '../stavaxAccount.js';

declare global {
    interface Window {
        ethereum: EthereumProvider | undefined;
    }
}

type CustomProviderFn = (data: any, chain: number, address?: string | null) => Promise<any>

const storagePrefix = 'stavaxEthereumProvider_';
const addressKey = `${storagePrefix}evmAddress`;
const chainIDKey = `${storagePrefix}chainId`;

export const ProviderRDNS = 'io.stavax.account';
export const ProviderUUID = '307a159f-66fd-425b-8f46-659836a9250c';

export class EthereumProvider {
    private static instance: EthereumProvider | undefined;

    private readonly _events = new Map<string, Set<any>>();
    private readonly stavaxAccount: StavaxAccount;
    private readonly customProviderFn?: CustomProviderFn;

    private constructor(stavaxAccount: StavaxAccount, customProvider?: CustomProviderFn) {
        this.stavaxAccount = stavaxAccount;
        this.customProviderFn = customProvider;
    }

    static getInstance(stavaxAccount: StavaxAccount, customProvider?: CustomProviderFn): EthereumProvider {
        return EthereumProvider.instance || (EthereumProvider.instance = new EthereumProvider(stavaxAccount, customProvider));
    }

    on(event: string, cb: any) {
        const set = this._events.get(event);
        if (!set) this._events.set(event, new Set([cb]));
        else set.add(cb);
    }

    removeListener(event: string, cb: any) {
        const set = this._events.get(event);
        set?.delete(cb);
    }

    isConnected() {
        return this.stavaxAccount.isInjected || !!this.address;
    }

    get isStavax() {
        return true;
    }

    get account() {
        return {address: this.address, chainId: this.chainId};
    }

    get address(): string | null {
        return localStorage.getItem(`${storagePrefix}evmAddress`) || null;
    }

    set address(address: string | null) {
        if (address == null) {
            localStorage.removeItem(addressKey);
            this._events.get('accountsChanged')?.forEach((cb) => cb([]));
            this._events.get('disconnect')?.forEach((cb) => cb());
            return;
        }

        if (this.address == null) {
            this._events.get('connect')?.forEach((cb) => cb({chainId: `0x${this.chainId.toString(16)}`}));
        }

        localStorage.setItem(addressKey, address);
        this._events.get('accountsChanged')?.forEach((cb) => cb([address]));
    }

    set chainId(chain: number | string) {
        const chainId = typeof chain === 'string' ? parseInt(chain, 16) : chain;
        localStorage.setItem(chainIDKey, chainId.toString());
        this._events.get('chainChanged')?.forEach((cb) => cb(`0x${chainId.toString(16)}`));
    }

    get chainId(): number {
        return parseInt(localStorage.getItem(chainIDKey) || '1');
    }

    async request(data: any): Promise<any> {
        if (this.stavaxAccount.isInjected) return this.stavaxAccount.request('ethereum', data);

        switch (data.method) {
            case 'wallet_revokePermissions':
                this.address = null;
                return null;

            case 'wallet_requestPermissions':
                throw 'Unsupported method: wallet_requestPermissions';

            case 'eth_accounts':
                return this.address ? [this.address] : [];

            case 'eth_requestAccounts': {
                const acc = await this.stavaxAccount.request('ethereum', {...data, account: this.account});
                this.address = acc[0];
                return acc;
            }

            case 'eth_chainId':
                return '0x' + this.chainId.toString(16);

            case 'wallet_switchEthereumChain': {
                this.chainId = parseInt(data.params[0]?.chainId || data.params[0], 16);
                return null;
            }

            case 'personal_sign':
            case 'eth_sendTransaction':
            case 'eth_signTransaction':
            case 'eth_signTypedData':
            case 'eth_signTypedData_v3':
            case 'eth_signTypedData_v4':
                return this.stavaxAccount.request('ethereum', {...data, account: this.account});

            default:
                if (!this.customProviderFn) {
                    throw `Method not implemented ${data} for chain ${this.chainId}`;
                }
                return this.customProviderFn(data, this.chainId, this.address);
        }
    }
}

function announceProvider(stavaxAccount: StavaxAccount, customProvider?: CustomProviderFn): EthereumProvider | undefined {
    if (typeof window === 'undefined') return;
    if (!stavaxAccount.isInjected) {
        return;
    }

    if (!window.ethereum || !window.ethereum.isStavax) {
        window.ethereum = EthereumProvider.getInstance(stavaxAccount, customProvider);
    }

    window?.dispatchEvent(
        new CustomEvent('eip6963:announceProvider', {
            detail: Object.freeze({
                provider: window.ethereum,
                info    : {
                    name: 'Stavax Account',
                    icon: 'data:image/png;base64,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',
                    rdns: ProviderRDNS,
                    uuid: ProviderUUID,
                },
            }),
        }),
    );
    return window.ethereum;
}

export function setupEthereumProvider(stavaxAccount: StavaxAccount, customProvider?: CustomProviderFn): EthereumProvider | undefined {
    window?.addEventListener('eip6963:requestProvider', () => announceProvider(stavaxAccount, customProvider));
    return announceProvider(stavaxAccount, customProvider);
}
