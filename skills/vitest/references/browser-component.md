---
name: browser-component
description: Browser Mode のコンポーネントテスト（Vue・React・Svelte の render・Testing Library 連携・実践パターン）を説明します。
---

# コンポーネントテスト

個別 UI コンポーネントを分離検証する戦略です。E2E より高速でデバッグしやすくなります。Browser Mode（Playwright/WebdriverIO/preview）で実ブラウザー実行するのがおすすめです。CSS・実 API・イベント・フォーカス・アクセシビリティの実挙動を捉えられます。

良いテストは実装詳細ではなく、契約（props 入力・描画/イベント出力）とユーザー操作・異常系・境界・空状態を検証します。内部 state・private・CSS クラス名の直接検証は避けてください。

## フレームワーク別 render

公式系は `vitest-browser-vue`・`vitest-browser-react`・`vitest-browser-svelte` です。いずれも `render` 戻り値に `baseElement` 基準のロケーター群（カスタム含む）が生え、リトライ・アサーションと統合されます。Testing Library 併用よりこちらを優先してください。

共通の戻り値概念:

- `container`: 描画先 DOM ノードです。直接クエリに使わずロケーターを使います。
- `baseElement`: クエリ・`debug()` 基準で、既定は `document.body` です。ポータル検証に有用です。
- `locator`: `container` のロケーターで、範囲限定クエリやアサーション渡しに使います。
- `debug`: `prettyDOM` の console 出力ショートカットです。
- `rerender`・`unmount`・`cleanup`: 再描画・破棄・全破棄で、トレースマークも記録されます。

```ts
const { locator } = await render(NumberDisplay, { props: { number: 2 } })
await locator.getByRole('button').click()
await expect.element(locator).toHaveTextContent('Hello World')
```

### Vue（vitest-browser-vue）

```ts
import { render } from 'vitest-browser-vue'
import Component from './Component.vue'

test('counter button increments the count', async () => {
  const screen = await render(Component, {
    props: { initialCount: 1 },
  })
  await screen.getByRole('button', { name: 'Increment' }).click()
  await expect.element(screen.getByText('Count is 2')).toBeVisible()
})
```

- `render(component, options?)` は `PromiseLike` のため、必ず `await` します（同期的使用は非推奨です）。
- `@vue/test-utils` の `mount` オプションを継承します（`attachTo` の代わりに `container` を使います）。独自 `container` は事前に `document.body.appendChild` が必要で、`tbody` 等の検証に使います。
- `rerender(props)`・`unmount()` は非同期で使い、`emitted(eventName?)` で emit 取得できます。ただし emit 値は実装詳細のため、表示変化の検証を優先してください。
- `config.global` は `vitest-browser-vue/pure` の `config` 経由で設定します。`pure` はテスト間の自動除去ハンドラーを付けません。

### React（vitest-browser-react）

```tsx
import { render } from 'vitest-browser-react'
import Component from './Component.jsx'

test('counter button increments the count', async () => {
  const screen = await render(<Component count={1} />)
  await screen.getByRole('button', { name: 'Increment' }).click()
  await expect.element(screen.getByText('Count is 2')).toBeVisible()
})
```

- `render` は**非同期必須**です。`Suspense` 対応のためです。
- `container`・`baseElement`・`wrapper`（共通 Provider ラッパー用）を取れます。`wrapper` はカスタム render 関数化に使います。
- `rerender(ui)`・`unmount()`・`cleanup()` に加え、`renderHook(callback, { initialProps?, wrapper? })` でフック単体検証ができます。戻り値 `result.current` が最新コミット値で、`rerender`・`unmount` を持ちます。`wrapper` に `initialProps` は渡らないため、必要ならラッパー生成関数で包んでください。
- StrictMode は `vitest-browser-react/pure` の `configure({ reactStrictMode: true })` で切り替えます。

### Svelte（vitest-browser-svelte）

```ts
import { render } from 'vitest-browser-svelte'
import Component from './Component.svelte'

test('counter button increments the count', async () => {
  const screen = await render(Component, { initialCount: 1 })
  await screen.getByRole('button', { name: 'Increment' }).click()
  await expect.element(screen.getByText('Count is 2')).toBeVisible()
})
```

