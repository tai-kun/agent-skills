---
name: browser-locators
description: Browser Mode の Locator API（getBy 系クエリ・絞り込み・操作メソッド・カスタムロケーター）を説明します。
---

# ロケーター

Locator は要素（群）の表現で、背後のセレクター文字列を抽象化したものです。Playwright ロケーターのフォーク（Ivya）を全プロバイダーで使えます。`testing-library` と異なり `page.getBy*` は DOM 要素ではなく Locator を返すため、合成・リトライ・遅延束縛ができます。

```ts
import { expect } from 'vitest'
import { page } from 'vitest/browser'

const deleteButton = page
  .getByRole('row')
  .filter({ hasText: 'Vitest' })
  .getByRole('button', { name: /delete/i })

await deleteButton.click()
await expect.element(deleteButton).toBeEnabled()
```

> **Note:** `page.getBy*` は `browser-context-commands.md` の `page` オブジェクトのクエリ群です。単一要素の取り出しは `.element()`・`.query()` を使いますが厳密で、複数一致で投げます。

## クエリ一覧

共通の `exact: boolean` はテキストの完全一致（case-sensitive・全体一致、ただし前後空白は trim）です。既定 `false` で、正規表現時は無視されます。`browser.locators.exact` で既定を変更できます。

### getByRole

```ts
function getByRole(role: ARIARole | string, options?: LocatorByRoleOptions): Locator
```

ARIA ロール・ARIA 属性・アクセシブル名で探します。対話要素は `getByText` よりこちらを優先します。

```html
<h3>Sign up</h3>
<label>Login <input type="text" /></label>
<label>Password <input type="password" /></label>
<button>Submit</button>
```

```ts
await expect.element(page.getByRole('heading', { name: 'Sign up' })).toBeVisible()
await page.getByRole('textbox', { name: 'Login' }).fill('admin')
await page.getByRole('button', { name: /submit/i }).click()
```

オプション: `exact`・`name: string | RegExp`（既定は case-insensitive 部分一致）・`checked`・`disabled`（継承あり）・`expanded`・`pressed`・`selected`・`includeHidden`（既定では隠し要素を除外。`none`・`presentation` は常に対象）・`level`（heading 等の `aria-level`）。

> **Warning:** ロール照合は継承なしの文字列一致です。`checkbox` で `switch` は拾えません。`role`・`aria-*` の過剰付与は ARIA ガイドライン上非推奨です。

### getByAltText / getByLabelText / getByPlaceholder / getByText / getByTitle / getByTestId

```ts
function getByAltText(text: string | RegExp, options?: LocatorOptions): Locator
function getByLabelText(text: string | RegExp, options?: LocatorOptions): Locator
function getByPlaceholder(text: string | RegExp, options?: LocatorOptions): Locator
function getByText(text: string | RegExp, options?: LocatorOptions): Locator
function getByTitle(text: string | RegExp, options?: LocatorOptions): Locator
function getByTestId(text: string | RegExp): Locator
```

- `getByAltText`: `alt` 属性一致であれば任意要素にマッチします。
- `getByLabelText('Username')`: `for`/`aria-labelledby`/ラッパーラベル/`aria-label` の関連付けを解決します。
- `getByPlaceholder`: `placeholder` 属性一致の任意要素にマッチします。ラベルが使えるならそちらを優先します。
- `getByText`: TextNode の `nodeValue` または `button`/`reset` 系 input の値にマッチします。空白は常に正規化されます。非対話要素向けで、ボタン等は `getByRole` を使います。
- `getByTitle`: `title` 属性にマッチします。SVG 内 `title` 要素は拾えません。
- `getByTestId`: `browser.locators.testIdAttribute`（既定 `data-testid`）にマッチします。他が使えない場合の最終手段とします。

## 絞り込みと合成

### nth / first / last

```ts
function nth(index: number): Locator
function first(): Locator // nth(0) の糖衣です
function last(): Locator // nth(-1) の糖衣です
```

`elements()[n]` と異なり、要素出現までリトライされます。可能なら連鎖で絞ってから使います:

```ts
page.getByRole('textbox').nth(0)
page.getByLabel('two').getByRole('input') // nth より堅牢です
```

### and / or

```ts
function and(locator: Locator): Locator
function or(locator: Locator): Locator
```

```ts
page.getByRole('button').and(page.getByTitle('Subscribe'))
page.getByRole('button', { name: /submit/i })
  .or(page.getByTestId('submit-button'))
  .or(page.getByText('Submit'))
```

> **Warning:** `or` 結果が複数要素になると単一前提メソッド（`click` など）は失敗します。

### filter

```ts
function filter(options: LocatorOptions): Locator
```

- `has: Locator`: 指定ロケーターを含む要素に絞ります。子ロケーターは親基準の相対評価で、親外を指すものは不可です。連鎖できます。
- `hasNot: Locator`: 含まないものに絞ります。
- `hasText: string | RegExp`: 内部テキスト部分一致です（文字列は case-insensitive）。
- `hasNotText: string | RegExp`: 含まないものに絞ります。

