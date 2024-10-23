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
npm i @stavaxio/account-sdk
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
import {createConfig, http, injected} from "@wagmi/core"
import {sei, seiTestnet} from "@wagmi/core/chains"
import {walletConnectConnector} from "@stavaxio/account-sdk"

export const wagmiConfig = createConfig({
    chains: [sei, seiTestnet],
    connectors: [
        injected(),
        walletConnectConnector({
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

In addition to the Stavax Account SDK, you'll likely want to initialize the Wagmi provider in your application using the same wagmiConfig:

```tsx
// App.tsx
import {WagmiProvider} from 'wagmi';
import {wagmiConfig} from './wagmiConfig';

function App() {
    return (
        <WagmiProvider config={wagmiConfig}>
            {/* Rest of your app components */}
        </WagmiProvider>
    );
}

export default App;

```

## Connect Stavax Account

### Use Stavax Account as injected provider (beta)

Stavax Account can be configured as injected provider

```ts
import {StavaxAccount} from "@stavaxio/account-sdk"
import {setupStavaxProvider} from '@stavaxio/account-sdk/adapter/evm'

const stavaxAccount = new StavaxAccount({
    projectID: 'your-project-id',
    wagmiConfig: wagmiConfig, // wagmiConfig with injected() connectors
})
setupStavaxProvider(stavaxAccount)
```

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

### Send Transaction

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

### Stavax Bot Interaction

| Method                                 | Description                                                                                             |
|----------------------------------------|:--------------------------------------------------------------------------------------------------------|
| `openTgBot()`                          | Opens the bot’s home page.                                                                              |
| `openTgBotForInteract()`               | Opens the bot with an interaction loading indicator.                                                    |
| `openTgBotForInteractWithDelay(ms)`    | Opens the bot after a specified delay (in ms); returns a function to cancel the delayed open if needed. |
| `openTgBotScreen(screen: TgBotScreen)` | Opens a specific bot screen (e.g., deposit, withdrawal) based on `TgBotScreen` enum.                    |
| `openTgBotWithSession(session)`        | Opens the bot with the active Stavax session, ensuring state continuity..                               |

### Config

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
}
```


