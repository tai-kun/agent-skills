---
name: browser-guide
description: Browser Mode の概要・インストール・実行方法・複数ブラウザー設定・制限事項と jsdom との使い分けを説明します。
---

# Browser Mode ガイド

Browser Mode はテストを実ブラウザー内でネイティブ実行する機能で、`window` や `document` などのブラウザーグローバルに直接アクセスできます。`jsdom` や `happy-dom` のようなシミュレーション環境と異なり、CSS レンダリング・実ブラウザー API・イベント伝播・フォーカス管理を正確に検証できます。

> **Note:** `expect`・`vi`・プロジェクト・型テストなど汎用 API は通常ガイドどおりに使います。ここではブラウザー固有のセットアップと実行に絞ります。

## なぜ Browser Mode か

- シミュレーション環境は手軽ですが実ブラウザーとの差異で誤検知（false positive/negative）が起こりえます。
- 実ブラウザーでの実行が最も高い信頼性を与えます。特にレイアウト・実イベント・アクセシビリティの検証に有効です。
- 代償として初期化が長くなります（プロバイダー＋ブラウザー起動が必要）。まだ発展途上のため、必要に応じて Playwright・WebdriverIO・Cypress などの単体ランナーと併用してください。

## インストール

手軽には `vitest init browser` を使います:

```bash
npx vitest init browser
```

手動の場合はプロバイダーを必ず 1 つ入れます。選択肢は `preview`・`playwright`・`webdriverio` です:

```bash
npm install -D vitest @vitest/browser-playwright
# または
npm install -D vitest @vitest/browser-webdriverio
# 見た目確認専用（CI不可）
npm install -D vitest @vitest/browser-preview
```

> **Warning:** CI で実行するには `playwright` か `webdriverio` が必要です。ローカルでも CDP/WebDriver 経由で実イベントを発火できる両者の利用をおすすめします。並列実行できるため、迷ったら Playwright から始めてください。

`preview` プロバイダーの制限:

- headless 非対応（常にウィンドウ表示）です。
- 同一ブラウザーの複数インスタンス不可です。
- 高度なブラウザーオプション・CDP 非対応です。`userEvent` は `@testing-library/user-event` の再エクスポートに過ぎず、実イベント発火ではありません。

## 基本設定

```ts
// vitest.config.ts
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

- `browser.enabled: true` が必須です。CLI の `--browser` だけでは有効化されません（v3.2 以降は設定なしで `--browser` を渡すと失敗します）。
- `provider` と最低 1 つの `instances` が必須です。
- フレームワークの Vite プラグイン（`@vitejs/plugin-react`、`@vitejs/plugin-vue`、`@sveltejs/vite-plugin-svelte` など）を `plugins` に忘れず登録してください。
- 既定で Vite サーバーにポート `63315` を使います（開発サーバーと並行可能）。変更は `browser.api` で行います。watch 中の URL 表示は `b` キーです。

プロバイダー別のブラウザー名:

- `playwright`: `chromium`・`firefox`・`webkit`
- `webdriverio`: `chrome`・`firefox`・`edge`・`safari`

ブラウザー互換性は Vite dev サーバーに準拠します（ネイティブ ESM・動的 import・`import.meta`・`BroadcastChannel` が使えること）: Chrome >=87、Firefox >=78、Safari >=15.4、Edge >=88。

## Nodeテストとの併用

ファイル規約などで `projects` を分けると、Node 実行とブラウザー実行を混在できます:

```ts
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          include: ['tests/unit/**/*.{test,spec}.ts'],
          name: 'unit',
          environment: 'node',
        },
      },
      {
        test: {
          include: ['tests/browser/**/*.{test,spec}.ts'],
          name: 'browser',
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
})
```

## テストの実行

```sh
npx vitest --browser=chromium
npx vitest --browser.headless
vitest --browser.enabled --browser.headless
```

- 既定では開発用にブラウザー UI を自動で開き、中央の iframe 内でテストが走ります。viewport は UI 選択・テスト内の `page.viewport()`・設定の `browser.viewport` で変更します。
- headless は boolean で、CI では既定で有効になります。UI を残したまま headless 実行したい場合は `@vitest/ui` を入れて `--ui` を渡します。`preview` では headless 不可です。
- 最小のテスト例（外部パッケージ不要）:

```js
// example.test.js
import { expect, test } from 'vitest'
import { page } from 'vitest/browser'

