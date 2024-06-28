# Stavax Account SDK

```
yarn add @stavaxio/account-sdk 
```

## Prerequisites

You need to create Stavax Account project to use this SDK.

## Usage

Stavax Account SDK depends on `wagmi` and `walletConnect`.

### Create a Stavax Account instance

```ts
import { createConfig, http } from "@wagmi/core"
import { avalanche, avalancheFuji } from "@wagmi/core/chains"
import { walletConnect } from "@wagmi/connectors"
import { StavaxAccount } from "@stavaxio/account-sdk"

const stavaxAccount = new StavaxAccount({
    projectID: 'your-project-id',
    wagmiConfig: createConfig({
        chains: [avalanche, avalancheFuji],
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

Visit [wagmi](https://wagmi.sh) document for more details.

### Stavax Bot Interaction

```ts
// Open Bot home page
stavaxAccount.openTgBot()
// Open deposit page
stavaxAccount.openTgBotScreen(TgBotScreen.deposit)
// Open bot with session, useful when need open bot manually when connect
stavaxAccount.openTgBotWithSession(session)
```

### Config

```ts
import {Config} from "@wagmi/core/src/createConfig";

interface StavaxAccountConfig {
    projectID: string // Stavax Account ProjectID. Required.
    apiURL?: string // Override apiURL
    tgBotWebAppURL?: string // Override tgBotWebAppURL
    disableAutoOpenTgBot?: boolean // default false
    openTgBotOnDesktop?: boolean // default false
    requestTimeout?: number // Override requestTimeout, default 60s
    wagmiConfig: Config // Wagmi config. Required.
}
```


