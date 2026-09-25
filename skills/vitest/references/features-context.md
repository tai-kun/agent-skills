---
name: features-context
description: test.extend によるテストコンテキストとフィクスチャ、onCleanup、フィクスチャスコープ、注入フィクスチャ、test.override、型安全フックを説明します。
---

# テストコンテキストとフィクスチャ

[Playwright Fixtures](https://playwright.dev/docs/test-fixtures) に着想を得た Vitest のテストコンテキストでは、テストで使うユーティリティー、状態、フィクスチャを定義できます。すべてのテストコールバックの第 1 引数がテストコンテキストになります。

```ts
import { it } from 'vitest'

it('should work', ({ task }) => {
  // テスト名を出力します
  console.log(task.name)
})
```

## 組み込みテストコンテキスト

### `task`

テストに関するメタデータを含む読み取り専用オブジェクトです。

### `expect`

現在のテストに束縛された `expect` API です。グローバルの `expect` では追跡できないため、並行スナップショットテストでは必須です:

```ts
it('math is easy', ({ expect }) => {
  expect(2 + 2).toBe(4)
})

it.concurrent('math is easy', ({ expect }) => {
  expect(2 + 2).toMatchInlineSnapshot()
})

it.concurrent('math is hard', ({ expect }) => {
  expect(2 * 2).toMatchInlineSnapshot()
})
```

### `skip`

```ts
function skip(note?: string): never
function skip(condition: boolean, note?: string): void
```

以降のテスト実行をスキップし、テストをスキップ済みとしてマークします。Vitest 3.1 以降は真偽値を受け取り、条件付きでスキップできます:

```ts
it('math is hard', ({ skip }) => {
  skip()
  expect(2 + 2).toBe(5)
})

it('math is hard', ({ skip, mind }) => {
  skip(mind === 'foggy')
})
```

### `annotate` (v3.2.0)

```ts
function annotate(message: string, attachment?: TestAttachment): Promise<TestAnnotation>
function annotate(message: string, type?: string, attachment?: TestAttachment): Promise<TestAnnotation>
```

レポーターが表示するテスト注釈を追加します:

```ts
test('annotations API', async ({ annotate }) => {
  await annotate('https://github.com/vitest-dev/vitest/pull/7953', 'issues')
})
```

### `signal` (v3.2.0)

テストがタイムアウトした、ユーザーが Ctrl+C でキャンセルした、`vitest.cancelCurrentRun` がプログラムから呼ばれた、または `bail` 設定時に他の並行テストが失敗した際に Vitest が中断する [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) です:

```ts
it('stop request when test times out', async ({ signal }) => {
  await fetch('/resource', { signal })
}, 2000)
```

### `onTestFailed` と `onTestFinished`

現在のテストに束縛されたフックです。特定テストだけに処理を適用したい並行テストで役立ちます。

## テストコンテキストの拡張

`test.extend` はフィクスチャ（テスト用に自動セットアップ・破棄される再利用可能な値）を持つカスタムテスト API を作ります。ビルダーパターン（推奨）とオブジェクト構文（Playwright 互換）の 2 構文があります。

## ビルダーパターン（v4.1.0）

自動型推論を提供します。各フィクスチャの型は戻り値から推論されるため、手動の型宣言は不要です。

```ts [my-test.ts]
import { test as baseTest, expect } from 'vitest'

export const test = baseTest
  // 単純な値です。型は { port: number; host: string } と推論されます
  .extend('config', { port: 3000, host: 'localhost' })
  // 関数フィクスチャーです。型は戻り値から推論されます
  .extend('server', async ({ config }) => {
    return `http://${config.host}:${config.port}`
  })

test('server uses correct port', ({ config, server }) => {
  expect(server).toBe('http://localhost:3000')
  expect(config.port).toBe(3000)
})
```

### `onCleanup` によるセットアップとクリーンアップ

`onCleanup` はフィクスチャのスコープ終了後に実行される破棄処理を登録します:

```ts
export const test = baseTest
  .extend('database', { scope: 'file' }, async ({}, { onCleanup }) => {
    const db = await createDatabase()
    await db.connect()
    onCleanup(async () => {
      await db.disconnect()
    })
    return db
  })
  .extend('user', async ({ database }, { onCleanup }) => {
    const user = await database.createTestUser()
    onCleanup(async () => {
      await database.deleteUser(user.id)
    })
    return user
  })
