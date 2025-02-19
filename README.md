# Stavax Account SDK

## Prerequisites

- Familiarity with [Wagmi](https://wagmi.sh): The Stavax Account SDK serves as a bridge between dApps and Stavax Account using the `walletConnect`
  connector from Wagmi.
  Your dApp will still use Wagmi for core actions, including checking connection status, sending on-chain transactions, and interacting with
  contracts.

- Setting Up Telegram Mini Apps: Ensure your Telegram Mini App is configured with
  the [Telegram Web App script](https://core.telegram.org/bots/webapps#initializing-mini-apps) `telegram-web-app.js` to support open Stavax Account
  Bot from your mini app.

- **Important:** You need to create Stavax Account project to use this SDK.

## Installation

```
npm i @stavaxio/account-sdk @wagmi/core @wagmi/connectors viem
```

### Setup for Nuxt

Currently, StavaxAccount only works with Nuxt Client only code. To use it in SSR mode, please add `@stavaxio/account-sdk` to the `build.transpile`
section in nuxt config file.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
    // other settings
    build: {
        transpile: [
            //other deps
            '@stavaxio/account-sdk',
        ],
    },
});
```

## Configure

Stavax Account SDK depends on `wagmi` and `walletConnect`.

### Create a wagmiConfig File

To integrate Stavax Account with your dApp, you'll need a wagmiConfig instance that can be shared between Stavax Account and the Wagmi Provider.

```ts
// wagmiConfig.ts
import {createConfig, http} from "@wagmi/core"
import {sei, seiTestnet} from "@wagmi/core/chains"
import {walletConnect} from "@wagmi/connectors"

export const wagmiConfig = createConfig({
    chains: [sei, seiTestnet],
    connectors: [
        walletConnect({
            projectId: 'your-wallet-connect-project-id',
            showQrModal: false,
            metadata: {
                name: 'Demo',
                description: 'Demo description',
                url: 'https://demo.com',
                icons: ['https://avatars.githubusercontent.com/u/37784886']
            }
        })
    ],
    transports: {
        [sei.id]: http(),
        [seiTestnet.id]: http(),
    },
})
```

### Using the `wagmiConfig` Instance with Stavax Account

You can now use this wagmiConfig instance to create a StavaxAccount instance in your application:

```ts
import {StavaxAccount} from "@stavaxio/account-sdk"
import {wagmiConfig} from "./wagmiConfig"

const stavaxAccount = new StavaxAccount({
    projectID: 'your-stavax-project-id',
    wagmiConfig: wagmiConfig
})
```

### Using `wagmiConfig` with Wagmi Provider

In addition to the Stavax Account SDK, you'll likely want to initialize the Wagmi provider in your application using the
**same wagmiConfig instance**:

#### React

```tsx
// App.tsx
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {WagmiProvider} from 'wagmi';
import {wagmiConfig} from './wagmiConfig';

const queryClient = new QueryClient()

function App() {
    return (
        <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                {/* Rest of your app components */}
            </QueryClientProvider>
        </WagmiProvider>
    );
}

export default App;
```

#### Nuxt

```ts
// plugins/wagmi.ts
import {QueryClient, VueQueryPlugin} from '@tanstack/vue-query';
import {walletConnect} from '@wagmi/connectors';
import {WagmiPlugin} from '@wagmi/vue';
import {wagmiConfig} from '../wagmiConfig';

