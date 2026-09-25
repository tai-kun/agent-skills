---
name: browser-config
description: Browser Mode の test.browser 設定全項目（provider・instances・headless・viewport・trace・screenshot 等）を説明します。
---

# Browser Mode 設定

`test.browser` 配下のオプションリファレンスです。インスタンスごとに上書きできる項目は `browser-config` 内の `instances` エントリーでも指定できます。

## browser.enabled

- **型:** `boolean`
- **既定値:** `false`
- **CLI:** `--browser`、`--browser.enabled=false`

全テストをブラウザーで実行します。他のブラウザーオプションと CLI で併用する例: `vitest --browser.enabled --browser.headless`。

```js
// vitest.config.js
import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [
        { browser: 'chromium' },
      ],
    },
  },
})
```

TypeScript では `instances` の `browser` フィールドにプロバイダーに応じた補完が効きます。

## browser.instances

- **型:** `BrowserConfig[]`
- **既定値:** `[]`

複数ブラウザー設定を定義します。各エントリーは最低 `browser` フィールドを持ちます。ルートアイコンなしの project オプションの多くと、次の `browser` オプションを上書きできます: `browser`・`headless`・`locators`・`viewport`・`testerHtmlPath`・`screenshotDirectory`・`screenshotFailures`・`provider`。

```ts
export default defineConfig({
  test: {
    setupFiles: ['./root-setup-file.js'],
    browser: {
      enabled: true,
      testerHtmlPath: './custom-path.html',
      instances: [
        {
          // setupFiles は root + browser の両方が適用されます
          setupFiles: ['./browser-setup-file.js'],
          // testerHtmlPath はルートから継承されます
        },
      ],
    },
  },
})
```

内部的には単一 Vite サーバーを共有するテストプロジェクトに変換されます。詳細は `browser-guide.md` の複数セットアップを参照してください。

## browser.provider

- **型:** `BrowserProviderOption`

プロバイダーファクトリーの戻り値です。自作も可能ですが、通常は以下を使います:

```ts
import { playwright } from '@vitest/browser-playwright'
import { webdriverio } from '@vitest/browser-webdriverio'
import { preview } from '@vitest/browser-preview'

export default defineConfig({
  test: {
    browser: {
      provider: playwright(),
    },
  },
})
```

トップレベルとインスタンス単位でオプションを渡せます。インスタンス側はマージされず上書きになります:

```ts
provider: playwright({
  launchOptions: { slowMo: 50, channel: 'chrome-beta' },
  actionTimeout: 5_000,
}),
instances: [
  { browser: 'chromium' },
  {
    browser: 'firefox',
    provider: playwright({
      launchOptions: {
        firefoxUserPrefs: { 'browser.startup.homepage': 'https://example.com' },
      },
    }),
  },
],
```

### Playwright固有

- `launchOptions`: `playwright[browser].launch` に直渡しします。`launch.headless` は無視されるため `test.browser.headless` を使います。`--inspect` 時はデバッグフラグが `launch.args` に追加されます。新 headless（実 Chrome）を使うには `channel: 'chromium'` を指定します。
- `connectOptions`: `playwright[browser].connect` に直渡しします。`wsEndpoint` で既存サーバー（Docker・CI・リモート・Azure App Testing など）に接続できます。`exposeNetwork: '<loopback>'` でコンテナー内ブラウザーからホストの dev サーバーに到達できます。
- `contextOptions`: テストファイルごとに作る `browser.newContext()` の引数です。`ignoreHTTPSErrors: true` と `serviceWorkers: 'allow'`（MSW 用）は Vitest が強制します。viewport はここではなく `test.browser.viewport` を使います。
- `actionTimeout`: 既定の操作タイムアウトです（未設定は無制限）。操作ごとに `{ timeout }` でも上書きできます。
- `persistentContext: boolean | string`（v4.1〜）: Playwright の永続コンテキストを使い cookie・localStorage 等を保持します。`true` で `./node_modules/.cache/vitest-playwright-user-data`、文字列で任意パスになります。並列実行時は無視されます。
- 1 ファイル＝1 ページです。Playwright Test Runner のようなテスト単位の分離ではない点に注意してください。

### WebdriverIO固有

