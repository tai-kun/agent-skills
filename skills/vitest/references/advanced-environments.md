---
name: test-environments
description: テスト環境（node、jsdom、happy-dom、edge-runtime）と environmentOptions によるカスタム環境のセットアップ方法を説明します。
---

# テスト環境

Vitest は `environment` オプションで選んだ環境の中でテストファイルを実行します。`environmentOptions` でカスタマイズできます。

## 組み込み環境

- `node` — デフォルトの環境です。素の Node.js として動きます。
- `jsdom` — `jsdom` パッケージ経由で Browser API を使えます。ブラウザをエミュレートします。
- `happy-dom` — `happy-dom` 経由でブラウザをエミュレートします。jsdom より高速ですが、一部の API が不足します。
- `edge-runtime` — `@edge-runtime/vm` パッケージ経由で Vercel の `edge-runtime` をエミュレートします。

> **Note:** 実際のブラウザで、環境のモックなしに統合テストや単体テストを実行したい場合は、Browser Mode も使えます。

> **Warning:** 「環境」は Node.js でテストを実行する場合にだけ存在します。`browser` は Vitest の環境とはみなされません。テストの一部を Browser Mode で実行したい場合は、代わりにテストプロジェクトを作ってください。

## environment

- **型:** `'node' | 'jsdom' | 'happy-dom' | 'edge-runtime' | string`
- **既定値:** `'node'`
- **CLI:** `--environment=<env>`

テストに使う環境です。ブラウザーを想定したテストには `jsdom` または `happy-dom` を、エッジ関数には `edge-runtime` を使います。カスタムオプションは `environmentOptions` で定義します。

### ファイルごとの環境

ファイル先頭の `@vitest-environment` ドックブロックまたはコメントは、そのファイル内のすべてのテストに適用されます：

Docblock形式：

```js
/**
 * @vitest-environment jsdom
 */

test('use jsdom in this test file', () => {
  const element = document.createElement('div')
  expect(element).not.toBeNull()
})
```

コメント形式：

```js
// @vitest-environment happy-dom

test('use happy-dom in this test file', () => {
  const element = document.createElement('div')
  expect(element).not.toBeNull()
})
```

Jest 互換のため、`@jest-environment` も使えます：

```js
/**
 * @jest-environment jsdom
 */

test('use jsdom in this test file', () => {
  const element = document.createElement('div')
  expect(element).not.toBeNull()
})
```

## environmentOptions

- **型:** `Record<'jsdom' | 'happyDOM' | string, unknown>`
- **既定値:** `{}`

現在の環境のセットアップメソッドに渡すオプションです。デフォルトでは `jsdom` と `happyDOM` のオプションだけ設定できます。

```js
// vitest.config.js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environmentOptions: {
      jsdom: {
        url: 'http://localhost:3000',
      },
      happyDOM: {
        width: 300,
        height: 400,
      },
    },
  },
})
```

> **Warning:** オプションは環境ごとに分かれています。jsdom のオプションは `jsdom` キーの下に、happy-dom のオプションは `happyDOM` の下に置くと、同じプロジェクト内で複数の環境を混在できます。

## カスタム環境

カスタム環境を作るには、`vitest-environment-${name}` という名前のパッケージを使うか、`environment` に有効な JS / TS ファイルへのパスを指定します。組み込み以外の名前は、相対 / 絶対ファイルとして読み込まれるか、ベアスペシファイアの場合は `vitest-environment-${name}` パッケージとして読み込まれます。

環境ファイルは `Environment` の形を持つオブジェクトをエクスポートする必要があります：

```ts
import type { Environment } from 'vitest/runtime'

export default <Environment>{
  name: 'custom',
  viteEnvironment: 'ssr',
  // 任意指定です。「vmForks」や「vmThreads」プールを使う場合のみ指定します
  async setupVM() {
    const vm = await import('node:vm')
    const context = vm.createContext()
    return {
      getVmContext() {
        return context
      },
      teardown() {
        // この環境を使うテストがすべて終わった後に呼ばれます
      },
    }
  },
  setup() {
    // 独自のセットアップ処理です
    return {
      teardown() {
        // この環境を使うテストがすべて終わった後に呼ばれます
      },
    }
  },
}
```

`setup()` と `setupVM()` は、その環境を持つすべてのテストが終わった後に実行される `teardown` コールバックを含むオブジェクトを返します。

> **Warning:** Vitest は環境オブジェクトに `viteEnvironment` オプションを求めます（デフォルトでは Vitest の環境名にフォールバックします）。`ssr`、`client`、または任意のカスタム Vite 環境名でなければならず、ファイルを処理する Vite 環境を決めます。

> **Note:** `viteEnvironment` フィールドは Vite Environment API で定義される環境に対応します。デフォルトで Vite は `client`（ブラウザ）と `ssr`（サーバー）環境を公開します。

## 組み込み環境の拡張

デフォルトの Vitest 環境は `vitest/runtime` エントリー経由で使えます（`vitest/environments` エントリーは `builtinEnvironments` も公開しています）：

```ts
import { builtinEnvironments, populateGlobal } from 'vitest/runtime'

console.log(builtinEnvironments) // { jsdom, 'happy-dom', node, 'edge-runtime' }
```

`populateGlobal` はオブジェクトのプロパティをグローバル名前空間に移動します。既存の環境を拡張したい場合に役立ちます：

```ts
interface PopulateOptions {
  // クラスでない関数をグローバル名前空間に束縛するかどうかです
  bindFunctions?: boolean
}

interface PopulateResult {
  // コピーされた全キーの一覧です（元のオブジェクトに値がなくても含みます）
  keys: Set<string>
  // キーで上書きされた可能性がある元オブジェクトの対応表です
  // これらの値は `teardown` 関数内で返せます
  originals: Map<string | symbol, any>
}

export function populateGlobal(global: any, original: any, options: PopulateOptions): PopulateResult
```

## 注意点

`jsdom` や `happy-dom` を使う場合、Vitest は CSS やアセットのインポート時に Vite と同じ規則に従います。外部依存のインポートが `unknown extension .css` で失敗する場合は、インポートチェーン全体をインライン化するため、すべてのパッケージを `server.deps.inline` に追加してください：

```
source code -> package-1 -> package-2 -> package-3
// package-1、package-2、package-3 を server.deps.inline に追加します
```

外部依存内での CSS やアセットの `require` は自動で解決されます。

`jsdom` 環境は現在の JSDOM インスタンスと同じグローバル `jsdom` 変数を公開します。TypeScript に認識させるには、`types` に `vitest/jsdom` を追加してください：

```json
{
  "compilerOptions": {
    "types": ["vitest/jsdom"]
  }
}
```

## 要点

- `environment` で `node`（デフォルト）、`jsdom`、`happy-dom`、`edge-runtime`、またはカスタム環境を選びます。
- ファイルごとに `// @vitest-environment <name>`、ドックブロック、または `@jest-environment` で環境を上書きできます。
- `environmentOptions` は環境名（`jsdom`、`happyDOM`、またはカスタム）をキーにします。プロジェクト内で環境を混在できます。
- カスタム環境は `vitest-environment-<name>` またはファイルパスから `{ name, viteEnvironment, setup, setupVM? }` をエクスポートします。
- `viteEnvironment`（`ssr` / `client` / カスタム）は必須です。Vite のファイル処理を制御します。
- `vitest/runtime` の `builtinEnvironments` と `populateGlobal` で組み込みを再利用できます。
- Browser Mode は環境ではありません。代わりにテストプロジェクトを使ってください。

<!-- Sources: docs/guide/environment.md, docs/config/environment.md, docs/config/environmentoptions.md -->