```ts
page.getByRole('article').filter({ has: page.getByText('Vitest') })
page.getByRole('article').filter({ hasText: 'Vitest' })
```

## 操作・取得メソッド

すべて非同期で `await` 必須です（v3 以降、未 await は失敗します）。

| メソッド | 概要 |
| --- | --- |
| `click`・`dblClick`・`tripleClick` | クリック系です。`tripleClick` は 3 連続 click 発火で `evt.detail === 3` で判定します |
| `wheel({ delta \| direction, times? })`（v4.1〜） | `wheel` イベント発火です。自動スクロール目的では使わず、ホイール購読 UI のテスト用です |
| `clear` | 入力内容消去です |
| `hover`・`unhover` | カーソル移動です。`unhover` は `document.body` へ移動します |
| `fill(text)` | `input`/`textarea`/`contenteditable` へ設定します（既存削除＋`input` イベント）。`type` より高速です |
| `dropTo(target)` | ドラッグ元から先への移動です。元に `draggable=true` が必要です |
| `selectOptions(values)` | `<select>` の選択です。値・要素・Locator の単複を受け付けます |
| `screenshot(options?)` | 要素の撮影です。`path` 省略時は `screenshotDirectory`＋ファイル名＋テスト名で決定します。`base64: true` で内容も返します。`save: false` 時は常に base64 文字列を返します |
| `mark(name)` | トレース用マーカーです（`browser-visual-trace.md` 参照） |
| `query(): Element \| null` | 単一要素または `null` です。複数一致で投げます。ロケーター非対応の外部 API 用脱出口です |
| `element(): Element` | 単一要素です。0 件・複数件で投げます。`expect.element` のリトライ毎に自動呼出しされます |
| `elements(): Element[]` | 一致全要素です。常時成功し、0 件は `[]` です |
| `findElement({ timeout?, strict? })`（v4.1〜） | DOM 出現まで待機して要素を返す脱出口です。既定はテストタイムアウト共有、`strict` 既定 `true`（複数で即時失敗、`false` で先頭返却） |
| `all(): Locator[]` | `.elements()` を `page.elementLocator` で包んだ配列です |

`upload` は `userEvent.upload` 経由またはロケーター直呼びできます（ファイル選択の詳細は `browser-interactivity.md`）。

## プロパティ

- `selector: string`: プロバイダー用セレクター文字列です（Playwright 系は Playwright 記法、他は CSS）。テストコードで直接使わず、Commands API 用にのみ使います。
- `length: number`: `elements().length` 相当で、常時成功します。

## page / elementLocator / frameLocator

```ts
page.elementLocator(element: Element): Locator
page.frameLocator(iframeElement: Locator): FrameLocator
```

- `elementLocator`: Testing Library 等の描画結果（`baseElement`）を Vitest ロケーターに橋渡しします。`browser-component.md` の連携パターンで使います。
- `frameLocator`: iframe 文書内を探索します。**playwright 限定**です。対話系は使えますが、`expect.element` アサーションには同一オリジンが必要です。

```ts
const frame = page.frameLocator(page.getByTestId('iframe'))
await frame.getByText('Hello World').click()
```

## カスタムロケーター（v3.2〜、上級）

`locators.extend` で `page` と全ロケーターにファクトリーを追加できます。文字列返却はロケーター化され、それ以外はそのまま返ります。Playwright ロケーター記法で記述します。

```ts
import { locators } from 'vitest/browser'

locators.extend({
  getByArticleTitle(title) {
    return `[data-title="${title}"]`
  },
  async previewComments() {
    // this は呼び出し元です（page 直呼び時は page）
    if (this !== page) {
      await this.click()
    }
  },
})

declare module 'vitest/browser' {
  interface LocatorSelectors {
    getByArticleTitle(title: string): Locator
    previewComments(this: Locator): Promise<void>
  }
}
```

`page` 直呼びは全体探索、ロケーター経由はその配下にスコープされます:

```ts
const worldArticle = page.getByArticleTitle('Hello, World!')
const comments = worldArticle.getByArticleCommentsCount(2)
```

フレームワークの `render` 戻り値にも自動で生えるため、`screen.getByArticleTitle(...)` のように使えます。

## 要点

- 取得は `getByRole` 優先、テキストは非対話要素用、テスト ID は最終手段とします。
- `filter`・連鎖で絞り、`nth` は最後の手段にします。
- 単体取得は `element`/`query`/`elements`/`findElement` を使い分け、常用操作はロケーターのまま `await` します。
- `selector` 文字列はテストで直接扱わず、カスタムコマンド境界でのみ使います。
- 足りないクエリは `locators.extend` で拡張し、型は `LocatorSelectors` に宣言します。

<!-- Sources: docs/api/browser/locators.md, docs/api/browser/context.md -->