export default defineNuxtPlugin((app) => {
    app.vueApp
        .use(WagmiPlugin, {config: wagmiConfig})
        .use(VueQueryPlugin, {queryClient: new QueryClient()});
});
```

## Connect Stavax Account

### Use Stavax Account on top of Wallet Connect

#### Basic Connect

The simplest way to trigger a connection is by calling the connect method, which will automatically open the Stavax Bot on Telegram Mobile by default:

```ts
const session = await stavaxAccount.connect()
```

The session object returned here is a Stavax Session, which you can use for further interactions, such as manually opening the Telegram bot or
retrieving the WalletConnect URI.

To control the bot's automatic opening behavior, you can adjust these settings in your StavaxAccount configuration:

- `disableAutoOpenTgBot`: Set to true to disable the SDK's default behavior of opening the Telegram bot on connect.
- `openTgBotOnDesktop`: Set to true if you prefer the bot to open on desktop rather than mobile.

Example

```ts
const stavaxAccount = new StavaxAccount({
    projectID: 'your-project-id',
    wagmiConfig: wagmiConfig,
    disableAutoOpenTgBot: true, // Disables automatic bot opening
    openTgBotOnDesktop: true,    // Opens bot on desktop if needed
});
```

#### Connect Using wallet connect URI

You can also initiate the connection directly using a WalletConnect URI if you want additional control:

```ts
const session = await stavaxAccount.connect('wc:12345678')
```

#### Retrieving connect result from wagmi

To directly obtain the connect result from Wagmi, you can use `.wagmiConnect()`:

```ts
const connectResult = await stavaxAccount.wagmiConnect() // wagmi ConnectReturnType
```

## Send Transaction

Stavax Account SDK provides two methods built on top of wagmi functions for sending on-chain transactions.

```ts
stavaxAccount.sendTransaction({...})
stavaxAccount.writeContract({...})
```

Two methods have same signature as wagmi functions. When using these methods, Stavax Account SDK will automatically
open Stavax Bot unless the `disableAutoOpenTgBot` and `openTgBotOnDesktop` configurations are set.

### Pre-authorized Transaction

In order to use Pre-authorized, you need to set `enableSmartSession` to `true` in the config object.

```ts
const stavaxAccount = new StavaxAccount({
    enableSmartSession: true,
    // other config options
})
```

When enabled, if a user has a Pre-authorized Transaction for the incoming transaction, SDK will
automatically execute
the transaction without requiring user confirmation. Otherwise, Stavax Account Bot will open to obtain confirmation from
user.

The SDK has built-in error handling for transaction failures:

- `disableSmartSessionFailSafe`: By default, the SDK will fall back to Wagmi's transaction function if the Stavax API returns an error. Set this to
  true if you want to disable the fail-safe mechanism.

Read more about [Pre-authorized Transaction](https://docs.stavax.io/product/stavax-account/pre-authorized-transaction)

## Stavax Bot Interaction

| Method                                 | Description                                                                                             |
|----------------------------------------|:--------------------------------------------------------------------------------------------------------|
| `openTgBot()`                          | Opens the bot’s home page.                                                                              |
| `openTgBotForInteract()`               | Opens the bot with an interaction loading indicator.                                                    |
| `openTgBotForInteractWithDelay(ms)`    | Opens the bot after a specified delay (in ms); returns a function to cancel the delayed open if needed. |
| `openTgBotScreen(screen: TgBotScreen)` | Opens a specific bot screen (e.g., deposit, withdrawal) based on `TgBotScreen` enum.                    |
| `openTgBotWithSession(session)`        | Opens the bot with the active Stavax session, ensuring state continuity..                               |

## Config

```ts
import {Config} from "@wagmi/core/src/createConfig";

/**
 * Configuration options for StavaxAccount.
 *
 * @interface StavaxAccountConfig
 * @property {string} projectID - Stavax Account ProjectID. This is required.
 * @property {Config} wagmiConfig - Configuration object for Wagmi. This is required.
 * @property {string} [apiURL] - Optional. URL to override the default API URL.
 * @property {string} [tgBotWebAppURL] - Optional. URL to override the default Telegram bot web app URL.
 * @property {boolean} [disableAutoOpenTgBot=false] - Optional. Disables automatic opening of the Telegram bot. Default is `false`.
 * @property {boolean} [openTgBotOnDesktop=false] - Optional. Whether to open the Telegram bot on desktop. Default is `false`.
 * @property {number} [requestTimeout=60000] - Optional. Timeout for requests in milliseconds. Default is 60,000 ms (60 seconds).
 * @property {boolean} [enableSmartSession=false] - Optional. Enables the smart session. Default is `false`.
 * @property {boolean} [disableSmartSessionFailSafe=false] - Optional. Disables the smart session fail-safe logic. By default, the SDK will fall back to the Wagmi function if the Stavax API responds with an unsuccessful status. Default is `false`.
 * @property {boolean} [usingEmbeddedMode=false] - Optional. Open Embedded Stavax Account (iframe) instead of Stavax Account Bot
 * @property {boolean} [usingInjectedMode=false] - Optional. Using Stavax Account Injected provider.
 */
interface StavaxAccountConfig {
    projectID: string;
    wagmiConfig: Config;
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
```

## Use Stavax Account as injected provider

Stavax Account includes an in-app browser that can open a DApp directly within Stavax Account.

The Stavax Injected provider can be used to connect a DApp running inside the Stavax Browser to the Stavax Account Wallet.

### Method 1: Use Stavax Injected provider only

```ts
import {StavaxAccount} from "@stavaxio/account-sdk"

StavaxAccount.initInjectedProvider({projectID: 'your-project-id'});
```

Make sure to call `StavaxAccount.initInjectedProvider` as soon as possible, since some libraries, like Wagmi,
only detect injected providers when the config object is created.

### Method 2: Use with StavaxAccount wallet connect

In this mode, you must register the Stavax Injected Provider before create the wagmi config.

```ts
import {StavaxAccount} from "@stavaxio/account-sdk"
import {setupEthereumProvider} from "@stavaxio/account-sdk/adapter/evm";
import {createConfig} from "@wagmi/core"

// Step 1: Create a Stavax Account instance
export const stavaxAccount = new StavaxAccount({projectID: 'your-project-id'})
// Step 2: Register the Stavax Injected provider
stavaxAccount.initInjectedProvider();
// Step 3: Create the wagmi config
export const wagmiConfig = createConfig({
    // ...
})
// Step 4: Assign the Wagmi config to Stavax
stavaxAccount.setWagmiConfig(wagmiConfig)

// Step 5: Use the Wagmi config as with a normal setup
// ...
```

When your app runs inside the Stavax Browser, you will see the Stavax Injected connector with id `io.stavax.account`

### Test your injected provider setup

Open Stavax Account Mini App via this URL: https://t.me/stavax_account_bot/browser_test

On the opened page, enter your URL and click **Go** to open in Stavax Browser.
