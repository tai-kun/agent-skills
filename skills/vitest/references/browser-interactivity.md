---
name: browser-interactivity
description: Browser Mode の userEvent 操作（click・fill・keyboard・select・drag・clipboard 等）と実イベント発火の注意点を説明します。
---

# ユーザー操作 API

`vitest/browser` の `userEvent` は `@testing-library/user-event` のサブセットを、イベント偽装ではなく CDP（Chrome DevTools Protocol）または WebDriver で実装したものです。実ユーザー操作に近い挙動になります。

```ts
import { userEvent } from 'vitest/browser'

await userEvent.click(document.querySelector('.button'))
```

ほとんどのメソッドはプロバイダーオプションを継承します。各メソッドと同名ショートカットが Locator にも生えています（例: `logo.click()`）。詳細な引数は各プロバイダー（Playwright/WebdriverIO）のドキュメントも参照してください。

> **Warning:** `preview` では CDP/WebDriver 連携がなく、`@testing-library/user-event` の再エクスポートに過ぎません。実イベント検証には Playwright/WebdriverIO を使います。

## userEvent.setup と状態管理

```ts
function setup(): UserEvent
```

キーボード押下状態などを保持したい場合に新規インスタンスを作ります。既定の `userEvent` は単一インスタンスで、呼び出し毎に作り直す `@testing-library/user-event` と異なります:

```ts
import { userEvent as vitestUserEvent } from 'vitest/browser'

await vitestUserEvent.keyboard('{Shift}') // 押下保持
await vitestUserEvent.keyboard('{/Shift}') // 解放
```

> **Warning:** Playwright/WebdriverIO ではキー押下・ポインター位置・hover 状態が同一ファイル内のテスト間に残りえます。Vitest は未解放キーは各テスト前に自動リセットしますが、ポインター/hover は自動リセットしません。依存する場合は明示的に戻します:
>
> ```ts
> import { beforeEach } from 'vitest'
> import { userEvent } from 'vitest/browser'
>
> beforeEach(async () => {
>   await userEvent.unhover(document.body)
> })
> ```

## click / dblClick / tripleClick

```ts
function click(element: Element | Locator, options?: UserEventClickOptions): Promise<void>
function dblClick(element: Element | Locator, options?: UserEventDoubleClickOptions): Promise<void>
function tripleClick(element: Element | Locator, options?: UserEventTripleClickOptions): Promise<void>
```

```ts
import { page, userEvent } from 'vitest/browser'

const logo = page.getByRole('img', { name: /logo/ })
await userEvent.click(logo)
await logo.click()
// WebdriverIO で actions 系を強制したい場合は空オブジェクトを渡します
await logo.click({})
```

- 修飾キー付きクリックは `keyboard('{Shift>}')`＋`click(element, {})` 併用か、Playwright では `click(element, { modifiers: ['Shift'] })` で行います。Firefox の既知バグ回避に空オブジェクト渡しが必要な場合があります。
- `tripleClick` はブラウザー API に存在しないため 3 連続 click で、`evt.detail === 3` で判定します。Playwright は `clickCount: 3`、WebdriverIO は actions で実装します。

## wheel（v4.1〜）

```ts
function wheel(element: Element | Locator, options: UserEventWheelOptions): Promise<void>
```

`wheel` イベント購読 UI（独自ズーム・横タブ・canvas 等）のテスト用です。`delta: { x, y }` の精密指定か `direction: 'up' | 'down' | 'left' | 'right'` の簡易指定を選び、`times` で回数を束ねます:

```ts
await userEvent.wheel(tablist, { delta: { x: 100 } })
await userEvent.wheel(tablist, { direction: 'right', times: 5 })
await page.getByRole('tablist').wheel({ direction: 'right' })
```

> **Warning:** 要素をビューに入れる目的のスクロールには使わず、他操作の自動スクロールに任せます。

## fill / type / keyboard / clear

```ts
function fill(element: Element | Locator, text: string): Promise<void>
function type(element: Element | Locator, text: string, options?: UserEventTypeOptions): Promise<void>
function keyboard(text: string): Promise<void>
function clear(element: Element | Locator, options?: UserEventClearOptions): Promise<void>
```