```

> **Warning:** `onCleanup` は 1 フィクスチャにつき 1 回だけ呼び出せます。複数リソースは 1 つの関数にまとめるか、フィクスチャを分割してください。分離の明確さと依存の明示のため、分割が推奨されます。

### フィクスチャオプション

`.extend()` の第 2 引数はオプションを受け取ります。テストスコープのフィクスチャでは省略できます:

```ts
const test = baseTest
  // 自動フィクスチャーです。未使用でも全テストで実行されます
  .extend('metrics', { auto: true }, ({}, { onCleanup }) => {
    const metrics = new MetricsCollector()
    metrics.start()
    onCleanup(() => metrics.stop())
    return metrics
  })
  // ワーカースコープのフィクスチャーです。ワーカーごとに 1 回初期化されます
  .extend('config', { scope: 'worker' }, () => loadConfig())
  // ファイルスコープのフィクスチャーです。ファイルごとに 1 回初期化されます
  .extend('database', { scope: 'file' }, async ({ config }, { onCleanup }) => {
    const db = await createDatabase(config)
    onCleanup(() => db.close())
    return db
  })
  // 注入フィクスチャーです。プロジェクト設定で上書きできます
  .extend('baseUrl', { injected: true }, () => 'http://localhost:3000')
```

### 他フィクスチャへのアクセス

各フィクスチャは第 1 パラメーター経由で以前に定義されたフィクスチャにアクセスできます。関数フィクスチャと非関数フィクスチャのどちらでも同様です:

```ts
const test = baseTest
  .extend('config', { apiUrl: 'https://api.example.com', port: 3000 })
  .extend('client', ({ config }) => new ApiClient(config.apiUrl))
  .extend('user', async ({ client }) => await client.getCurrentUser())
```

## オブジェクト構文（Playwright 互換）

クリーンアップコードは `use()` コールバックの **後** に実行されます。TypeScript は `use()` から型を推論できないため、手動で型宣言する必要があります。タプル形式 `[fixture, options]` でフィクスチャオプションを設定します:

```ts
const test = baseTest.extend<{ page: Page; baseUrl: string }>({
  page: async ({}, use) => {
    const page = await browser.newPage()
    await use(page) // ここでテストが実行されます
    await page.close() // テスト後のクリーンアップです
  },
  baseUrl: 'http://localhost:3000',
  // タプル形式です: [fixture, options]
  database: [
    async ({}, use) => {
      const db = await createDatabase()
      await use(db)
      await db.close()
    },
    { scope: 'file' },
  ],
  url: ['/default', { injected: true }],
})
```

## フィクスチャ初期化

フィクスチャは使う状況に応じて遅延初期化されます。下例の `database` は分割代入したテストでのみ作られます:

```ts
const test = baseTest
  .extend('database', async () => createDatabase())
  .extend('cache', async () => createCache())

test('no fixtures needed', () => {}) // database は実行されません
test('only cache', ({ cache }) => {}) // database は実行されません
test('needs database', ({ database }) => {}) // database は実行されます
```

> **Warning:** フィクスチャ関数でもテスト関数でも、常にコンテキストを分割代入してください（`{ database }`）。`context.database` は動作しません。

## 拡張済みテストの拡張

拡張済みテストをさらに拡張してフィクスチャを追加できます。1 つのチェーン内でビルダー構文とオブジェクト構文を混在できます:

```ts
import { test as dbTest } from './my-test.js'

export const test = dbTest
  .extend('user', ({ database }) => database.createUser())

const mixed = dbTest
  .extend<{ apiKey: string }>({ apiKey: 'test-key-123' }) // オブジェクト構文です
  .extend('client', ({ apiKey }) => new ApiClient(apiKey)) // ビルダー形式で、型は推論されます
