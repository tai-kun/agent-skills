---
name: vitest-describe
description: describe / suite でテストやベンチマークをスイートにまとめ、修飾子やオプション、each / for を使う方法を説明します。
---

# describe

- **Alias:** `suite`

```ts
function describe(
  name: string | Function,
  body?: () => unknown,
  timeout?: number
): void
function describe(
  name: string | Function,
  options: SuiteOptions,
  body?: () => unknown,
): void
```

`describe` は関連するテストやベンチマークをスイートにまとめます。スイートによりテストファイルを論理ブロックに整理でき、テスト出力が読みやすくなり、ライフサイクルフックによる共通セットアップ/テアダウンを使えます。

ファイルのトップレベルで宣言したテストは、そのファイルの暗黙スイートの一部として収集されます。`describe` は現在のコンテキストに、関連テストやベンチマーク、その他ネストしたスイートの集合として新しいスイートを定義します。

## 基本的な使い方

```ts
import { describe, expect, test } from 'vitest'

const person = {
  isActive: true,
  age: 32,
}

describe('person', () => {
  test('person is defined', () => {
    expect(person).toBeDefined()
  })

  test('is active', () => {
    expect(person.isActive).toBeTruthy()
  })

  test('age limit', () => {
    expect(person.age).toBeLessThanOrEqual(32)
  })
})
```

## ネスト

`describe` ブロックをネストしてテストの階層を表現できます:

```ts
import { describe, expect, test } from 'vitest'

function numberToCurrency(value: number | string) {
  if (typeof value !== 'number') {
    throw new TypeError('Value must be a number')
  }

  return value.toFixed(2).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

describe('numberToCurrency', () => {
  describe('given an invalid number', () => {
    test('composed of non-numbers to throw error', () => {
      expect(() => numberToCurrency('abc')).toThrow()
    })
  })

  describe('given a valid number', () => {
    test('returns the correct currency format', () => {
      expect(numberToCurrency(10000)).toBe('10,000.00')
    })
  })
})
```

## テストオプション

テストオプションはネストしたスイートを含め、スイート内のすべてのテストに適用されます。テスト群で共有するタイムアウトやリトライなどのオプションに有用です。

```ts
import { describe, test } from 'vitest'

describe('slow tests', { timeout: 10_000 }, () => {
  test('test 1', () => { /* ... */ })
  test('test 2', () => { /* ... */ })

  // ネストしたスイートもタイムアウトを継承する
  describe('nested', () => {
    test('test 3', () => { /* ... */ })
  })
})
```

テストオプションの全一覧は `core-test-api.md` を参照してください。

### shuffle

- **型:** `boolean`
- **既定値:** `false`（`sequence.shuffle`で設定する）
- **Alias:** `describe.shuffle`

スイート内のテストをランダム順で実行します。ネストしたスイートに継承されます。

```ts
import { describe, test } from 'vitest'

describe('randomized tests', { shuffle: true }, () => {
  test('test 1', () => { /* ... */ })
  test('test 2', () => { /* ... */ })
  test('test 3', () => { /* ... */ })
})
```

## describe.skip

- **Alias:** `suite.skip`

特定の describe ブロックをコード削除なしで実行しません:

```ts
import { assert, describe, test } from 'vitest'

describe.skip('skipped suite', () => {
  test('sqrt', () => {
    // スイートはスキップされ、エラーにならない
    assert.equal(Math.sqrt(4), 3)
  })
})
```

## describe.skipIf

- **Alias:** `suite.skipIf`

条件が真値の場合にスイートをスキップします。同じスイートを複数環境で実行し一部が環境固有の場合に、スイートを `if` で囲む代わりに使います:

```ts
import { describe, test } from 'vitest'

const isDev = process.env.NODE_ENV === 'development'

describe.skipIf(isDev)('prod only test suite', () => {
  // このテストスイートは本番でのみ実行される
})
```

## describe.runIf

- **Alias:** `suite.runIf`

`describe.skipIf` の逆です:

```ts
import { assert, describe, test } from 'vitest'

const isDev = process.env.NODE_ENV === 'development'

describe.runIf(isDev)('dev only test suite', () => {
  // このテストスイートは開発でのみ実行される
})
```

## describe.only

- **Alias:** `suite.only`

特定のスイートだけ実行します:

```ts
import { assert, describe, test } from 'vitest'

// このスイート（およびonly指定の他スイート）のみ実行される
describe.only('suite', () => {
  test('sqrt', () => {
    assert.equal(Math.sqrt(4), 3)
  })
})

describe('other suite', () => {
  // ... スキップされる
})
```

全スイート中の他テストを無視して 1 ファイル内の `only` テストを実行するには、そのファイルを指定して Vitest を実行します:

```shell
vitest interesting.test.ts
```

## describe.concurrent

- **Alias:** `suite.concurrent`

内側のすべてのスイートとテストを並列実行します:

```ts
import { describe, test } from 'vitest'

// このスイート内のすべてのスイートとテストは並列実行される
describe.concurrent('suite', () => {
  test('concurrent test 1', async () => { /* ... */ })
  describe('concurrent suite 2', async () => {
    test('concurrent test inner 1', async () => { /* ... */ })
    test('concurrent test inner 2', async () => { /* ... */ })
  })
  test.concurrent('concurrent test 3', async () => { /* ... */ })
})
```

`.skip`、`.only`、`.todo` は並列スイートと組み合わせられます。以下の組み合わせはすべて有効です:

