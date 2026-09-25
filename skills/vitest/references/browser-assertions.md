---
name: browser-assertions
description: Browser Mode のアサーション（expect.element・DOM マッチャー・スクリーンショット・ARIA スナップショット）を説明します。
---

# Browser Mode のアサーション

`@testing-library/jest-dom` 由来の DOM アサーションを、ロケーター対応とリトライ付きで使えます。TypeScript で型を効かせるには `vitest/browser` への参照が必要です（未 import なら `/// <reference types="vitest/browser" />` を追加してください）。

## expect.element

ブラウザーテストは非同期のため不安定になりやすいので、遅延条件（timeout・fetch・アニメーション）でも成功するようにリトライ付きアサーションを使います:

```ts
import { expect, test } from 'vitest'
import { page } from 'vitest/browser'

test('error banner is rendered', async () => {
  triggerError()
  const banner = page.getByRole('alert', { name: /error/i })
  await expect.element(banner).toHaveTextContent('Error!')
})
```

- `page.getBy*` は呼び出し時点では存在を確認しません。`expect.element` で DOM の存在と条件成立まで繰り返し確認します。
- `expect.element(locator, options?)` の第 2 引数は `{ interval?、timeout?、message? }` です。既定は `expect.poll` の設定です。
- `expect.element` は `expect.poll(() => element)` の糖衣です。通常の `expect` でも同じマッチャーを使えますが、即時判定になります。

```ts
expect(banner).toHaveTextContent('Error!') // 即時失敗しうる
await expect.element(banner).toHaveTextContent('Error!') // 推奨
```

## DOMマッチャー一覧

すべて `await expect.element(locator)` と組み合わせて使います。前提となる DOM は各節の例を参照してください。

| マッチャー | 判定内容 |
| --- | --- |
| `toBeDisabled`・`toBeEnabled` | ユーザー視点の disabled 状態を判定します。ネイティブ系と `disabled` 継承で判定します |
| `toBeEmptyDOMElement` | 可視内容なしを判定します（コメント無視・空白ありは失敗します） |
| `toBeInTheDocument` | document 内存在を判定します。切断要素は対象外のため、`toContainElement` を使います |
| `toBeInvalid`・`toBeValid` | `aria-invalid` または `checkValidity()` による妥当性を判定します |
| `toBeRequired` | `required` または `aria-required="true"` の有無を判定します |
| `toBeVisible` | 空でない bbox と `visibility:hidden` でないことを判定します。`display:none`・0 サイズは不可視、`opacity:0` は可視扱いです。複数中 1 件確認は `.first()` を使います |
| `toBeInViewport({ ratio? })`（v4〜） | `IntersectionObserver` による viewport 内判定です。`ratio` は 0〜1 の最小露出率です |
| `toContainElement(el)` | 子孫包含を判定します。`HTMLElement`・`SVGElement`・Locator を受け付けます |
| `toContainHTML(html)` | HTML 文字列包含を判定します。外部由来 HTML 検証向けのため、自前 DOM 構造の検証には `toContainElement` を使います |
| `toHaveAccessibleDescription`・`toHaveAccessibleErrorMessage`・`toHaveAccessibleName` | アクセシブル記述・エラー・名前を判定します。文字列・正規表現・`expect.stringContaining/Matching` を受け付けます |
| `toHaveAttribute(name, value?)` | 属性有無・値一致を判定します（部分一致ヘルパー可） |
| `toHaveClass(...names, { exact? }?)` | クラス包含を判定します。正規表現は各クラス単位照合で、全体照合ではありません。`exact: true` は過不足なし（順不同）を要求します |
| `toHaveFocus` | フォーカス有無を判定します |
| `toHaveFormValues(obj)` | `form`・`fieldset` 専用です。checkbox 群・radio 群・`select[multiple]`・number 等の型差異を吸収します |
| `toHaveStyle(css)` | 指定 CSS の全一致を判定します（文字列または `CSSStyleDeclaration` 部分）。クラス経由の計算スタイルも対象になります |
| `toHaveTextContent(text, { normalizeWhitespace? }?)` | 部分一致を判定します（case-sensitive）。全体・insensitive は正規表現で行います |
| `toHaveValue(v)` | `input`・`select`・`textarea` 等の値を判定します。checkbox/radio は `toBeChecked`・`toHaveFormValues` を使います。`meter` 等は `aria-valuenow` 照合です |
| `toHaveDisplayValue(v)` | ユーザー表示値を判定します。単複 select・textarea に対応しています |
| `toBeChecked` | checkbox・radio・`switch` 等の checked 状態を判定します |
| `toBePartiallyChecked` | `aria-checked="mixed"` または `indeterminate=true` の半選択を判定します |
| `toHaveRole(role)` | ARIA ロール一致を判定します。継承なしの厳密一致のため、`switch` と `alert` のような複数指定は先頭のみ有効です |
| `toHaveSelection(text?)` | テキスト選択範囲の文字列照合です。index 指定はできません |

代表例:

```ts
await expect.element(page.getByText('Welcome')).toBeVisible()
await expect.element(page.getByText('To')).toBeInViewport({ ratio: 0.5 })
await expect.element(getByTestId('login-form')).toHaveFormValues({
  username: 'jane.doe',
  rememberMe: true,
})
await expect.element(deleteButton).toHaveClass('btn-danger extra btn', { exact: true })
await expect.element(modal).toHaveAttribute('aria-modal', 'true')
```

## toMatchScreenshot（実験的）

```ts
function toMatchScreenshot(name?: string, options?: ScreenshotMatcherOptions): Promise<void>
function toMatchScreenshot(options?: ScreenshotMatcherOptions): Promise<void>
```

ビジュアルリグレッション用の参照画像比較です。全体の既定値は `browser.expect.toMatchScreenshot` で設定できます。

```ts
await expect.element(getByTestId('button')).toMatchScreenshot()
await expect.element(getByTestId('button')).toMatchScreenshot('fancy-button')
await expect.element(getByTestId('button')).toMatchScreenshot({
  comparatorName: 'pixelmatch',
  comparatorOptions: { allowedMismatchedPixelRatio: 0.01 },
})
```

主なオプション:

- `comparatorName`: 既定は `pixelmatch` です。自作時は `browser.expect.toMatchScreenshot.comparators` への登録が必須のため、型推論のために明示指定します。
- `comparatorOptions`: `threshold`（0〜1 の色差許容、既定 0.1）・`allowedMismatchedPixelRatio`（0〜1 の割合許容）・`allowedMismatchedPixels`（個数許容、両指定は厳しい方採用）・`includeAA`（既定 false で AA 無視）・`alpha`・`aaColor`・`diffColor`・`diffColorAlt`・`diffMask` を指定できます。
- `screenshotOptions`: `locator.screenshot()` と同等ですが `base64`・`path`・`save`・`type` は除外されます。
- `timeout`: 安定スクリーンショット待機で、既定は 5 秒です。0 で無効化できますが、不安定時は終わりません。

動作特性:

- 連続 2 回一致まで撮り直す安定検出を行い、アニメーション・ロード中間状態の誤検知を抑えます。検出中は `createDiff: false` で比較します。
- ブラウザー・OS・解像度・GPU・フォントで描画が変わるため、参照名にブラウザー名とプラットフォームを含みます（例: `hero-section-chromium-darwin.png`）。同一環境（Docker・クラウド）での運用をおすすめします。
- 初回は参照を生成して失敗します。内容確認後に再実行し、参照はコミットしてください。意図変更時は `--update`（watch 中は `u`）で更新します。
- 失敗時は参照・実写・diff の 3 画像と保存パスが出ます。赤は差分、黄は AA 差分です。

## ARIAスナップショット（実験的、v4.1.4〜）

支援技術と同じアクセシビリティツリーを YAML 風スナップショットで検証します。HTML 構造変更に強く、欠落ラベル・誤ロール・見出しレベル等の退行を捉えられます。

```ts
await expect.element(page.getByRole('navigation')).toMatchAriaInlineSnapshot(`
  - navigation "Main":
    - link "Home":
      - /url: /
    - link "About":
      - /url: /about
`)
```

- `toMatchAriaSnapshot()`: ファイルスナップショットです。
- `toMatchAriaInlineSnapshot()`: インラインスナップショットです。
- 通常スナップショットと同じ `--update`・watch 更新・CI 挙動です（`features-snapshots.md` 参照）。
- Browser Mode では DOM ポーリングでツリー安定（連続 2 回一致）後に評価・保存します。既存スナップショット不一致時はリセットして期待状態到達まで待つため、非同期描画に強いです。
- 手書き正規表現は `--update` でも維持されます。変更されたリテラルのみ更新されます。

書式要点:

```yaml
- role "name" [attribute=value]
```

- `role` は ARIA ロール、`"name"` はアクセシブル名（文字列は完全一致、`/re/` は正規表現）、`[...]` は `checked`・`disabled`・`expanded`・`level`・`pressed`・`selected` 等の状態です。非活性属性は省略されます。
- 単一テキスト子のみの要素は `- paragraph: Hello world` のようにインライン化されます。空白は正規化されます。
- `/url:` はリンク URL、`/placeholder:` は名前と異なる場合のみ現れるプレースホルダーです。
- 子の比較は既定で部分一致（順序付き部分列）です。`/children: equal` で直下厳密、`/children: deep-equal` で全階層厳密、`contain` で明示的部分一致になります。
- 手書き正規表現の `\d` 等は JS 文字列消費のため `\\d` と二重化します（自動生成・更新時は自動処理されます）。

## 要点

- DOM 検証は原則 `await expect.element(...)` で行い、即時 `expect` は使いません。
- 構造検証よりユーザー視点（ロール・名前・可視・値・フォーカス）を優先し、`toContainHTML` は外部 HTML 用に留めます。
- 見た目は `toMatchScreenshot`、意味構造は ARIA スナップショットと使い分け、参照画像・スナップは意図確認後に更新・コミットします。
- 比較ゆるめ設定は全体既定＋テスト個別上書きの二層で行い、フォント・解像度・ブラウザー差を環境固定で抑えます。

<!-- Sources: docs/api/browser/assertions.md, docs/guide/browser/aria-snapshots.md, docs/guide/browser/visual-regression-testing.md, docs/config/browser/expect.md -->