```ts
await userEvent.fill(input, 'foo') // 既存削除→設定→input イベントです。keyboard 記法は解釈しません
await input.fill('foo') // ロケーター直呼びです
await userEvent.keyboard('foo') // フォーカス先へ打鍵します
await userEvent.keyboard('{Shift}{f}{o}{o}') // keyboard 記法対応です
await userEvent.type(input, 'foo') // keyboard 記法対応の type 互換です。特殊文字不要なら fill 推奨です
await userEvent.clear(input)
await input.clear()
```

- `fill` はフォーカス→設定→`input` イベントで、`{Shift}` 等も素文字列になります。高速のため、特殊文字制御が不要ならこちらを使います。
- `type` は `keyboard` 基盤の互換実装で、Locator に `.type` は生えていません（`.fill` を使います）。
- `keyboard` 単体はフォーカス要素（なければ `document.body`）へ打鍵します。`{a>5}`・`{a>5/}` 等の keyboard 記法に対応します。
- `tab(options?)` は `keyboard('{tab}')` の糖衣で、`{ shift: true }` で逆移動できます。

## selectOptions

```ts
function selectOptions(
  element: Element | Locator,
  values: HTMLElement | HTMLElement[] | Locator | Locator[] | string | string[],
  options?: UserEventSelectOptions,
): Promise<void>
```

```ts
await userEvent.selectOptions(select, 'Option 1')
await select.selectOptions('Option 1')
await userEvent.selectOptions(select, [
  page.getByRole('option', { name: 'Option 1' }),
  page.getByRole('option', { name: 'Option 2' }),
])
```

> **Warning:** `multiple` なし select は先頭のみ選択されます。`listbox` は未対応です。WebdriverIO は複数選択に未対応です。

## hover / unhover

```ts
function hover(element: Element | Locator, options?: UserEventHoverOptions): Promise<void>
function unhover(element: Element | Locator, options?: UserEventHoverOptions): Promise<void>
```

```ts
await userEvent.hover(logo)
await logo.hover()
await userEvent.unhover(logo)
```

WebdriverIO は要素中央、Playwright は可視点に移動します。`unhover` は `document.body` へ移動しますが、同位置にいると無効に見える場合があります。

## upload / dragAndDrop

```ts
function upload(element: Element | Locator, files: string[] | string | File[] | File, options?: UserEventUploadOptions): Promise<void>
function dragAndDrop(source: Element | Locator, target: Element | Locator, options?: UserEventDragAndDropOptions): Promise<void>
```

```ts
const file = new File(['file'], 'file.png', { type: 'image/png' })
await userEvent.upload(input, file)
await input.upload(file)
// プロジェクト root 相対のパス指定も可能です
await userEvent.upload(input, './fixtures/file.png')

await userEvent.dragAndDrop(source, target)
await source.dropTo(target)
```

- `upload` の WebdriverIO 対応は `chrome`・`edge` かつ文字列指定のみの場合があります。
- `dragAndDrop` の元要素には `draggable=true` が必要です。`preview` では非対応です。

## copy / cut / paste

```ts
function copy(): Promise<void>
function cut(): Promise<void>
function paste(): Promise<void>
```

```js
await userEvent.click(page.getByPlaceholder('source'))
await userEvent.keyboard('hello')
await userEvent.dblClick(page.getByPlaceholder('source'))
await userEvent.copy()
await userEvent.click(page.getByPlaceholder('target'))
await userEvent.paste()
```

選択テキストのクリップボード連携で、`cut` は元を空にします。組み合わせてコピペ・切り貼りフローを検証します。

## 要点

- 実イベント検証は `vitest/browser` の `userEvent` または Locator 直呼びに統一します。
- 通常入力は `fill`、特殊キー・粒度制御は `type`/`keyboard`、フォーカス移動は `tab` と使い分けます。
- hover 依存テストは `beforeEach` で `unhover` し、キー押下は `setup()` の寿命を意識します。
- `upload`・複数選択・`dragAndDrop` はプロバイダー制約を事前確認し、`preview` では高度操作を避けてください。

<!-- Sources: docs/api/browser/interactivity.md, docs/api/browser/locators.md -->
