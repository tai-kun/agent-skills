---
name: vitest-configuration
description: vite.config や vitest.config で defineConfig を使った Vitest の設定と主要なテストオプションを説明します。
---

# 設定

Vitest は Vite を基盤としており、設定形式・トランスフォーマー・リゾルバー・プラグインを共有しています。テストオプションは `test` プロパティー配下に置き、それ以外は通常の Vite 設定として扱います。

## インストールと最初のテスト

Vitest は Vite >= v6.0.0 と Node >= v20.0.0 を必要とします。`npm install -D vitest`（または `yarn add -D vitest`、`pnpm add -D vitest`、`bun add -D vitest`）でインストールします。

```js
// sum.test.js
import { expect, test } from 'vitest'
import { sum } from './sum.js'

test('adds 1 + 2 to equal 3', () => {
  expect(sum(1, 2)).toBe(3)
})
```

> **Note:** デフォルトでは、ファイル名に `.test.` または `.spec.` を含める必要があります。

> **Warning:** パッケージマネージャーに Bun を使う場合は、`bun test` ではなく `bun run test` で実行してください。`bun test` では Bun 独自のテストランナーが起動します。

`vitest` は開発環境ではウォッチモード、CI では実行モードで起動します。1 回だけ実行するには `vitest run` を使います。CLI の詳細は `core-cli.md` を参照してください。

## 設定ファイル

Vitest はデフォルトで `vite.config.*` を読むため、既存の Vite プラグインや設定がそのまま使えます。テスト固有の設定を行うには:

- `vitest.config.ts` を作成します。優先度が高く、`vite.config.ts` の設定を**上書き**します。`vite.config` 内のすべてのオプションは**無視**されます。Vitest は慣例的な JS と TS の拡張子すべてに対応しますが、`json` には対応しません。
- CLI に `--config` を渡します。例:`vitest --config ./path/to/vitest.config.ts`。
- `vite.config.ts` 内で条件付き設定を行うには `process.env.VITEST` または `defineConfig` の `mode` プロパティーを使います（`--mode` で上書きしない限り `test`/`benchmark` になります）。`VITEST` はテスト内の `import.meta.env` でも公開されます。

Vite を使わない場合は `vitest/config` から `defineConfig` をインポートします:

```js
// vitest.config.js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // ... ここにオプションを指定します。
  },
})
```

既存の Vite 設定がある場合、以下の一行参照を追加して `test` の型を取得します:

```js
// vite.config.js
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    // ... ここにオプションを指定します。
  },
})
```

`define` や `resolve.alias` のような Vite オプションはトップレベルに定義し、`test` 内には置かないでください。

## デフォルトの拡張

`configDefaults` で Vitest のデフォルトオプションを取得して拡張できます:

```js
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, 'packages/template/*'],
  },
})
```

別の Vite 設定を拡張するには `mergeConfig` を使います。Vite 設定が関数の場合、マージ前に設定環境を渡して呼び出します:`defineConfig(configEnv => mergeConfig(viteConfig(configEnv), defineConfig({ ... })))`。

```js
// vitest.config.js
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(viteConfig, defineConfig({
  test: {
    exclude: ['packages/template/*'],
  },
}))
```

## 依存関係の自動インストール

Vitest は不足している特定の依存関係があるとインストールを促します。これを無効にするには環境変数 `VITEST_SKIP_INSTALL_CHECKS=1` を使います。

## プロジェクトにおける設定スコープ

プロジェクト設定内では対応しないオプションがあり、リファレンスではルートアイコン付きで示しています。これらはルートの Vitest 設定でのみ設定できます。

## globals

- **型:** `boolean`
- **既定値:** `false`
- **CLI:** `--globals`, `--no-globals`, `--globals=false`

デフォルトでは Vitest は明示性のためグローバル API を提供しません。設定で `globals: true` にするか `--globals` を渡すと、Jest のように `describe`、`it`、`expect` などをグローバルに使えます。

```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
  },
})
```

> **Note:** `@testing-library/react` のようなライブラリーは、自動クリーンアップのためグローバルが存在することに依存します。

グローバル API で TypeScript を動作させるには、`tsconfig.json` の `types` に `vitest/globals` を追加します:

