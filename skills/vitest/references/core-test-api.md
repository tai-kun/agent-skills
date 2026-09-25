---
name: vitest-test-api
description: Vitest の test / it 関数、テストオプション、skip / only / concurrent などの修飾子、パラメーター化、bench を説明します。
---

# テストAPI

- **Alias:** `it`

```ts
function test(
  name: string | Function,
  body?: () => unknown,
  timeout?: number
): void
function test(
  name: string | Function,
  options: TestOptions,
  body?: () => unknown,
): void
```

`test` または `it` は、関連するアサーションのまとまりを定義します。テスト名とテスト本体の関数を受け取ります。

```ts
import { expect, test } from 'vitest'

test('should work as expected', () => {
  expect(Math.sqrt(4)).toBe(2)
})
```

デフォルトタイムアウトは 5 秒で、`testTimeout` で全体を設定できます。

> **Warning:** 第 1 引数が関数の場合、その `name` プロパティーがテスト名に使われ、関数自体は呼ばれません。テスト本体がない場合、テストは `todo` 扱いになります。

テスト関数が Promise を返すと、ランナーは非同期の期待値を収集するため解決まで待機します。Promise がリジェクトするとテストは失敗します。

> **Note:** Jest の `(done: DoneCallback) => void` 形式は不要です。代わりに `async` 関数を使ってください。移行ガイドの Done Callback 節を参照してください。

## テストオプション

真偽値オプションは関数にチェーンできるほか、第 2 引数のオプションオブジェクトでも渡せます。どちらも同じように動作するため、好みで選べます。

```ts
import { test } from 'vitest'

test.skip('skipped test', () => { /* ... */ })
test.concurrent.skip('skipped concurrent test', () => { /* ... */ })

test('skipped test', { skip: true }, () => { /* ... */ })
test('skipped concurrent test', { skip: true, concurrent: true }, () => { /* ... */ })
```

### timeout

- **型:** `number`
- **既定値:** `5_000`（`testTimeout`で設定する）

テストのタイムアウト（ミリ秒）です。

> **Warning:** 最後の引数のタイムアウトはオプションオブジェクトと併用できません:

```ts
test.skip('heavy test', () => { /* ... */ }, 10_000) // 動作します

test('heavy test', { skip: true }, () => { /* ... */ }, 10_000) // 動作しません

test('heavy test', { skip: true, timeout: 10_000 }, () => { /* ... */ }) // 動作します
```

### retry

- **既定値:** `0`（`retry`で設定する）

```ts
type Retry = number | {
  count?: number
  delay?: number
  condition?: RegExp | ((error: TestError) => boolean)
}
```

- `count`: テスト失敗時のリトライ回数。デフォルト `0`。
- `delay`: リトライ間の遅延（ミリ秒）。デフォルト `0`。
- `condition`: エラーメッセージに照合する正規表現、または `TestError` を受け取る関数。`true` を返すとリトライします。デフォルト:すべてのエラーでリトライします。

オブジェクト形式は Vitest 4.1 以降で利用可能です。条件関数はテストファイル内でのみ使え、`vitest.config.ts` では使えません。設定はワーカースレッド用にシリアライズされるためです。

### repeats

`number`、デフォルト `0`。テストを繰り返し実行する回数です。`0` で 1 回実行します。不安定なテストのデバッグに役立ちます。

### tags（v4.1.0）

- **型:** `string[]`
- **既定値:** `[]`

```ts
import { it } from 'vitest'

it('user returns data from db', { tags: ['db', 'flaky'] }, () => {
  // ...
})
```

設定で指定されていないタグがあると、`strictTags` を手動で無効にしない限りテストは開始前に失敗します。

### meta（v4.1.0）

- **型:** `TaskMeta`

レポーターで利用可能なカスタムメタデータを付加します。

> **Warning:** Vitest はスイートやタグから継承したトップレベルのプロパティーをマージしますが、ネストしたオブジェクトはディープマージしません。スイートが `meta: { nested: { object: true, array: false } }` を設定し、テストが `meta: { nested: { object: false } }` で上書きすると、`task.meta` は `{ nested: { object: false } }` になり `array` プロパティーは失われます。ネストしない meta を使ってください。

### concurrent、sequential、skip、only、todo、fails

- `concurrent`（`boolean`、デフォルト `false`、`sequence.concurrent` で設定、エイリアス `test.concurrent`）:スイート内の他の並列テストと並列実行するかどうか。
- `sequential`（`boolean`、デフォルト `true`、エイリアス `test.sequential`）**(非推奨)**:代わりに `concurrent: false` を使ってください。両方指定時は `concurrent` が優先されます。
- `skip`（`boolean`、デフォルト `false`、エイリアス `test.skip`）:テストをスキップするかどうか。
- `only`（`boolean`、デフォルト `false`、エイリアス `test.only`）:スイート内でこのテストだけ実行するかどうか。
- `todo`（`boolean`、デフォルト `false`、エイリアス `test.todo`）:テストをスキップして todo 扱いにするかどうか。
- `fails`（`boolean`、デフォルト `false`、エイリアス `test.fails`）:テストの失敗を期待するかどうか。失敗すればテストは成功し、そうでなければ失敗します。

