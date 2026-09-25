---
name: core-hooks
description: Vitest のライフサイクルフック（beforeEach、afterEach、beforeAll、afterAll、aroundEach、aroundAll）とテストフックを説明します。
---

# フック

これらの関数はテストのライフサイクルにフックし、セットアップとテアダウンの重複を避けます。現在のコンテキストに適用され、トップレベルで使えばファイル全体に、`describe` ブロック内で使えば現在のスイートに適用されます。Vitest が型チェッカーとして動作する場合は呼ばれません。

テストフックはデフォルトでスタック順（「after」系は逆順）に呼ばれます。この動作は [`sequence.hooks`](https://vitest.dev/config/sequence#sequence-hooks) で設定します。

## beforeEach

```ts
function beforeEach(
  body: (context: TestContext) => unknown,
  timeout?: number,
): void
```

現在のスイート内の各テストの前に呼ばれるコールバックを登録します。Promise を返すと、Vitest は解決するまで待ってからテストを実行します。任意のタイムアウト（ms）はデフォルト 10 秒で、`hookTimeout` で全体を設定できます。

```ts
import { beforeEach } from 'vitest'

beforeEach(async () => {
  await stopMocking()
  await addUser({ name: 'John' })
})
```

`beforeEach` は任意のクリーンアップ関数も返せます（`afterEach` と同等）:

```ts
beforeEach(async () => {
  await prepareSomething()

  // クリーンアップ関数。各テスト実行後に 1 回呼ばれます
  return async () => {
    await resetSomething()
  }
})
```

## afterEach

```ts
function afterEach(
  body: (context: TestContext) => unknown,
  timeout?: number,
): void
```

現在のスイート内の各テスト完了後に呼ばれるコールバックを登録します。Promise を返すと、Vitest は解決するまで待ってから続行します。任意のタイムアウトはデフォルト 10 秒（`hookTimeout`）です。

```ts
import { afterEach } from 'vitest'

afterEach(async () => {
  await clearTestingData()
})
```

> **Note:** テスト実行中にテスト終了後の状態を片付けるには `onTestFinished` も使えます。

## beforeAll

```ts
function beforeAll(
  body: (context: ModuleContext) => unknown,
  timeout?: number,
): void
```

現在のスイート内のすべてのテスト開始前に 1 回呼ばれるコールバックを登録します。Promise を返すと、Vitest はテスト実行前に待機します。任意のタイムアウトはデフォルト 10 秒（`hookTimeout`）です。

```ts
import { beforeAll } from 'vitest'

beforeAll(async () => {
  await startMocking()

  // クリーンアップ関数。すべてのテスト実行後に 1 回呼ばれます（afterAll と同等）
  return async () => {
    await stopMocking()
  }
})
```

## afterAll

```ts
function afterAll(
  body: (context: ModuleContext) => unknown,
  timeout?: number,
): void
```

現在のスイート内のすべてのテスト実行後に 1 回呼ばれるコールバックを登録します。Promise を返すと、Vitest は続行前に待機します。任意のタイムアウトはデフォルト 10 秒（`hookTimeout`）です。

```ts
import { afterAll } from 'vitest'

afterAll(async () => {
  await stopMocking()
})
```

## aroundEach

```ts
function aroundEach(
  body: (
    runTest: () => Promise<void>,
    context: TestContext,
  ) => Promise<void>,
  timeout?: number,
): void
```

現在のスイート内の各テストをラップするコールバックを登録します。コールバックは `runTest` 関数を受け取り、テスト実行のため**必ず**呼ぶ必要があります。

`runTest()` は `beforeEach` フック、テスト本体、テスト内でアクセスしたフィクスチャー、`afterEach` フックを実行します。`aroundEach` コールバック内でアクセスしたフィクスチャーは `runTest()` 呼び出し前に初期化され、aroundEach のテアダウンコード完了後に破棄されるため、セットアップとテアダウンのどちらでも安全に使えます。

```ts
import { aroundEach, test } from 'vitest'

aroundEach(async (runTest) => {
  await db.transaction(runTest)
})

test('insert user', async () => {
  await db.insert({ name: 'Alice' })
  // トランザクションはテスト後に自動ロールバックされます
})
```

> **Warning:** コールバック内で**必ず** `runTest()` を呼んでください。呼ばないとテストはエラーで失敗します。

任意のタイムアウト（ms）はセットアップ段階（`runTest()` 前）とテアダウン段階（`runTest()` 後）に独立に適用されます。デフォルトは 10 秒（`hookTimeout`）です。

> **Note:** テストを内側に含むコンテキストでラップして実行する必要がある場合（`AsyncLocalStorage` コンテキスト、トレーシングスパン、データベーストランザクションなど）に `aroundEach` を使ってください。テスト前後の処理だけなら、クリーンアップ返却付きの `beforeEach` を使ってください:
>
> ```ts
> beforeEach(async () => {
>   await database.connect()
>   return async () => {
>     await database.disconnect()
>   }
> })
> ```

### 複数フック

複数の `aroundEach` フックは入れ子になり、最初に登録したフックが最も外側のラッパーになります:

```ts
aroundEach(async (runTest) => {
  console.log('outer before')
  await runTest()
  console.log('outer after')
})

aroundEach(async (runTest) => {
  console.log('inner before')
  await runTest()
  console.log('inner after')
})

// outer の前 → inner の前 → テスト → inner の後 → outer の後
```

### コンテキストとフィクスチャ

コールバックは第 2 引数でテストコンテキストを受け取るため、フィクスチャーを `aroundEach` と組み合わせられます:

```ts
import { aroundEach, test as base } from 'vitest'

const test = base.extend<{ db: Database; user: User }>({
  db: async ({}, use) => {
    // db は `aroundEach` フックより前に作られます
    const db = await createTestDatabase()
    await use(db)
    await db.close()
  },
  user: async ({ db }, use) => {
    // `user` はテスト内でアクセスされるため
    // トランザクションの一部として実行されます
    const user = await db.createUser()
    await use(user)
  },
})

// フィクスチャーの TypeScript 対応のため `aroundEach` は test 上でも使えます
test.aroundEach(async (runTest, { db }) => {
  await db.transaction(runTest)
})

test('insert user', async ({ db, user }) => {
  await db.insert(user)
})
```

## aroundAll

```ts
function aroundAll(
  body: (
    runSuite: () => Promise<void>,
    context: ModuleContext,
  ) => Promise<void>,
  timeout?: number,
): void
```

現在のスイート内のすべてのテストをラップするコールバックを登録します。コールバックは `runSuite` 関数を受け取り、スイートのテスト実行のため**必ず**呼ぶ必要があります。`runSuite()` は `beforeAll`/`afterAll`/`beforeEach`/`afterEach` フック、`aroundEach` フック、フィクスチャーを含め、スイート内のすべてのテストを実行します。

```ts
import { aroundAll, test } from 'vitest'

aroundAll(async (runSuite) => {
  await tracer.trace('test-suite', runSuite)
})
```

> **Warning:** コールバック内で**必ず** `runSuite()` を呼んでください。呼ばないとフックがエラーで失敗し、スイート内のすべてのテストがスキップされます。

任意のタイムアウトはセットアップ（`runSuite()` 前）とテアダウン（`runSuite()` 後）に独立に適用されます。デフォルト:10 秒（`hookTimeout`）。

> **Note:** スイート全体をコンテキスト内側で実行する必要がある場合（例:`AsyncLocalStorage`、トレーシングスパン、データベーストランザクション）に `aroundAll` を使ってください。1 回限りの前後処理だけなら、クリーンアップ返却付きの `beforeAll` を使ってください（`beforeAll(async () => { await server.start(); return async () => { await server.stop() } })`）。

複数の `aroundAll` フックは入れ子になり、最初に登録したものが最も外側になります（`outer before -> inner before -> tests -> inner after -> outer after`）。各スイートは独立した `aroundAll` フックを持ち、親スイートの `aroundAll` は子スイートの実行をラップします。親コンテキストはネストしたスイート内でも利用可能です:

```ts
const context = new AsyncLocalStorage<{ suiteId: string }>()

aroundAll(async (runSuite) => {
  await context.run({ suiteId: 'root' }, runSuite)
})

describe('nested', () => {
  aroundAll(async (runSuite) => {
    // 親のコンテキストはここで利用可能です
    await context.run({ suiteId: 'nested' }, runSuite)
  })

  test('nested test', () => {
    // context.getStore() は { suiteId: 'nested' } を返します
  })
})
```

## テストフック

Vitest は、テスト終了時に状態を片付けるため_テスト実行中に_呼ぶフックを用意しています。

> **Warning:** これらのフックをテスト本体外で呼ぶとエラーを投げます。

### onTestFinished

テスト実行終了後に必ず呼ばれます。テスト結果に影響しうるため `afterEach` フックの後に呼ばれます。`beforeEach` や `afterEach` と同様の `TestContext` オブジェクトを受け取ります。

```ts
import { onTestFinished, test } from 'vitest'

test('performs a query', () => {
  const db = connectDb()
  onTestFinished(() => db.close())
  db.query('SELECT * FROM users')
})
```

> **Warning:** 並列テスト実行時は、テストコンテキスト由来の `onTestFinished` を必ず使ってください。Vitest はグローバルフックで並列テストを追跡しないためです:
>
> ```ts
> test.concurrent('performs a query', ({ onTestFinished }) => {
>   const db = connectDb()
>   onTestFinished(() => db.close())
>   db.query('SELECT * FROM users')
> })
> ```

再利用ヘルパー内でも動作し、アサーション失敗時もクリーンアップが実行されるためスパイの復元に適している:

```ts
function getTestDb() {
  const db = connectMockedDb()
  onTestFinished(() => db.close())
  return db
}

test('performs a query', () => {
  const spy = vi.spyOn(db, 'query')
  onTestFinished(() => spy.mockClear())

  db.query('SELECT * FROM users')
  expect(spy).toHaveBeenCalled()
})
```

> **Note:** `onTestFinished` は常に逆順で呼ばれ、`sequence.hooks` オプションの影響を受けません。

### onTestFailed

テスト失敗後にのみ呼ばれます。テスト結果に影響しうるため `afterEach` フックの後に呼ばれます。`TestContext` オブジェクトを受け取ります。デバッグに有用です。

```ts
import { onTestFailed, test } from 'vitest'

test('performs a query', () => {
  const db = connectDb()
  onTestFailed(({ task }) => {
    console.log(task.result.errors)
  })
  db.query('SELECT * FROM users')
})
```

> **Warning:** 並列テストでは、テストコンテキスト由来の `onTestFailed` を必ず使ってください。Vitest はグローバルフックで並列テストを追跡しないためです:
>
> ```ts
> test.concurrent('performs a query', ({ onTestFailed }) => {
>   const db = connectDb()
>   onTestFailed(({ task }) => {
>     console.log(task.result.errors)
>   })
>   db.query('SELECT * FROM users')
> })
> ```

## フック一覧

| Hook | スコープ | Context | 備考 |
|---|---|---|---|
| `beforeEach` | 各テスト前 | `TestContext` | クリーンアップ関数を返せます |
| `afterEach` | 各テスト後 | `TestContext` | 返却 Promise を待機します |
| `beforeAll` | スイート前に 1 回 | `ModuleContext` | クリーンアップ関数を返せます |
| `afterAll` | スイート後に 1 回 | `ModuleContext` | 返却 Promise を待機します |
| `aroundEach` | 各テストをラップします | `TestContext` | `runTest()` 呼び出しが必須です |
| `aroundAll` | スイートをラップします | `ModuleContext` | `runSuite()` 呼び出しが必須です |
| `onTestFinished` | テスト中 | `TestContext` | 常に実行され、逆順です |
| `onTestFailed` | テスト中 | `TestContext` | 失敗時のみ実行されます |

すべてのフックは任意の `timeout`（ミリ秒）を受け付けます。デフォルトは 10 秒で、`hookTimeout` で設定できます。

<!-- Sources: docs/api/hooks.md -->