- 必ず `await` します（同期使用は将来削除されます）。props は直渡しで、かつての `{ props }` 包みは旧式です。
- 独自 `target` は事前に body へ append します。3 引数に `baseElement` を取れますが通常不要です。
- `rerender(props)` は Svelte 反映待ち、`unmount()` は破棄のため、非同期で使います。`component` インスタンスにも触れられます。
- snippet 検証はラッパーコンポーネント＋`data-testid` で行い、複雑な引数付きは `createRawSnippet` を使います。

### カスタムクエリ拡張

`locators.extend`で定義したクエリは`screen`にも生える:

```ts
import { locators } from 'vitest/browser'

locators.extend({
  getByArticleTitle(title) {
    return `[data-title="${title}"]`
  },
})

const screen = await render(Component)
await expect.element(screen.getByArticleTitle('Hello World')).toBeVisible()
```

## Testing Library連携

公式未対応（Solid・Marko 等）や移行途上では Testing Library 描画＋`page.elementLocator(baseElement)` で橋渡しします:

```jsx
import { render } from '@testing-library/solid'
import { page } from 'vitest/browser'

test('Solid component handles user interaction', async () => {
  const { baseElement } = render(() => <Counter initialValue={0} />)
  const screen = page.elementLocator(baseElement)

  await expect.element(screen.getByText('Count: 0')).toBeInTheDocument()
  await screen.getByRole('button', { name: /increment/i }).click()
  await expect.element(screen.getByText('Count: 1')).toBeInTheDocument()
})
```

Jest＋Testing Library からは `render` の差し替えが中心です。DOM 検証は `await expect.element()`、操作は `vitest/browser` に寄せてください。

## 実践パターン

### 分離と結合

```tsx
vi.mock(import('../components/UserCard'), () => ({
  default: vi.fn(({ user }) => `<div>User: ${user.name}</div>`),
}))

test('UserProfile handles loading and data states', async () => {
  const { getByText } = render(<UserProfile userId="123" />)
  await expect.element(getByText('Loading...')).toBeInTheDocument()
  await expect.element(getByText('User: John')).toBeInTheDocument()
})
```

API は MSW（`msw/browser` の `setupWorker`＋`http.get`）で現実的に模擬し、`beforeAll(start)`・`afterEach(resetHandlers)`・`afterAll(stop)` で管理します。子結合は親子の通信（コールバック引数・他子の更新）まで検証します。

### フォーム・非同期・境界・アクセシビリティ

- 必須・形式・部分修正・成功送信を段階検証し、送信値はモック引数で確認します。
- 非同期は `expect.element` の自動リトライに任せ、手動 wait を増やしません。
- エラー境界は `rerender` で投げる子に切り替えて fallback 出現を見ます。
- モーダル等はフォーカス・`aria-modal`・Escape・フォーカストラップまで検証します。

```tsx
await userEvent.keyboard('{Escape}')
await expect.element(modal).not.toBeInTheDocument()

await expect.element(modal).toHaveAttribute('aria-modal', 'true')
```

### デバッグ

1. headful（`headless: false`）＋devtools で DOM・console・network・breakpoint を使います。
2. 失敗時はクエリを変えて件数確認し、`length`・`first()`・代替クエリ（role/testid/text の `or`）で切り分けます。
3. `expect.element(...).toBeVisible()` の失敗表示や `utils.debug/prettyDOM` で描画を確認します。
4. `getByRole` 失敗時は全ボタンの `aria-label`/`textContent` 列挙などで accessible name を特定します。
5. 非同期疑いは追加 wait ではなく `expect.element` の再試行に寄せ、viewport 固定・MSW ハンドラー・hover 初期化（`browser-interactivity.md`）を見直します。

## 要点

- 公式 render パッケージを第一選択にし、戻り値ロケーターで操作・検証します。
- 未対応は Testing Library 描画＋`elementLocator` で接続し、操作・検証層は Vitest に統一します。
- 外部依存はモック/MSW で分離し、ユーザー操作・境界・アクセシビリティを重点検証します。
- デバッグは headful＋ロケーター件数＋失敗 DOM 表示の順で絞ります。

<!-- Sources: docs/api/browser/vue.md, docs/api/browser/react.md, docs/api/browser/svelte.md, docs/guide/browser/component-testing.md, docs/guide/browser/index.md -->