```

## フィクスチャスコープ（v3.2.0）

デフォルトでフィクスチャはテストごとに初期化されます。`scope` オプションで共有できます。`'test'`（デフォルト）、`'file'`、`'worker'` があります。

> **Warning:** スコープ指定のないフィクスチャは `test` フィクスチャで、`worker` や `file` スコープ内では使えません。使うにはスコープを手動指定してください。非テストフィクスチャは `describe` ブロック内で上書きできず（例外をスローします）、モジュールトップレベルで上書きするか、`injected` オプションとプロジェクト設定を使います。非分離モードでは、`worker` フィクスチャの上書きは上書き後に実行される全テストファイルの値に影響します。

- **テストスコープ（デフォルト）:** 各テストで新規作成されます。組み込みテストコンテキストにアクセスできます:

```ts
const test = baseTest
  .extend('counter', () => ({ value: 0 }))
  .extend('testInfo', ({ task }) => ({ name: task.name })) // コンテキストを読めます

test('first test', ({ counter }) => {
  counter.value++
  expect(counter.value).toBe(1)
})
test('second test', ({ counter }) => expect(counter.value).toBe(0)) // 新しいインスタンスです
```

- **ファイルスコープ:** テストファイルごとに 1 回初期化されます。ファイル内の全テストでインスタンスを共有します。
- **ワーカースコープ:** ワーカープロセスごとに 1 回初期化されます:

```ts
const test = baseTest
  .extend('config', { scope: 'worker' }, () => loadExpensiveConfig())
```

> **Note:** デフォルトでは各ファイルが別ワーカーで実行されるため、`file` と `worker` スコープは同じように動作します。分離を無効化すると、ワーカー数は `maxWorkers` で制限され、ワーカースコープのフィクスチャは同一ワーカー内のファイル間で共有されます。`vmThreads` や `vmForks` では各ファイルが独自の VM コンテキストを持つため、`scope: 'worker'` は `scope: 'file'` と同様に動作します。

### スコープ階層

フィクスチャは同一または上位（長寿命）のスコープのフィクスチャにだけアクセスできます:

| Fixture Scope | Can Access |
| --- | --- |
| `worker` | 他の worker フィクスチャのみ |
| `file` | worker + file フィクスチャ |
| `test` | worker + file + test フィクスチャ + テストコンテキスト |

```ts
const test = baseTest
  .extend('config', { scope: 'worker' }, () => ({ apiUrl: 'https://api.example.com' }))
  .extend('database', { scope: 'file' }, async ({ config }, { onCleanup }) => {
    const db = await createDatabase(config.apiUrl) // ファイルフィクスチャー → ワーカーフィクスチャー
    onCleanup(() => db.close())
    return db
  })
  .extend('user', async ({ database, task }) => database.createUser(task.name)) // テスト → ファイル + コンテキスト
```

> **Note:** 組み込みテストコンテキスト（`task`、`expect`、`skip` など）にアクセスできるのはテストスコープのフィクスチャだけです。worker や file スコープのフィクスチャは特定のテスト外で実行されます。ファイルスコープのフィクスチャでファイルパスが必要な場合は `expect.getState().testPath` を使います。

### 型安全なスコープアクセス（v3.2.0）

ビルダーパターンはコンパイル時にスコープベースのアクセスを強制します。オブジェクト構文では `$worker`、`$file`、`$test` キーでスコープを宣言します:

```ts
const test = baseTest.extend<{
  $worker: { config: Config }
  $file: { database: Database }
  $test: { user: User }
}>({
  config: [async ({}, use) => use(loadConfig()), { scope: 'worker' }],
  database: [async ({ config }, use) => use(await createDatabase(config)), { scope: 'file' }],
  user: async ({ database }, use) => {
    const user = await database.createUser()
    await use(user)
    await database.deleteUser(user.id)
  },
})
```

## デフォルトフィクスチャ（注入）

Vitest 3 以降、`{ injected: true }` で宣言したフィクスチャはプロジェクトごとに異なる値を受け取れます。プロジェクトの `provide` 設定にキーがない場合はデフォルト値を使います:

```ts [fixtures.test.ts]
const test = baseTest.extend('url', { injected: true }, '/default')
// url は "project-new" では "/default"、"project-full" では "/full"、"project-empty" では "/empty" になります
```

```ts [vitest.config.ts]
export default defineConfig({
  test: {
    projects: [
      { test: { name: 'project-new' } },
      { test: { name: 'project-full', provide: { url: '/full' } } },
      { test: { name: 'project-empty', provide: { url: '/empty' } } },
    ],
  },
})
```

## フィクスチャ値の上書き（v4.1.0）

`test.override` は特定スイートとその子に限定してフィクスチャ値を置換します。指定のないオプションは自動継承されます。フィクスチャの `scope` と `auto` オプションは上書きできません。上書きはネストしたスイートに継承され、再上書きできます。外側のスイートは以前の値を保持します。

```ts
const test = baseTest
  .extend('config', { port: 3000, host: 'localhost' })
  .extend('server', ({ config }) => `http://${config.host}:${config.port}`)