test('properly handles form inputs', async () => {
  document.body.innerHTML = `<p>Hi, my name is Alice</p>
    <label>Username <input /></label>`

  await expect.element(page.getByText('Hi, my name is Alice')).toBeInTheDocument()

  const usernameInput = page.getByLabelText(/username/i)
  await usernameInput.fill('Bob')

  await expect.element(page.getByText('Hi, my name is Bob')).toBeInTheDocument()
})
```

> **Warning:** `@testing-library/user-event` を直接使わないでください。シミュレーション発火になるため、CDP/WebDriver 経由の `vitest/browser` の `userEvent` を使います（`browser-interactivity.md` 参照）。

## 複数セットアップ（instances）

`browser.instances` で複数ブラウザー・複数設定を定義できます。test プロジェクトより有利な点は Vite サーバーを共有するため変換・依存プリバンドルが 1 回で済むことです。

```ts
export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [
        { browser: 'chromium' },
        { browser: 'firefox' },
        { browser: 'webkit' },
      ],
    },
  },
})
```

設定値の異なる同ブラウザー併用も可能です。`provide` や `setupFiles` をインスタンスごとに変えられます:

```ts
instances: [
  {
    browser: 'chromium',
    name: 'chromium-1',
    setupFiles: ['./ratio-setup.ts'],
    provide: { ratio: 1 },
  },
  {
    browser: 'chromium',
    name: 'chromium-2',
    provide: { ratio: 2 },
  },
]
```

> **Warning:** 同一ブラウザー名を複数使う場合は `name` を明示してください。未指定時はブラウザー名がプロジェクト名になります。ルートに `name` がある場合は `custom (chromium)` のようにマージされます。

フィルタ実行:

```sh
vitest --project=chromium
```

各インスタンスは `browser`・`headless`・`locators`・`viewport`・`testerHtmlPath`・`screenshotDirectory`・`screenshotFailures`・`provider` と、ルートアイコンなしの project オプションの多くを上書きできます。ルート設定は継承される点に注意してください。

## 制限事項

### スレッドブロッキングダイアログ

`alert`・`confirm` はページをブロックして通信不能になるためネイティブ使用不可です。Vitest は既定モックでハングを防ぎますが、自前でモックするのが望ましいです。

### モジュールexportのスパイ

ブラウザーはネイティブ ESM 提供のため名前空間オブジェクトが sealed で、`vi.spyOn(module, 'method')` は失敗します。回避策:

```ts
vi.mock('./module.js', { spy: true })
```

export された変数の書き換えは、内部値を変える関数経由でのみ可能です。

## 要点

- 実ブラウザー検証が必要なら Browser Mode を選び、CI と並列実行には Playwright を使います。
- `enabled`・`provider`・最低 1 `instances` が必須で、フレームワークの Vite プラグインを登録します。
- Node/ブラウザー混在は `projects` で、複数ブラウザー・複数条件は `instances` で行います（同名併用時は `name` 必須）。
- `alert`/`confirm` は使わずモックし、`vi.spyOn` on import は不可のため `vi.mock(..., { spy: true })` を使います。
- 操作は `vitest/browser` の `page`・`userEvent` に統一し、`@testing-library/user-event` の直接利用を避けてください。

<!-- Sources: docs/guide/browser/index.md, docs/guide/browser/why.md, docs/guide/browser/multiple-setups.md, docs/config/browser/preview.md -->