```json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

`typeRoots` を再定義する場合、`vitest/globals` を見つけられるよう `node_modules` を戻してください:

```json
{
  "compilerOptions": {
    "typeRoots": ["./types", "./node_modules/@types", "./node_modules"],
    "types": ["vitest/globals"]
  }
}
```

## environment

- **型:** `'node' | 'jsdom' | 'happy-dom' | 'edge-runtime' | string`
- **既定値:** `'node'`
- **CLI:** `--environment=<env>`

テストに使う環境を指定します。デフォルトは Node.js です。Web アプリでは `jsdom` や `happy-dom` を、エッジ関数では `edge-runtime` を使います。環境固有のオプションは `environmentOptions` に置きます。

> **Note:** ブラウザーモードを使うと、環境をモックせずにブラウザーで統合テストや単体テストを実行できます。

ファイル先頭の `@vitest-environment` ドックブロックまたはコメントで、そのファイルだけ別の環境を使えます。互換性のため Jest の `@jest-environment` にも対応しています:

```js
/**
 * @vitest-environment jsdom
 */

test('use jsdom in this test file', () => {
  const element = document.createElement('div')
  expect(element).not.toBeNull()
})
```

```js
// @vitest-environment happy-dom
```

カスタム環境: 組み込み以外の名前では、相対/絶対ファイルを読み込むか、ベア指定子ならパッケージ `vitest-environment-${name}` を読み込みます。ファイルは `Environment` 型のオブジェクトをエクスポートする必要があります:

```ts
// environment.js
import type { Environment } from 'vitest'

export default <Environment>{
  name: 'custom',
  viteEnvironment: 'ssr',
  setup() {
    // カスタムセットアップを行います
    return {
      teardown() {
        // この環境のすべてのテスト実行後に呼ばれます
      },
    }
  },
}
```

`viteEnvironment` は Vite Environment API で定義される環境に対応します（ブラウザー用は `client`、サーバー用は `ssr`）。拡張用に `builtinEnvironments` を `vitest/environments` エントリーから公開しています。

> **Note:** jsdom 環境は現在の JSDOM インスタンスに等しい `jsdom` グローバルを公開します。TypeScript に認識させるため `tsconfig.json` の `types` に `vitest/jsdom` を追加してください。

## include

- **型:** `string[]`
- **既定値:** `['**/*.{test,spec}.?(c|m)[jt]s?(x)']`
- **CLI:** `vitest [...include]`, `vitest **/*.test.js`

テストファイルにマッチする glob パターンで、`root`（デフォルトは `process.cwd()`）からの相対で `tinyglobby` により解決されます。

> **Note:** カバレッジ使用時、Vitest はテストファイルの `include` パターンをカバレッジのデフォルト `exclude` パターンに自動追加します。`coverage.exclude` を参照してください。

```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [
      './test',
      './**/*.{test,spec}.tsx?',
    ],
  },
})
```

よくある用途はテストプロジェクトの絞り込みです（各プロジェクトで `name` と `include` を設定します。たとえば、`unit` には `./test/unit/*.test.js`、`e2e` には `./test/e2e/*.test.js` を指定します）。

> **Warning:** `include` は Vitest のデフォルトを上書きします。拡張するには `configDefaults.include` をスプレッドしてください:

```js
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [
      ...configDefaults.include,
      './test',
      './**/*.{test,spec}.tsx?',
    ],
  },
})
```

## exclude

- **型:** `string[]`
- **既定値:** `['**/node_modules/**', '**/.git/**']`
- **CLI:** `vitest --exclude "**/excluded-file" --exclude "*/other-files/*.js"`

テストファイルから除外する glob パターンで、`root` からの相対で `tinyglobby` により解決されます。

> **Warning:** このオプションはカバレッジに影響しません。その用途は `coverage.exclude` を使ってください。また、CLI 経由で渡しても設定を上書きしない唯一のオプションです。各 `--exclude` glob は設定の `exclude` に追加されます。

```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      './temp/**',
    ],
  },
})
```

> **Note:** 設定で手動指定した `exclude` はデフォルト値を置き換えます。`configDefaults.exclude` で拡張してください（上記 `include` と同様のパターン）。

## setupFiles

- **型:** `string | string[]`

`root` からの相対パスとして解決されます。各_テストファイル_の前に同じプロセスで実行されます。すべてのテストファイルはデフォルトで並列実行されるため、順序は `sequence.setupFiles` で制御します。Vitest はこれらのファイルからのエクスポートを無視します。

> **Warning:** セットアップファイルはテストと同じプロセスで実行されます。一方、`globalSetup` はテストワーカーの生成前にメインスレッドで 1 回だけ実行されます。

> **Note:** セットアップファイルを編集すると自動的にすべてのテストが再実行されます。

重いバックグラウンド処理には `process.env.VITEST_POOL_ID`（整数風文字列）を使ってワーカーを区別し、負荷を分散できます。

> **Warning:** `isolate` 無効時は、インポート済みモジュールはキャッシュされますが、セットアップファイル自体は各テストファイルの前に再実行されるため、毎回同じグローバルオブジェクトに触れます。高コストな初期化はガードしてください:

```ts
import { config } from '@some-testing-lib'

