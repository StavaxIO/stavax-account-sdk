# Stavax Account SDK

```
yarn add @stavaxio/account-sdk 
```

## Prerequisites

**Important:** You need to create Stavax Account project to use this SDK.

## Usage

Stavax Account SDK depends on `wagmi` and `walletConnect`.

### Create a Stavax Account instance

```ts
import {createConfig, http} from "@wagmi/core"
import {avalanche, avalancheFuji} from "@wagmi/core/chains"
import {StavaxAccount, walletConnectConnector} from "@stavaxio/account-sdk"

const stavaxAccount = new StavaxAccount({
    projectID: 'your-project-id',
    wagmiConfig: createConfig({
        chains: [avalanche, avalancheFuji],
        connectors: [
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
            [avalanche.id]: http(),
            [avalancheFuji.id]: http(),
        },
    })
})
```

### Trigger connect

```ts
const session = await stavaxAccount.connect()
```

By default, Stavax Account SDK will open Stavax Bot on Telegram Mobile.

You can change this behavior by setting `disableAutoOpenTgBot` and `openTgBotOnDesktop` in the config object.

#### Using wallet connect URI

If you want to use a WalletConnect URI to connect to Stavax, you can pass the wallet connect URI to the `connect`
method.

```ts
const session = await stavaxAccount.connect('wc:12345678')
```

#### Retrieving connect result from wagmi

If you want to retrieve connect result from wagmi, you can use `wagmiConnect` method.

```ts
const connectResult = await stavaxAccount.wagmiConnect() // wagmi ConnectReturnType
```

Visit [wagmi](https://wagmi.sh) document for more details.

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

Read more about [Pre-authorized Transaction](https://docs.stavax.io/product/stavax-account/pre-authorized-transaction)

### Stavax Bot Interaction

```ts
// Open Bot home page
stavaxAccount.openTgBot()
// Open Bot home page with loading indicator to wait for event
stavaxAccount.openTgBotForInteract()
// Open Bot home page with delay. Returned function can be used to dicard the open
const cancelFunc = stavaxAccount.openTgBotForInteractWithDelay(500)
// Open deposit page
stavaxAccount.openTgBotScreen(TgBotScreen.deposit)
// Open bot with session, useful when need open bot manually when connect
stavaxAccount.openTgBotWithSession(session)
```

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
 */
interface StavaxAccountConfig {
    projectID: string
    wagmiConfig: Config
    apiURL?: string
    tgBotWebAppURL?: string
    disableAutoOpenTgBot?: boolean
    openTgBotOnDesktop?: boolean
    requestTimeout?: number
    enableSmartSession?: boolean
    disableSmartSessionFailSafe?: boolean
}
```