## test.extend

- **Alias:** `it.extend`

テストコンテキストをカスタムフィクスチャーで拡張し、さらに拡張可能な新しい `test` を返します:

```ts
import { test as baseTest, expect } from 'vitest'

export const test = baseTest
  // 単純な値 - 型は { port: number; host: string } と推論されます
  .extend('config', { port: 3000, host: 'localhost' })
  // 関数フィクスチャー - 型は戻り値から推論されます
  .extend('server', async ({ config }) => {
    // TypeScript は config が { port: number; host: string } であると解釈します
    return `http://${config.host}:${config.port}`
  })

test('server uses correct port', ({ config, server }) => {
  expect(server).toBe('http://localhost:3000')
  expect(config.port).toBe(3000)
})
```

## test.override（v4.1.0）

現在のスイートとそのネストしたスイート内のすべてのテスト向けにフィクスチャー値を上書きします。`describe` ブロックのトップレベルで呼ぶ必要があります:

```ts
const test = baseTest
  .extend('dependency', 'default')
  .extend('dependant', ({ dependency }) => dependency)

describe('use scoped values', () => {
  test.override({ dependency: 'new' })

  test('uses scoped value', ({ dependant }) => {
    // このスイート内のすべてのテストに適用される上書き値を使う
    expect(dependant).toEqual({ dependency: 'new' })
  })
})
```

`test.scoped`（v3.1.0）（非推奨、エイリアス `it.scoped`）は `test.override` のエイリアスで、置き換えられたため将来のメジャーバージョンで削除されます。

## test.skip

- **Alias:** `it.skip`

コード削除なしでテストを実行しません。コンテキストから動的にスキップし、条件とメッセージも任意に指定できます:

```ts
test.skip('skipped test', () => {
  // テストはスキップされ、エラーにならない
  assert.equal(Math.sqrt(4), 3)
})

test('dynamically skipped', (context) => {
  context.skip()
  // または: context.skip(Math.random() < 0.5, 'optional message')
  assert.equal(Math.sqrt(4), 3)
})
```

## test.skipIfとtest.runIf

- **Aliases:** `it.skipIf`、`it.runIf`

条件が真の場合はスキップし、条件が真の場合だけ実行します:

```ts
const isDev = process.env.NODE_ENV === 'development'

test.skipIf(isDev)('prod only test', () => {
  // このテストは本番でのみ実行される
})

test.runIf(isDev)('dev only test', () => {
  // このテストは開発でのみ実行される
})
```

## test.only

- **Alias:** `it.only`

特定スイート内の特定テストだけ実行します。デバッグ時に有用です。

```ts
test.only('test', () => {
  // このテスト（およびonly指定の他テスト）のみ実行される
  assert.equal(Math.sqrt(4), 2)
})
```

他ファイルの影響なしで 1 ファイル内の `only` テストを分離するには、そのファイルを直接実行します:`vitest interesting.test.ts`。

> **Warning:** Vitest は CI を検出すると `only` フラグ付きテストがある場合にエラーを投げます。`allowOnly` で設定してください。

## test.concurrent

- **Alias:** `it.concurrent`

連続するテストを並列実行にします。テスト名、非同期関数、任意のタイムアウトを受け取ります:

```ts
import { describe, test } from 'vitest'

// concurrent 指定の 2 テストは並列実行されます
describe('suite', () => {
  test('serial test', async () => { /* ... */ })
  test.concurrent('concurrent test 1', async () => { /* ... */ })
  test.concurrent('concurrent test 2', async () => { /* ... */ })
})
```

`test.skip`、`test.only`、`test.todo` はどちらの順序でも並列テストと組み合わせられます。例:`test.skip.concurrent(...)` や `test.concurrent.skip(...)`。

並列テストでは、正しいテストを検出するためスナップショットとアサーションにローカルテストコンテキスト由来の `expect` を使ってください:

```ts
test.concurrent('test 1', async ({ expect }) => {
  expect(foo).toMatchSnapshot()
})
test.concurrent('test 2', async ({ expect }) => {
  expect(foo).toMatchSnapshot()
})
```

同期テストは引き続き逐次実行される。

## test.sequential（非推奨）

- **Alias:** `it.sequential`

テストを逐次実行にします。`describe.concurrent` 内や `--sequence.concurrent` 使用時に有用ですが、非推奨です。代わりに `concurrent: false` を使ってください。

```ts
import { describe, test } from 'vitest'

test.sequential('sequential test 1', async () => { /* ... */ })