`remote()` 受付パラメーターを設定できます（runner 系は無視されます）。`capabilities.browserName` は無視されるため `instances[].browser` を使います。ネスト capabilities も無視されます。`chrome`・`edge` でのみファイル `upload` の文字列指定などが有効、といった制約があります。迷ったら Playwright を選んでください。

## browser.headless

- **型:** `boolean`
- **既定値:** `process.env.CI`
- **CLI:** `--browser.headless`、`--browser.headless=false`

CI では既定で有効になります。`preview` では非対応です。

## browser.viewport

- **型:** `{ width: number, height: number }`
- **既定値:** `414x896`

iframe の既定 viewport です。テスト内では `await page.viewport(1280, 720)` で変更できます。ビジュアルテストの安定のため明示サイズの固定をおすすめします。

## browser.api

- **型:** `number | object`
- **既定値:** `63315`
- **CLI:** `--browser.api=63315`、`--browser.api.port=1234 --browser.api.host=example.com`

ブラウザーにコード配信する Vite サーバーの設定です。`test.api` とは別物です。

- `api.allowWrite`（v4.1〜）: `boolean`。ブラウザーからの WebSocket 経由の書き込み（添付・成果物・スナップショット保存）と `cdp()` 等の特権 API を許可します。`localhost` 以外に公開すると既定 `false` になります。
- `api.allowExec`（v4.1〜）: `boolean`。UI からの任意テスト実行と `cdp()` 等の間接実行を許可します。同様に非 localhost 公開時は既定 `false` です。

## browser.locators

組み込みロケーターの既定値です（詳細は `browser-locators.md`）。

- `browser.locators.testIdAttribute`: `string`、既定 `data-testid`。`getByTestId` の対象属性です。
- `browser.locators.exact`（v4.1.3〜実験的）: `boolean`、既定 `false`。`true` でロケーターのテキスト照合を完全一致（case-sensitive・全体一致）に倒します。個別呼び出しの `exact` で上書きできます。

## browser.expect.toMatchScreenshot

`toMatchScreenshot` アサーションの既定値です（API 詳細は `browser-assertions.md`）。

```ts
export default defineConfig({
  test: {
    browser: {
      expect: {
        toMatchScreenshot: {
          comparatorName: 'pixelmatch',
          comparatorOptions: {
            threshold: 0.2,
            allowedMismatchedPixels: 100,
          },
          resolveScreenshotPath: ({ arg, browserName, ext, testFileName }) =>
            `custom-screenshots/${testFileName}/${arg}-${browserName}${ext}`,
        },
      },
    },
  },
})
```

- アサーション側の全オプションに加え、`resolveScreenshotPath` と `resolveDiffPath` の 2 関数を取れます。
- `resolveScreenshotPath(data) => string`: 参照画像の保存先カスタマイズです。既定は `${root}/${testFileDirectory}/${screenshotDirectory}/${testFileName}/${arg}-${browserName}-${platform}${ext}`。`data` は `arg`・`ext`・`browserName`・`platform`・`screenshotDirectory`・`root`・`testFileDirectory`・`testFileName`・`testName`・`attachmentsDir`・`project`（v4.1.6〜実験的）を含みます。
- `resolveDiffPath`: 失敗時 diff 画像の保存先カスタマイズです。既定は `${root}/${attachmentsDir}/${testFileDirectory}/${testFileName}/${arg}-${browserName}-${platform}${ext}`。
- `comparators: Record<string, Comparator>`: SSIM 等の自作比較アルゴリズムを登録できます。`ScreenshotComparatorRegistry` に型宣言し、`reference`/`actual`（RGBA の `TypedArray`＋`{ width, height }`）と `{ createDiff, ...Options }` を受けて `{ pass, diff, message }` を返します。安定検出中は `createDiff: false` で呼ばれるため尊重して高速化し、オプションは省略されうるため既定値を持たせます。

## browser.screenshotDirectory / browser.screenshotFailures

- `browser.screenshotDirectory`: `string`、既定はテストファイルディレクトリー直下の `__screenshots__`。`root` からの相対パスです。
- `browser.screenshotFailures`: `boolean`、既定 `!browser.ui`。失敗時にスクリーンショットを撮るかです。

## browser.trace

- **型:** `'on' | 'off' | 'on-first-retry' | 'on-all-retries' | 'retain-on-failure' | TraceOptions`
- **既定値:** `'off'`
- **CLI:** `--browser.trace=on`