describe('production environment', () => {
  // 新しい静的値で上書きします（チェーン可能です）
  test
    .override('config', { port: 8080, host: 'api.example.com' })
    .override('debug', false)
  test('uses production config', ({ server }) => expect(server).toBe('http://api.example.com:8080'))
})

describe('with custom server', () => {
  // 関数による上書きでは他のフィクスチャーにアクセスできます
  test.override('server', ({ config }) => `https://${config.host}:${config.port}/v2`)
})
```

関数上書きは `onCleanup` に対応します（例: `test.override('database', async ({ config }, { onCleanup }) => { ... })`）。オブジェクト構文では複数フィクスチャを一括上書きします（`test.override({ config: { port: 4000, host: 'test.local' } })`）。

> **Warning:** `test.override` 内で新規フィクスチャは導入できません。その場合は `test.extend` を使ってください。
>
> **Note:** `test.scoped` は非推奨です。`test.override` を使います（まだ動作しますが、将来バージョンで削除されます）。

## 型安全フック

拡張した `test` オブジェクトは拡張コンテキストを認識するフックを提供します:

```ts
const test = baseTest
  .extend('counter', { value: 0, increment() { this.value++ } })

test.beforeEach(({ counter }) => counter.increment())
test.afterEach(({ counter }) => console.log('Final count:', counter.value))
```

### フィクスチャ付きスイートレベルフック（v4.1.0）

拡張した `test` は `beforeAll`、`afterAll`、`aroundAll` も提供し、ファイルスコープとワーカースコープのフィクスチャにアクセスできます:

```ts
const test = baseTest
  .extend('database', { scope: 'file' }, async ({}, { onCleanup }) => {
    const db = await createDatabase()
    onCleanup(() => db.close())
    return db
  })

test.aroundAll(async (runSuite, { database }) => database.transaction(runSuite))
test.beforeAll(async ({ database }) => database.createUsers())
test.afterAll(async ({ database }) => database.removeUsers())
```

> **Warning:** スイートレベルフック（`beforeAll`、`afterAll`、`aroundAll`）はカスタムフィクスチャを参照するため、`test.extend()` が返した `test` オブジェクト上で呼び出す必要があります。`vitest` 由来のグローバルフックからはアクセスできません。
>
> **Note:** スイートレベルフックはファイルスコープとワーカースコープのフィクスチャ（`auto` フィクスチャを含む）にだけアクセスできます。スイートレベルフックでテストスコープのフィクスチャにアクセスするとエラーになります。

## 要点

- 自動型推論と `onCleanup` ベースの破棄のため、ビルダーパターン（v4.1.0）を優先してください。
- フィクスチャは遅延評価されます。分割代入したフィクスチャだけ初期化されます。必ず分割代入します（`({ database })`）。
- 高コストな共有リソースには `scope: 'file' | 'worker'` を使います。テストスコープがデフォルトで、組み込みコンテキストにアクセスできます。
- `test.override`（v4.1.0）はスイート単位でフィクスチャ値を変更します。`injected: true` + プロジェクトの `provide` でプロジェクト単位の値を供給します。
- フックにフィクスチャが必要な場合はグローバルではなく `test.beforeAll` / `test.afterAll` / `test.aroundAll` を使います。

<!-- Sources: docs/guide/test-context.md -->