```ts
describe.concurrent(/* ... */)
describe.skip.concurrent(/* ... */) // または describe.concurrent.skip(/* ... */)
describe.only.concurrent(/* ... */) // または describe.concurrent.only(/* ... */)
describe.todo.concurrent(/* ... */) // または describe.concurrent.todo(/* ... */)
```

並列テスト実行時は、正しいテストを検出するためスナップショットとアサーションにローカルテストコンテキスト由来の `expect` を使ってください:

```ts
describe.concurrent('suite', () => {
  test('concurrent test 1', async ({ expect }) => {
    expect(foo).toMatchSnapshot()
  })
  test('concurrent test 2', async ({ expect }) => {
    expect(foo).toMatchSnapshot()
  })
})
```

## describe.sequential（非推奨）

- **Alias:** `suite.sequential`

> **Warning:** 非推奨です。継承または設定された並行性を上書きする必要がある場合は代わりに `concurrent: false` を使ってください。

スイート内のすべてのテストを逐次実行にします。`describe.concurrent` 内や `--sequence.concurrent` コマンドオプション使用時に逐次実行する場合に有用です:

```ts
import { describe, test } from 'vitest'

describe.concurrent('suite', () => {
  test('concurrent test 1', async () => { /* ... */ })
  test('concurrent test 2', async () => { /* ... */ })

  describe.sequential('', () => {
    test('sequential test 1', async () => { /* ... */ })
    test('sequential test 2', async () => { /* ... */ })
  })
})
```

## describe.shuffle

- **Alias:** `suite.shuffle`

Vitest は `--sequence.shuffle` や `sequence.shuffle` ですべてのテストをランダム順に実行できますが、スイートの一部だけランダム化することもできます:

```ts
import { describe, test } from 'vitest'

// または describe('suite', { shuffle: true }, ...)
describe.shuffle('suite', () => {
  test('random test 1', async () => { /* ... */ })
  test('random test 2', async () => { /* ... */ })
  test('random test 3', async () => { /* ... */ })

  // `shuffle`は継承される
  describe('still random', () => {
    test('random 4.1', async () => { /* ... */ })
    test('random 4.2', async () => { /* ... */ })
  })

  // 内側でシャッフルを無効化する
  describe('not random', { shuffle: false }, () => {
    test('in order 5.1', async () => { /* ... */ })
    test('in order 5.2', async () => { /* ... */ })
  })
})
// 順序は設定の sequence.seed オプションに依存します（デフォルトは Date.now()）
```

`.skip`、`.only`、`.todo` はランダムスイートと組み合わせられます。

## describe.todo

- **Alias:** `suite.todo`

後で実装するスイートのスタブです。レポートにテストのエントリーが表示されるため、未実装が何件残っているか把握できます。

```ts
// このスイートのエントリがレポートに表示される
describe.todo('unimplemented suite')
```

## describe.each

- **Alias:** `suite.each`

> **Note:** `describe.each` は Jest 互換のため提供されていますが、Vitest には `describe.for` もあり、引数の型が単純で `test.for` と整合します。

複数のテストが同じデータに依存する場合に `describe.each` を使います。

```ts
import { describe, expect, test } from 'vitest'

describe.each([
  { a: 1, b: 1, expected: 2 },
  { a: 1, b: 2, expected: 3 },
  { a: 2, b: 1, expected: 3 },
])('describe object add($a, $b)', ({ a, b, expected }) => {
  test(`returns ${expected}`, () => {
    expect(a + b).toBe(expected)
  })

  test(`returned value not be greater than ${expected}`, () => {
    expect(a + b).not.toBeGreaterThan(expected)
  })

  test(`returned value not be less than ${expected}`, () => {
    expect(a + b).not.toBeLessThan(expected)
  })
})
```

テンプレートリテラル形式: 最初の行は `|` 区切りの列名にし、1 行以上の後続データ行を `${value}` 構文のテンプレートリテラル式で渡します。

```ts
import { describe, expect, test } from 'vitest'

describe.each`
  a               | b      | expected
  ${1}            | ${1}   | ${2}
  ${'a'}          | ${'b'} | ${'ab'}
  ${[]}           | ${'b'} | ${'b'}
  ${{}}           | ${'b'} | ${'[object Object]b'}
  ${{ asd: 1 }}   | ${'b'} | ${'[object Object]b'}
`('describe template string add($a, $b)', ({ a, b, expected }) => {
  test(`returns ${expected}`, () => {
    expect(a + b).toBe(expected)
  })
})
```

## describe.for

- **Alias:** `suite.for`

`describe.each` との違いは引数での配列ケースの渡し方です。その他非配列ケース（テンプレート文字列の使い方を含む）はまったく同じに動作します。

```ts
// `each` は配列ケースをスプレッドします
describe.each([
  [1, 1, 2],
  [1, 2, 3],
  [2, 1, 3],
])('add(%i, %i) -> %i', (a, b, expected) => {
  test('test', () => {
    expect(a + b).toBe(expected)
  })
})

// `for` は配列ケースをスプレッドしません
describe.for([
  [1, 1, 2],
  [1, 2, 3],
  [2, 1, 3],
])('add(%i, %i) -> %i', ([a, b, expected]) => {
  test('test', () => {
    expect(a + b).toBe(expected)
  })
})
```

<!-- Sources: docs/api/describe.md -->