describe.concurrent('suite', () => {
  test('concurrent test 1', async () => { /* ... */ })
  test.sequential('sequential test 1', async () => { /* ... */ })
})
```

## test.todo

- **Alias:** `it.todo`

`test.todo('unimplemented test', () => { ... })` で後実装のテストをスタブします。レポートにエントリーが表示されるため、残テスト数を把握できます。

> **Note:** 本体のないテストは Vitest が自動的に `todo` 扱いにします。

## test.fails

- **Alias:** `it.fails`

アサーションが明示的に失敗することを示します:

```ts
test.fails('repro #1234', () => {
  expect(add(1, 2)).toBe(4)
})
```

未修正の既知バグなど、経時的な振る舞い差異の追跡に有用です。`fails` 指定テストは Vitest 4.1 以降テスト概要で追跡されます。

## test.each

- **Alias:** `it.each`

異なる変数で同じテストを実行します。printf 形式でテスト名にパラメーターを埋め込みます:`%s` 文字列、`%d` 数値、`%i` 整数、`%f` 浮動小数点、`%j` json、`%o` オブジェクト、`%#` 0 始まりインデックス、`%$` 1 始まりインデックス、`%%` 単一パーセント記号。

```ts
test.each([
  [1, 1, 2],
  [1, 2, 3],
  [2, 1, 3],
])('add(%i, %i) -> %i', (a, b, expected) => {
  expect(a + b).toBe(expected)
})

// 以下のように展開される
// add(1, 1) -> 2
// add(1, 2) -> 3
// add(2, 1) -> 3
```

オブジェクトプロパティーと配列要素は `$` プレフィックスで参照でき、位置アクセスや `$a`、`$expected`、`$0`、`$1`、`$a.val` のようなネスト属性も使えます:

```ts
test.each([
  { a: 1, b: 1, expected: 2 },
  { a: 2, b: 1, expected: 3 },
])('add($a, $b) -> $expected', ({ a, b, expected }) => {
  expect(a + b).toBe(expected)
})
```

テンプレートリテラル形式は `|` 区切りの列名ヘッダー行を使い、後続行で `${value}` 式を使います:

```ts
test.each`
  a      | b      | expected
  ${1}   | ${1}   | ${2}
  ${'a'} | ${'b'} | ${'ab'}
`('returns $expected when $a is added $b', ({ a, b, expected }) => {
  expect(a + b).toBe(expected)
})
```

> **Note:** Vitest は `$values` を Chai の `format` メソッドで処理します。値が短く切り詰められる場合、設定の `chaiConfig.truncateThreshold` を増やしてください。

## test.for

- **Alias:** `it.for`

`test.each` の代替で、テストコンテキストを提供します。非配列引数（テンプレート文字列を含む）は `test.each` とまったく同じに動作します。違いは配列をスプレッドしない点です:

```ts
// `each` は配列をスプレッドします
test.each([[1, 1, 2]])('add(%i, %i) -> %i', (a, b, expected) => {
  expect(a + b).toBe(expected)
})

// `for` は配列をスプレッドしません（引数周囲の角括弧に注意してください）
test.for([[1, 1, 2]])('add(%i, %i) -> %i', ([a, b, expected]) => {
  expect(a + b).toBe(expected)
})
```

第 2 引数はテストコンテキストで、並列スナップショットに使えます:

```ts
test.concurrent.for([[1, 1], [1, 2]])('add(%i, %i)', ([a, b], { expect }) => {
  expect(a + b).toMatchSnapshot()
})
```

## スコープ付きdescribeとフック（v4.1.0）

- `test.describe`: スコープ付き `describe`。`test.suite` は `suite` のエイリアスです。`core-describe.md` を参照してください。
- `test.beforeEach`、`test.afterEach`、`test.beforeAll`、`test.afterAll`、`test.aroundEach`、`test.aroundAll`: `test.extend` から型を継承するスコープ付きフックです。

## bench（実験的）

- **型:** `(name: string | Function, fn: BenchFunction, options?: BenchOptions) => void`

> **Danger:** ベンチマークは実験的で、SemVer に従いません。

`bench` はベンチマークを定義します。複数回実行して性能結果を表示する一連の操作を定義する関数です。Vitest は `tinybench` を使い、第 3 引数でそのすべてのオプションを指定できます。

```ts
import { bench } from 'vitest'

bench('normal sorting', () => {
  const x = [1, 5, 4, 2, 3]
  x.sort((a, b) => {
    return a - b
  })
}, { time: 1000 })
```

`BenchOptions`:`time`（デフォルト `500`）、`iterations`（`10`）、`now`、`signal`、`throws`、`warmupTime`（`100ms`）、`warmupIterations`（`5`）、`setup`、`teardown`。出力列は `name`、`hz`、`min`、`max`、`mean`、`p75`、`p99`、`p995`、`p999`、`rme`、`samples` です。`TaskResult` は `totalTime`、`period`、`variance`、`sd`、`sem`、`df`、`critical`、`moe`、`mad`、`p50` も公開します。

- `bench.skip(name, fn, options?)` は特定ベンチマークをスキップします。
- `bench.only(name, fn, options?)` は特定ベンチマークだけ実行します。デバッグ時に有用です。
- `bench.todo(name)` は後実装のベンチマークをスタブします。

<!-- Sources: docs/api/test.md -->