Playwright Trace Viewer 用トレースを取得します。**playwright 限定**です。

```ts
browser: {
  provider: playwright(),
  trace: {
    mode: 'retain-on-failure',
    tracesDir: './playwright-traces', // root 相対です。未指定はテスト近傍の __traces__ です
    screenshots: true,
    snapshots: true, // DOM スナップショット＋ネットワーク記録です
  },
}
```

`on` は全テスト取得で重いため非推奨です。ファイル名は `chromium-my-test-0-0.trace.zip` 形式（プロジェクト名・テスト名・repeats・retry カウント）です。取得物は HTML レポーターのアノテーションから参照できます。タイムライン装飾は `page.mark`・`locator.mark` で行います（`browser-visual-trace.md` 参照）。

## browser.commands

- **型:** `Record<string, BrowserCommand>`
- **既定値:** `{ readFile, writeFile, ... }`

`vitest/browser` から呼べるカスタムコマンドを登録します（詳細は `browser-context-commands.md`）。

## browser.testerHtmlPath

- **型:** `string`

HTML エントリーポイントのパスで、プロジェクト root からの相対可です。Vite の `transformIndexHtml` フックで処理されます。

## browser.orchestratorScripts

- **型:** `BrowserScript[]`
- **既定値:** `[]`

テスト iframe 起動前にオーケストレーター HTML へ注入するカスタムスクリプトです。`src` と `content` は Vite プラグインで処理されます。

```ts
export interface BrowserScript {
  id?: string // module 時の識別子です。TS なら .ts を付けるとヒントになります
  content?: string // 注入する JS 本文です
  src?: string // Vite 解決されるパス・モジュール名です
  async?: boolean
  type?: string // 既定は 'module' です
}
```

## browser.ui / browser.detailsPanelPosition

- `browser.ui`: `boolean`、既定 `!isCI`、`--browser.ui=false`。ページへの Vitest UI 注入の有無です。
- `browser.detailsPanelPosition`: `'right' | 'bottom'`、既定 `'right'`。ブラウザーテスト時の UI 詳細パネル位置です。

```ts
browser: {
  enabled: true,
  detailsPanelPosition: 'bottom',
}
```

## browser.connectTimeout / browser.trackUnhandledErrors / browser.isolate（非推奨）

- `browser.connectTimeout`: `number`、既定 `60_000`。ブラウザーと Vitest サーバーの WebSocket 確立タイムアウト（ミリ秒）です。通常到達しません。
- `browser.trackUnhandledErrors`: `boolean`、既定 `true`。未捕捉エラー・例外の追跡有無です。特定エラーを隠すには `onUnhandledError` を使います。無効化すると Vitest のエラーハンドラーが外れ、「Pause on exceptions」デバッグがしやすくなります。
- `browser.isolate`: 非推奨のため、`isolate` を使ってください。元はテストごとの iframe 分離フラグです。

## 要点

- 必須 3 点は `enabled`・`provider`・`instances` です。インスタンス単位で provider オプション上書きができます（マージなし）。
- CI・並列・CDP・トレースが必要なら Playwright、既存資産があれば WebdriverIO、見た目確認だけなら preview と使い分けてください。
- viewport・スクリーンショット系・trace 系の既定値はここで一元化し、テスト側では必要時のみ上書きします。
- `browser.api.allowWrite/allowExec` は localhost 公開時に緩むため、外部公開時は既定 deny を理解してください。

<!-- Sources: docs/config/browser/enabled.md, docs/config/browser/instances.md, docs/config/browser/provider.md, docs/config/browser/playwright.md, docs/config/browser/webdriverio.md, docs/config/browser/preview.md, docs/config/browser/headless.md, docs/config/browser/viewport.md, docs/config/browser/api.md, docs/config/browser/locators.md, docs/config/browser/expect.md, docs/config/browser/screenshotdirectory.md, docs/config/browser/screenshotfailures.md, docs/config/browser/trace.md, docs/config/browser/commands.md, docs/config/browser/testerhtmlpath.md, docs/config/browser/orchestratorscripts.md, docs/config/browser/ui.md, docs/config/browser/detailspanelposition.md, docs/config/browser/connecttimeout.md, docs/config/browser/trackunhandlederrors.md, docs/config/browser/isolate.md -->
