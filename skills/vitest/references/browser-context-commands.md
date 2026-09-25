---
name: browser-context-commands
description: Browser Mode の Context API（page・server・cdp・utils）と Commands API（組込・カスタム）を説明します。
---

# Context と Commands

`vitest/browser` のコンテキストモジュールは、テスト内で使う小規模ユーティリティー群です。`userEvent`・`commands`・`page` の詳細は各専用リファレンスも参照してください。

## page

現在のページと対話するユーティリティーです。サーバー側の Playwright `page` そのものではない点に注意してください（サーバー資源が必要なら Commands 経由にします）。

```ts
export const page: {
  viewport(width: number, height: number): Promise<void>
  screenshot(options?: ScreenshotOptions): Promise<string>
  mark(name: string, options?: { stack?: string }): Promise<void>
  mark<T>(name: string, body: () => T | Promise<T>, options?: { stack?: string }): Promise<T>
  extend(methods: Partial<BrowserPage>): BrowserPage
  elementLocator(element: Element): Locator
  frameLocator(iframeElement: Locator): FrameLocator
  getByRole(...): Locator
  getByLabelText(...): Locator
  getByTestId(...): Locator
  getByAltText(...): Locator
  getByPlaceholder(...): Locator
  getByText(...): Locator
  getByTitle(...): Locator
}
```

- `viewport`: iframe のサイズ変更です。設定の `browser.viewport` が既定値になります。
- `screenshot`: テスト iframe または要素の撮影です。`save: false` 時は常に base64 文字列を返し、`path` は無視されます。
- `mark`: トレース有効時のタイムラインマーカーです。コールバック形式で区間グルーピングできます。`stack` 上書きでラッパーライブラリーの呼出元表示を保てます。
- `extend`: `page` に独自メソッドを追加します。
- `getBy*`: `browser-locators.md` 参照。
- `frameLocator`: **playwright 限定**です。同一オリジン条件などは `browser-locators.md` 参照。

```ts
await page.mark('before submit')
await page.getByRole('button', { name: 'Submit' }).click()

await page.mark('submit flow', async () => {
  await page.getByRole('textbox', { name: 'Email' }).fill('john@example.com')
  await page.getByRole('button', { name: 'Submit' }).click()
})
```

## server

Vitest サーバー（Node 側）の情報です。デバッグや環境分岐に使います:

```ts
export const server: {
  platform: Platform // process.platform相当
  version: string // process.version相当
  provider: string
  browser: string
  commands: BrowserCommands
  config: SerializedConfig
}
```

`commands` は `server.commands` のショートカットです。

## cdp

```ts
function cdp(): CDPSession
```

Chrome DevTools Protocol セッションで、主にライブラリー作者向けです:

```ts
import { cdp } from 'vitest/browser'

const input = document.createElement('input')
document.body.appendChild(input)
input.focus()

await cdp().send('Input.dispatchKeyEvent', {
  type: 'keyDown',
  text: 'a',
})
```

> **Warning:** `playwright`＋`chromium` 限定で、`browser.api.allowWrite/allowExec`（および `api.allowWrite/allowExec`）の許可が必要な特権 API です。

## utils

独自 render ライブラリー向けユーティリティーです:

```ts
export const utils: {
  getElementLocatorSelectors(element: Element): LocatorSelectors
  debug(el?: Element | Locator | null | (Element | Locator)[], maxLength?: number, options?: PrettyDOMOptions): void
  prettyDOM(dom?: Element | Locator | undefined | null, maxLength?: number, prettyFormatOptions?: PrettyDOMOptions): string
  configurePrettyDOM(options: StringifyOptions): void
  getElementError(selector: string, container?: Element): Error
}
```

### configurePrettyDOM（v4〜）

`prettyDOM`・`debug` の既定整形を設定します。`vitest-browser-*` の失敗表示にも影響します:

```ts
import { utils } from 'vitest/browser'

utils.configurePrettyDOM({
  maxDepth: 3,
  filterNode: 'script, style, [data-test-hide]',
})
```