if (!globalThis.setupInitialized) {
  config.plugins = [myCoolPlugin]
  computeHeavyThing()
  globalThis.setupInitialized = true
}

// フックは各テストファイルの前にリセットされる
afterEach(() => {
  cleanup()
})
```

## testTimeoutとhookTimeout

- `testTimeout`: `number`、デフォルトは Node.js で `5_000`、`browser.enabled` が `true` なら `15_000`。CLI: `--test-timeout=5000`、`--testTimeout=5000`。
- `hookTimeout`: `number`、デフォルトは Node.js で `10_000`、`browser.enabled` が `true` なら `30_000`。CLI: `--hook-timeout=10000`、`--hookTimeout=10000`。

テスト/フックのデフォルトタイムアウト（ミリ秒）です。`0` でタイムアウトを完全に無効にします。

## retry

失敗したテストを指定回数リトライします。

- **型:** `number | { count?: number, delay?: number, condition?: RegExp }`
- **既定値:** `0`
- **CLI:** `--retry <times>`、`--retry.count <times>`、`--retry.delay <ms>`、`--retry.condition <pattern>`

```bash
vitest --retry 3

vitest --retry.count 3 --retry.delay 500 --retry.condition 'ECONNREFUSED|timeout'
```

高度なオブジェクトオプション（v4.1.0）:

```ts
export default defineConfig({
  test: {
    retry: {
      count: 3, // リトライ回数
      delay: 1000, // リトライ間の遅延（ミリ秒）
      condition: /ECONNREFUSED|timeout/i, // リトライ対象エラーを判定する正規表現
    },
  },
})
```

- `count`: 失敗時のリトライ回数。デフォルト `0`。
- `delay`: リトライ間の遅延（ミリ秒）。レート制限のある API に有用です。デフォルト `0`。
- `condition`: エラーメッセージに照合する正規表現、またはエラーを受け取り真偽値を返す関数。

> **Warning:** `condition` 関数は設定ファイルではなくテストファイル内で直接定義する必要があります。設定はワーカースレッド用にシリアライズされるためです。

```ts
// テストファイル内
import { test } from 'vitest'

test('with function condition', { retry: { count: 2, condition: error => error.message.includes('Network') } }, () => {
  // テストコード
})
```

リトライオプションは同じオブジェクト形式でテストやスイートごとに上書きできます。例:`describe('flaky tests', { retry: { count: 2, delay: 100 } }, ...)`。`core-test-api.md` を参照してください。

## pool

- **型:** `'threads' | 'forks' | 'vmThreads' | 'vmForks'`
- **既定値:** `'forks'`
- **CLI:** `--pool=threads`

テストの実行に使うプールを指定します。

- `threads`: マルチスレッドです。`process.chdir()` のようなプロセス API は使えません。ネイティブライブラリー（例:`Prisma`、`bcrypt`、`canvas`）は複数スレッドでセグフォールトを起こしうるため、代わりに `forks` を使ってください。
- `forks`: `worker_threads` の代わりに `child_process` を使う点を除き `threads` と同様です。メインプロセスとの通信は遅くなりますが、`process.chdir()` のようなプロセス API が使えます。
- `vmThreads`: `threads` プール内の VM コンテキスト（サンドボックス）でテストを実行します。高速ですが、VM モジュールは ESM で不安定でありテストがメモリーリークします。`vmMemoryLimit` を調整してください。ネイティブモジュールのグローバルが異なる（`err instanceof Error` が `false` になりうる）、ES モジュールは無期限にキャッシュされる、グローバルアクセスが遅い、といった注意点があります。
- `vmForks`: `child_process` を使う点を除き `vmThreads` と同様です。同じ注意点に加え、メインプロセスとの通信が遅くなります。

## isolate

- **型:** `boolean`
- **既定値:** `true`
- **CLI:** `--no-isolate`、`--isolate=false`

テストを分離した環境で実行します。`vmThreads` と `vmForks` プールには効果がありません。コードが副作用に依存しない場合（`node` 環境のプロジェクトでは通常該当します）、分離を無効にすると性能が向上しうります。

> **Note:** Vitest プロジェクトを使うと、プロジェクトごとに分離を無効にできます。

<!-- Sources: docs/config/index.md, docs/guide/index.md, docs/config/globals.md, docs/config/environment.md, docs/config/include.md, docs/config/exclude.md, docs/config/setupfiles.md, docs/config/testtimeout.md, docs/config/hooktimeout.md, docs/config/retry.md, docs/config/pool.md, docs/config/isolate.md -->
