---
name: features-snapshots
description: toMatchSnapshot、インライン・ファイルスナップショット、ARIA スナップショット、カスタムシリアライザー、カスタムスナップショットマッチャーによるスナップショットテストを説明します。
---

# スナップショットテスト

スナップショットテストは関数の出力が予期せず変化しないことを保証します。Vitest は受け取った値をシリアライズし、テスト横（またはインライン）に参照スナップショットを保存して、以降の実行で比較します。不一致はコード修正またはスナップショット更新までテストを失敗させます。初心者向け導入は `docs/guide/learn/snapshots.md` の Snapshot Testing チュートリアルを参照してください。

## 基本的な使い方

`expect` API の `toMatchSnapshot()` を使います:

```ts
import { expect, it } from 'vitest'

it('toUpperCase', () => {
  const result = toUpperCase('foobar')
  expect(result).toMatchSnapshot()
})
```

初回実行でスナップショットファイルを作ります:

```js
// Vitest Snapshot v1, https://vitest.dev/guide/snapshot.html

exports['toUpperCase 1'] = '"FOOBAR"'
```

スナップショット成果物はコード変更と併せてコミットし、コードレビューの一部として確認します。スナップショットの描画は [`@vitest/pretty-format`](https://npmx.dev/package/@vitest/pretty-format) によるものです。`snapshotFormat` 設定オプションで全体の整形を制御します。

> **Warning:** 非同期の並行テストでスナップショットを使う場合は、ローカルの[テストコンテキスト](/guide/test-context)の `expect` を使い、正しいテストにスナップショットを紐付けてください。

## マッチャーシグネチャ

| Matcher | Type |
| --- | --- |
| `toMatchSnapshot` | `<T>(shape?: Partial<T> \| string, hint?: string) => void` |
| `toMatchInlineSnapshot` | `<T>(shape?: Partial<T> \| string, snapshot?: string, hint?: string) => void` |
| `toMatchFileSnapshot` | `<T>(filepath: string, hint?: string) => Promise<void>` |
| `toThrowErrorMatchingSnapshot` | `(hint?: string) => void` |
| `toThrowErrorMatchingInlineSnapshot` | `(snapshot?: string, hint?: string) => void` |

任意の `hint` 文字列はテスト名に追記されます。Vitest はスナップショット名末尾に必ず番号を付与しますが、1 テスト内の複数スナップショット区別には短い説明ヒントが役立ちます。Vitest は対応 `.snap` ファイル内でスナップショットを名前順に整列します。

### 形状マッチング

オブジェクトの一部だけ厳密一致が必要な場合は形状を指定します:

```ts
test('matches snapshot', () => {
  const data = { foo: new Set(['bar', 'snapshot']) }
  expect(data).toMatchSnapshot({ foo: expect.any(Set) })
})
```

## インラインスナップショット

`toMatchInlineSnapshot()` はスナップショットをテストファイル内に保存します。Vitest はテストファイルを直接書き換えてスナップショット文字列を追加・更新します:

```ts
import { expect, it } from 'vitest'

it('toUpperCase', () => {
  const result = toUpperCase('foobar')
  expect(result).toMatchInlineSnapshot('"FOOBAR"')
})
```

形状マッチングはインラインでも動作します:

```ts
expect(data).toMatchInlineSnapshot(
  { foo: expect.any(Set) },
  `
  {
    "foo": Any<Set>,
  }
`
)
```

## スナップショットの更新

受け取った値が一致しない場合、テストは失敗して差分を表示します。スナップショット更新方法:

- watch モードでは `u` を押して失敗スナップショットを1回更新する。
- CLI で `--update` または `-u` を渡す: `vitest -u`。

### CI での動作

デフォルトでは、CI（`process.env.CI` が真値）ではスナップショットを書き込まず、スナップショットの不一致、不足、陳腐化があると実行は失敗します。詳細は `update` 設定オプションを参照してください。

**陳腐スナップショット**とは、収集済みテストに一致しなくなったスナップショット項目（またはスナップショットファイル）です。通常はテスト削除や改名後に発生します。

## ファイルスナップショット

`toMatchFileSnapshot()` は `.snap` ファイルではなく明示ファイルに照合します。任意の拡張子が使え、内容のエスケープは不要で、シンタックスハイライトも保持されます:

```ts
import { expect, it } from 'vitest'

it('render basic', async () => {
  const result = renderHTML(h('div', { class: 'foo' }))
  await expect(result).toMatchFileSnapshot('./test/basic.output.html')
})
```

`./test/basic.output.html` の内容を比較し、`--update` で書き戻せます。

> **Note:** ファイルシステム操作は非同期のため、`toMatchFileSnapshot()` は `await` します。`await` なしでは `expect.soft` と同様に扱われます。文以降のコードは実行継続し、テスト終了後に Vitest がスナップショット検証して失敗させます。

## エラースナップショット

`toThrowErrorMatchingSnapshot` と `toThrowErrorMatchingInlineSnapshot` は対応する `toMatch*` と同様に動作しますが、`toThrow` と同じ値を期待します:

```ts
expect(() => {
  throw new Error('error')
}).toThrowErrorMatchingInlineSnapshot(`[Error: error]`)
```

## ARIA スナップショット（v4.1.4、実験的機能）

ARIA スナップショットは DOM 要素のアクセシビリティーツリーを取得し、保存済みテンプレートと比較します。Playwright の ARIA スナップショットを基盤とし、ピクセルではなく構造と意味を検証します。DOM スナップショットでは見逃すアクセシビリティー回帰（ラベル不足、壊れたロール、誤った見出しレベル）を検出します。アクセシビリティーツリーから除外される内容（`aria-hidden="true"`、`display: none`）は表示されません。

```ts
import { expect, test } from 'vitest'
import { page } from 'vitest/browser'

test('navigation structure', async () => {
  await expect.element(page.getByRole('navigation')).toMatchAriaInlineSnapshot(`
    - navigation "Main":
      - link "Home":
        - /url: /
      - link "About":
        - /url: /about
  `)
})
```

マッチャー:

| Matcher | Type |
| --- | --- |
| `toMatchAriaSnapshot` | `() => void` |
| `toMatchAriaInlineSnapshot` | `(snapshot?: string) => void` |

- `toMatchAriaSnapshot()` はスナップショットを `.snap` ファイルに保存します。生成項目は `exports[\`login form 1\`] = \`...\`` の形式になります。
- `toMatchAriaInlineSnapshot()` はスナップショットをテストファイル内に保存します。
- スナップショットのワークフローは他スナップショットと共通です。`--update` / `-u`、watch モード更新、CI 動作はすべて同様です。

ブラウザーモードでは、`expect.element()` は DOM をポーリングし、アクセシビリティーツリーが **安定** するまで待ってから評価します。連続 2 回のポーリングで同じ出力になった場合に安定とみなします。初回実行時や `--update` 時は安定結果を書き込みます。安定結果が既存スナップショットと一致しない場合はポーリングをリセットして継続し、アニメーション、非同期描画、遅延状態更新の収束を待てます。

### スナップショット形式

ARIA スナップショットは YAML 風構文を使い、各行がアクセシビリティーツリーのノードです:

```yaml
- role "name" [attribute=value]
```

- `role`: `heading`、`list`、`listitem`、`button` などの ARIA ロール
- `"name"`: 存在する場合のアクセシブル名。引用文字列は厳密一致し、`/patterns/` は正規表現一致する
- `[attribute=value]`: `checked`、`disabled`、`expanded`、`level`、`pressed`、`selected` などのアクセシビリティ状態/プロパティ

テンプレートは **YAML のサブセット**だけ対応します。スカラー、インデントによるネストマッピング、シーケンスに対応します。アンカー、タグ、フローコレクション、複数行スカラーは非対応です。取得テキストは空白正規化されます。改行、`<br>`、タブ、連続空白は単一空白に畳まれます。

```html
<button>Submit</button>
<h1>Welcome</h1>
<input aria-label="Email" />
```

```yaml
- button "Submit"
- heading "Welcome" [level=1]
- textbox "Email"
```

プレーンテキストノードは `- text: Hello world` と描画されます。テキストだけの段落は `- paragraph: Hello world` とインライン描画されます。子は親の下にネストします（`- list:` の下にインデントした `- listitem: ...`）。名前付きの親はコロンの前に名前を含みます（`- navigation "Main":`）。

属性は有効時のみ表示されるため、`[disabled=false]` とはなりません:

| HTML | Snapshot |
| --- | --- |
| `<input type="checkbox" checked aria-label="Agree">` | `- checkbox "Agree" [checked]` |
| `<input type="checkbox" aria-checked="mixed" aria-label="Select all">` | `- checkbox "Select all" [checked=mixed]` |
| `<button aria-disabled="true">Submit</button>` | `- button "Submit" [disabled]` |
| `<button aria-expanded="true">Menu</button>` | `- button "Menu" [expanded]` |
| `<h2>Title</h2>` | `- heading "Title" [level=2]` |
| `<option selected>English</option>` | `- option "English" [selected]` |

### 疑似属性

テストに役立つ非 ARIA の DOM プロパティーは `/` 接頭辞で表します:

- `/url:` — リンク先: `<a href="/">Home</a>` は `- /url: /` を伴う `- link "Home":` と描画される。
- `/placeholder:` — プレースホルダーテキスト。プレースホルダーがアクセシブル名と異なる場合のみ表示される。プレースホルダーがアクセシブル名そのもの（ラベル/`aria-label` なし）の場合は既に名前に含まれるため重複しない。

### マッチング

正規表現は名前と疑似属性値を柔軟に一致させます:

```yaml
- heading /Welcome, .*/
- link "Profile":
    - /url: /https:\/\/example\.com\/.*/
```

> **Warning:** スナップショットは JavaScript 文字列として保存される（インラインはテンプレートリテラル、ディスクは `.snap` ファイル）ため、手書きの正規表現パターン内のバックスラッシュは **二重化** する必要があります。正規表現 `\d+` にはソースで `/item \\d+/` を使います。自動生成・更新されたスナップショットはエスケープを自動処理します。

`/children` ディレクティブは子の比較を制御します:

| Mode | Directive | Behavior |
| --- | --- | --- |
| 部分一致 | _(デフォルト)_ または `/children: contain` | テンプレートの子は順序付き部分列です。余分な実際の子は無視されます |
| 厳密一致 | `/children: equal` | 直接の子は厳密一致する必要があります。子孫は部分一致のままです |
| 深い厳密一致 | `/children: deep-equal` | すべての階層の全子孫が厳密一致する必要があります |

```ts
await expect.element(page.getByRole('main')).toMatchAriaInlineSnapshot(`
  - main:
    - heading "Welcome" [level=1]
`)

await expect.element(page.getByRole('list')).toMatchAriaInlineSnapshot(`
  - list "Features":
    - /children: equal
    - listitem: Feature A
    - listitem: Feature B
    - listitem: Feature C
`)
```

手編集した正規表現パターンは `--update` 後も残ります。一致し続けるパターンは保持され、変更されたリテラル部分だけ上書きされます。

## カスタムシリアライザー

`expect.addSnapshotSerializer` でカスタムシリアライズ処理を追加できます:

```ts
expect.addSnapshotSerializer({
  serialize(val, config, indentation, depth, refs, printer) {
    // `printer` は既存プラグインで値を直列化します
    return `Pretty foo: ${printer(val.foo, config, indentation, depth, refs)}`
  },
  test(val) {
    return val && Object.prototype.hasOwnProperty.call(val, 'foo')
  },
})
```

`snapshotSerializers` 設定オプションでモジュールを指し、暗黙登録もできます。モジュールのデフォルトエクスポートが `SnapshotSerializer` です:

```ts [vitest.config.ts]
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    snapshotSerializers: ['path/to/custom-serializer.ts'],
  },
})
```

Vitest は組み込み JavaScript 型、HTML 要素、ImmutableJS、React 要素用のデフォルトシリアライザーを同梱します。

## カスタムスナップショットマッチャー（v4.1.3、実験的機能）

`vitest` の `Snapshots` は合成可能な関数（`toMatchSnapshot`、`toMatchInlineSnapshot`、`toMatchFileSnapshot`、`toMatchDomainSnapshot`、`toMatchDomainInlineSnapshot`）を公開します。完全なスナップショットライフサイクル（作成、更新、インライン書き換え）を保持しつつ、値を先に変換できます:

```ts
import { expect, test, Snapshots } from 'vitest'

const { toMatchFileSnapshot, toMatchInlineSnapshot, toMatchSnapshot } = Snapshots

expect.extend({
  toMatchTrimmedSnapshot(received: string) {
    return toMatchSnapshot.call(this, received.slice(0, 10))
  },
  toMatchTrimmedInlineSnapshot(received: string, inlineSnapshot?: string) {
    return toMatchInlineSnapshot.call(this, received.slice(0, 10), inlineSnapshot)
  },
  async toMatchTrimmedFileSnapshot(received: string, file: string) {
    return toMatchFileSnapshot.call(this, received.slice(0, 10), file)
  },
})
```

合成関数は `{ pass, message }` を返すため、カスタムマッチャーはメッセージをラップできます:

```ts
const result = toMatchSnapshot.call(this, received.slice(0, length))
return { ...result, message: () => `Trimmed snapshot failed: ${result.message()}` }
```

> **Warning:** インラインスナップショットマッチャーでは、スナップショット引数は最後のパラメーター（またはプロパティーマッチャー使用時は末尾から 2 番目）にする必要があります。Vitest はソースコード内の最後の文字列引数を書き換えるため、スナップショット前の引数は問題ありませんが、後のカスタム引数は非対応です。

> **Note:** ファイルスナップショットマッチャーは `async` にする必要があります。`toMatchFileSnapshot` はマッチャーとテストで await すべき `Promise` を返します。

> **Warning:** カスタムインラインスナップショットマッチャーが非同期の場合、書き換え用の呼び出し位置を推論できません。chai アサーションオブジェクトに `'error'` フラグを設定して呼び出し位置を同期取得します: `chai.util.flag(this.assertion, 'error', new Error())`。

TypeScript ではモジュール拡張で `Assertion` インターフェースを拡張します:

```ts
declare module 'vitest' {
  interface Assertion<T = any> {
    toMatchTrimmedSnapshot: (length: number) => T
    toMatchTrimmedInlineSnapshot: (inlineSnapshot?: string) => T
    toMatchTrimmedFileSnapshot: (file: string) => Promise<T>
  }
}
```

## カスタムスナップショットドメイン（v4.1.4、実験的機能）

**ドメインスナップショットアダプター**はマッチャーの比較パイプライン全体（取得、描画、保存済みスナップショットの解析、意味的マッチング）を所有します。`Captured` と `Expected` に対して総称で、以下を実装します:

```ts
import type { DomainMatchResult, DomainSnapshotAdapter } from '@vitest/snapshot'

const myAdapter: DomainSnapshotAdapter<Captured, Expected> = {
  name: 'my-domain',
  capture(received: unknown): Captured { /* structured data */ },
  render(captured: Captured): string { /* string to store */ },
  parseExpected(input: string): Expected { /* parse stored snapshot */ },
  match(captured: Captured, expected: Expected): DomainMatchResult { /* semantics */ },
}
```

`match` は `DomainMatchResult` を返し、`pass` に加えて任意フィールド 2 つを持ちます:

- `resolved` — テンプレートのレンズを通した取得値です。パターン / 省略部分はテンプレートのパターンを採用し、不一致部分はリテラル取得値を使います。差分の実際側および `--update` 時の書き込み値として使います。`render(capture(received))` にフォールバックします。
- `expected` — 保存済みテンプレートを文字列として再描画したものです。差分の期待側として使います。生スナップショット文字列にフォールバックします。

`Captured` と `Expected` を分けるのは、ユーザーが保存済みスナップショットを手編集できるためです（例: リテラルを正規表現パターンに置換）。`--update` ではユーザーパターンを保持しつつリテラル部分だけ更新します。

`expect.extend` 経由でドメインマッチャーを登録します:

```ts [setup.ts]
import { expect, Snapshots } from 'vitest'

expect.extend({
  toMatchMyDomainSnapshot(received: unknown) {
    return Snapshots.toMatchDomainSnapshot.call(this, myAdapter, received)
  },
  toMatchMyDomainInlineSnapshot(received: unknown, inlineSnapshot?: string) {
    return Snapshots.toMatchDomainInlineSnapshot.call(this, myAdapter, received, inlineSnapshot)
  },
})
```

典型的なアダプターは `key=value` 行を解析し、`/pattern/` 値を正規表現として扱い、サブセットマッチングを許容し（テンプレートにないキーは除外します）、差分と部分更新用に `resolved` / `expected` 文字列を返します。

## Jest との違い

1. コメントヘッダーが異なります: Vitest は Jest の URL ではなく `// Vitest Snapshot v1, https://vitest.dev/guide/snapshot.html` を出力します（移行時のコミット差分に影響します）。
2. `printBasicPrototype` のデフォルトは `false` で、Jest <29 よりすっきりした出力になります。Jest の動作に戻すには `snapshotFormat: { printBasicPrototype: true }` を設定します。
3. Vitest はスナップショット名のカスタムメッセージ区切りにコロン `:` ではなくシェブロン `>` を使います（例: `` exports[`toThrowErrorMatchingSnapshot > hint 1`] ``）。
4. `toThrowErrorMatchingSnapshot` / `toThrowErrorMatchingInlineSnapshot` では、Jest の `Error.message` ではなく `toMatchInlineSnapshot` と同じ値（`[Error: error]`）を出力します。

## 要点

- `toMatchSnapshot` は `.snap` ファイルに書き込みます。`toMatchInlineSnapshot` はテストソースを書き換えます。`toMatchFileSnapshot` は任意ファイルに照合します。
- 並行テストのスナップショットはローカルコンテキストの `expect` を使います。`-u` / `--update`（watch モードでは `u`）でスナップショットを更新します。CI ではスナップショットを書き込まず、不一致で失敗します。
- カスタム型は `expect.addSnapshotSerializer` または `snapshotSerializers` 設定でシリアライズします。
- ARIA スナップショット（v4.1.4）はアクセシビリティー構造を検証し、正規表現、`/children` モード、手編集パターンの保持に対応します。

<!-- Sources: docs/guide/snapshot.md, docs/guide/browser/aria-snapshots.md, docs/api/expect.md (toMatchSnapshot, toMatchInlineSnapshot, toMatchFileSnapshot, toThrowErrorMatchingSnapshot, toThrowErrorMatchingInlineSnapshot, toMatchAriaSnapshot, toMatchAriaInlineSnapshot) -->