- `maxDepth`（既定 `Infinity`）・`maxLength`（既定 7000）・`highlight`（既定 true）等のほか、`@vitest/pretty-format` のオプションを受け付けます。
- `filterNode`（v4.1〜CSS 拡張）は文字列セレクターまたは関数で除外ノードを指定します。`script, style` 除去や `[data-test-hide]`・`[data-test-hide-content] *` などの運用に使います。Testing Library の `defaultIgnore` 相当です。

## 組み込みコマンド

ブラウザーからサーバー関数を呼び出す仕組みです。組み込みはファイル操作と CDP 系です。

### ファイル操作

パスは v3.2 以降プロジェクト root 基準（`process.cwd()` 相当、未上書き時）で解決されます。Vite の `server.fs` 制限に従い、`browser.api.allowWrite`/`api.allowWrite` 無効時は `writeFile`・`removeFile` が何もしません。

```ts
import { server } from 'vitest/browser'

const { readFile, writeFile, removeFile } = server.commands

it('handles files', async () => {
  const file = './test.txt'
  await writeFile(file, 'hello world')
  const content = await readFile(file)
  expect(content).toBe('hello world')
  await removeFile(file)
})
```

既定エンコーディングは `utf-8` で、オプションで上書きできます。

## カスタムコマンド

`browser.commands` 設定またはプラグインの `config` フックで追加します。ライブラリー提供時は後者を使います:

```ts
import type { Plugin } from 'vitest/config'
import type { BrowserCommand } from 'vitest/node'

const myCustomCommand: BrowserCommand<[arg1: string, arg2: string]> = ({
  testPath,
  provider,
}, arg1, arg2) => {
  if (provider.name === 'playwright') {
    console.log(testPath, arg1, arg2)
    return { someValue: true }
  }
  throw new Error(`provider ${provider.name} is not supported`)
}

export default function BrowserCommands(): Plugin {
  return {
    name: 'vitest:custom-commands',
    config() {
      return {
        test: {
          browser: {
            commands: {
              myCustomCommand,
            },
          },
        },
      }
    },
  }
}
```

テスト側:

```ts
import { commands } from 'vitest/browser'
import { expect, test } from 'vitest'

test('custom command works correctly', async () => {
  const result = await commands.myCustomCommand('test1', 'test2')
  expect(result).toEqual({ someValue: true })
})

declare module 'vitest/browser' {
  interface BrowserCommands {
    myCustomCommand: (arg1: string, arg2: string) => Promise<{
      someValue: true
    }>
  }
}
```

> **Warning:** 同名の自作関数は組み込みを上書きする。

### playwright固有コンテキスト

- `page`: テスト iframe を含む全体ページ（オーケストレーター HTML）です。通常は触りません。
- `frame`: テスター `Frame` 解決用 async メソッドで、`page` 類似 API ですが一部非対応です。要素探索は安定・高速な `iframe` を使います。
- `iframe`: `FrameLocator` で、他要素探索に使います。
- `context`: 固有 `BrowserContext` です。

```ts
import type { BrowserCommand } from 'vitest/node'

export const myCommand: BrowserCommand<[string, number]> = async (ctx, arg1, arg2) => {
  if (ctx.provider.name === 'playwright') {
    const element = await ctx.iframe.findByRole('alert')
    const screenshot = await element.screenshot()
    return difference
  }
}
```

ロケーターの `selector` 文字列はこの境界でのみ扱います。Vitest は Locator 渡しを自動で文字列化するため、原則 Locator のまま渡してください。

### webdriverio固有コンテキスト

- `browser`: `WebdriverIO.Browser` API です。
- 呼び出し前に Vitest が自動でテスト iframe へ `switchFrame` するため、`$`・`$$` は iframe 内を指します。非 WebDriver API は親フレーム基準のままなので注意してください。

## 要点

- ページ操作は `page`、サーバー資源は `commands`、低級操作は `cdp()` と層を分けます。
- `cdp()` は Playwright＋Chromium＋allowWrite/allowExec 許可の特権操作です。
- 失敗表示のノイズは `configurePrettyDOM`＋`filterNode` で抑えます。
- ライブラリー横断処理は `browser.commands` に切り出し、型は `BrowserCommands` 拡張で公開します。

<!-- Sources: docs/api/browser/context.md, docs/api/browser/commands.md -->
