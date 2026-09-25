---
name: core-expect
description: Vitest の expect アサーション、主要マッチャーとスパイ用マッチャー、スナップショット、非対称マッチャー（Vitest 4.1）を説明します。
---

# Expect API

`expect` はアサーションを作ります。Vitest はデフォルトで Chai アサーションに加え、Chai 上に構築した Jest 互換アサーションを提供します。Vitest 4.1 以降、スパイ/モックのテストにも Jest 形式に加えて Chai 形式（sinon-chai）のアサーションがあります。Jest と異なり、Vitest は第 2 引数にメッセージを受け付けます。アサーション失敗時のエラーメッセージはそれと等しくなります。

```ts
type Awaitable<T> = T | PromiseLike<T>

export interface ExpectStatic extends Chai.ExpectStatic, AsymmetricMatchersContaining {
  <T>(actual: T, message?: string): Assertion<T>
  extend: (expects: MatchersObject) => void
  anything: () => any
  any: (constructor: unknown) => any
  getState: () => MatcherState
  setState: (state: Partial<MatcherState>) => void
  not: AsymmetricMatchersContaining
}
```

```ts
const input = Math.sqrt(4)
expect(input).to.equal(2) // chai の API
expect(input).toBe(2)     // jest の API
```

> **Note:** 式に型エラーがない場合、`expect` は型テストに影響しません。型チェックには `expectTypeOf` や `assertType` を使ってください。

## 修飾子

### not

アサーションを否定します:`expect(input).not.to.equal(2)`（chai）、`expect(input).not.toBe(2)`（jest）。

### soft

`expect.soft` は `expect` と同様に動作しますが、失敗したアサーションでテストを終了せず、失敗を記録して続行し、最後にすべてのエラーを報告します。通常の `expect` と混ぜた場合、ハード失敗でテストが停止し、それまでのソフトエラーをすべて出力します。

```ts
test('expect.soft test', () => {
  expect.soft(1 + 1).toBe(3) // テストを失敗扱いにして続行する
  expect.soft(1 + 2).toBe(4) // テストを失敗扱いにして続行する
})
```

> **Warning:** `expect.soft` は `test` 関数内でのみ使えます。

### poll

```ts
interface ExpectPoll extends ExpectStatic {
  (actual: () => T, options?: { interval?: number; timeout?: number; message?: string }): Promise<Assertions<T>>
}
```

成功するまで_アサーション_を再実行します。`interval` と `timeout` を設定します。コールバックが投げた場合、タイムアウト切れまで Vitest がリトライします。

```ts
test('element exists', async () => {
  asyncInjectElement()
  await expect.poll(() => document.querySelector('.element')).toBeTruthy()
})
```

> **Warning:** `expect.poll` はすべてのアサーションを非同期にするため、必ず await してください（Vitest 3 以降、await 漏れは警告付きでテスト失敗になります）。スナップショットマッチャー（先に `vi.waitFor` を使ってください）、`.resolves`/`.rejects`、`toThrow` とエイリアスには対応しません。

### resolvesとrejects

Promise をアンラップします。以降の各マッチャーは `Promise` を返すため、必ず `await` してください。Chai アサーションとも組み合わせられます。`resolves` は Promise がリジェクトすると失敗し、`rejects` は解決すると失敗します。

```ts
await expect(buyApples()).resolves.toEqual({ id: 1 }) // jest の API
await expect(buyApples()).resolves.to.equal({ id: 1 }) // chai の API
await expect(buyApples()).rejects.toThrow('no id')
```

> **Warning:** `await` なしではアサーションが偽陽性になります。実行を確認するため `expect.assertions(number)` を使ってください。Vitest 3 以降、await 漏れのメソッドは警告を表示し、Vitest 4 ではテストを失敗扱いにします。

## 等価性

### toBe

`(value: any) => Awaitable<void>` — プリミティブが等しいこと、またはオブジェクトが同じ参照を共有することを検証します。`Object.is` と同等です。構造的等価性には `toEqual` を、浮動小数点数には `toBeCloseTo` を使ってください。

```ts
const stock = { type: 'apples', count: 13 }
expect(stock.type).toBe('apples')
expect(stock).toBe(stock) // 同じ参照
```

### toEqual

`(received: any) => Awaitable<void>` — 受信値が構造的に等しいことを再帰的に検査します。

```ts
expect(stockBill).toEqual(stockMary) // 同じプロパティ
expect(stockBill).not.toBe(stockMary) // 異なる参照
```

> **Warning:** `Error` オブジェクトでは `name`、`message`、`cause`、`AggregateError.errors` のような非列挙プロパティーも比較します。`Error.cause` は非対称に比較されます:`new Error('hi', { cause: 'x' })` は `new Error('hi')` と等しいですが、逆は等しくありません。

### toStrictEqual

`toEqual` と同様ですが、型も検査します。`.toEqual` との違い:

- `undefined` プロパティーを持つキーを検査します:`{ a: undefined, b: 2 }` は `{ b: 2 }` にマッチしません。
- 配列の疎性を検査します:`[, 1]` は `[undefined, 1]` にマッチしません。
- オブジェクトの型が等しい必要があります:フィールド `a` と `b` を持つクラスインスタンスは、同じフィールドを持つリテラルオブジェクトと等しくありません。

```ts
expect(new Stock('apples')).toEqual({ type: 'apples' })
expect(new Stock('apples')).not.toStrictEqual({ type: 'apples' })
```

### toBeCloseTo

`(value: number, numDigits?: number) => Awaitable<void>` — 浮動小数点数を比較します。`numDigits` で小数点以下の検査桁数を制限します（デフォルト `2`）。

```ts
expect(0.2 + 0.1).toBeCloseTo(0.3, 5) // 成功する
expect(0.2 + 0.1).not.toBeCloseTo(0.3, 50) // 失敗する
```

## 真偽値、型、数値

| Matcher | Signature | 内容 |
|---|---|---|
| `toBeDefined` | `() => Awaitable<void>` | 値が `undefined` でないこと |
| `toBeUndefined` | `() => Awaitable<void>` | 値が `undefined` であること |
| `toBeTruthy` | `() => Awaitable<void>` | 値が `true` に変換されること |
| `toBeFalsy` | `() => Awaitable<void>` | 値が `false` に変換されること |
| `toBeNull` | `() => Awaitable<void>` | 値が `null` であること（`.toBe(null)` のエイリアス） |
| `toBeNullable` | `() => Awaitable<void>` | 値が `null` または `undefined` であること |
| `toBeNaN` | `() => Awaitable<void>` | 値が `NaN` であること（`.toBe(NaN)` のエイリアス） |
| `toBeTypeOf` | `(c: 'bigint' \| 'boolean' \| 'function' \| 'number' \| 'object' \| 'string' \| 'symbol' \| 'undefined') => Awaitable<void>` | ネイティブ `typeof` の結果 |
| `toBeInstanceOf` | `(c: any) => Awaitable<void>` | クラスのインスタンスであること |
| `toBeOneOf` | `(sample: Array<any> \| Set<any>) => any` | いずれかの要素に一致すること |
| `toBeGreaterThan` | `(n: number \| bigint) => Awaitable<void>` | より大きいこと（等しい場合は失敗します） |
| `toBeGreaterThanOrEqual` | `(n: number \| bigint) => Awaitable<void>` | 以上であること |
| `toBeLessThan` | `(n: number \| bigint) => Awaitable<void>` | より小さいこと（等しい場合は失敗します） |
| `toBeLessThanOrEqual` | `(n: number \| bigint) => Awaitable<void>` | 以下であること |

JavaScript では `false`、`null`、`undefined`、`NaN`、`0`、`-0`、`0n`、`""`、`document.all` 以外はすべて真値です。

> **Warning:** `toBeTypeOf` は癖のあるネイティブ `typeof` を使います:`null` と配列の型は `'object'` になります。`toBeOneOf` への `Set` 渡しは実験的です。

`toBeOneOf` は任意プロパティーに有用で、`expect.not` と組み合わせられます:

```ts
expect(user).toEqual({
  middleName: expect.toBeOneOf([expect.any(String), undefined]),
})
```

## 文字列、配列、オブジェクト

### toContainとtoContainEqual

`toContain(received: string)` は配列が値を含むこと、または文字列が部分文字列であることを検証します。ブラウザー相当の環境では `classList` や要素の包含も検査できます。`toContainEqual(received: any)` は特定の構造を持つ要素が存在することを検証します（要素ごとに `toEqual` するイメージです）。

```ts
expect(getAllFruits()).toContain('orange')
expect('pineapple').toContain('apple')
expect(element.classList).toContain('flex')
expect(document.querySelector('#wrapper')).toContain(element)
expect(getFruitStock()).toContainEqual({ fruit: 'apple', count: 5 })
```

### toHaveLength

`(received: number) => Awaitable<void>` — 値が数に等しい `.length` プロパティーを持ちます。

```ts
expect('abc').toHaveLength(3)
```

### toHaveProperty

`(key: any, received?: any) => Awaitable<void>` — 参照 `key` のプロパティーが存在することを検証します。任意の値は深い等価性で比較されます。キーはドット記法、`items[0].type`、配列（`['items', 0, 'type']`）、深いパース回避のラップ（`['P.O']`）に対応します。

```ts
expect(invoice).toHaveProperty('isActive')
expect(invoice).toHaveProperty('total_amount', 5000)
expect(invoice).not.toHaveProperty('account')
expect(invoice).toHaveProperty('customer.first_name')
expect(invoice).toHaveProperty('items[0].type', 'apples')
expect(invoice).toHaveProperty(['items', 0, 'type'], 'apples')
expect(invoice).toHaveProperty(['P.O'], '12345')
```

### toMatchとtoMatchObject

`toMatch(received: string | regexp)` は文字列が正規表現や文字列にマッチすることを検証します。`toMatchObject(received: object | array)` はオブジェクトがプロパティーの部分集合にマッチすることを検証します。配列は数と順序でマッチします（余分な要素を許すには `arrayContaining` を使います）。

```ts
expect('top fruits include apple').toMatch(/apple/)
expect(johnInvoice).toMatchObject(johnDetails)
expect([{ foo: 'bar' }]).toMatchObject([{ foo: 'bar' }])
```

### toSatisfy

`(predicate: (value: any) => boolean) => Awaitable<void>` — 値が述語を満たすことを検証します。`.not` と組み合わせられます。

```ts
const isOdd = (value: number) => value % 2 !== 0
expect(1).toSatisfy(isOdd)
expect(2).not.toSatisfy(isOdd)
```

## エラー: toThrow

`(expected?: any) => Awaitable<void>` — エイリアス `toThrowError`（非推奨）。呼び出し時に関数が投げることを検証します。任意引数:

- `RegExp`: エラーメッセージがパターンにマッチします
- `string`: エラーメッセージが部分文字列を含みます
- その他の値: 投げられた値と深い等価性で比較されます

```ts
expect(() => getFruitStock('pineapples')).toThrow(/stock/)
expect(() => getFruitStock('pineapples')).toThrow('stock')
expect(() => getFruitStock('pineapples')).toThrow(/^Pineapples are not in stock$/)
expect(() => getFruitStock('pineapples')).toThrow(new Error('Pineapples are not in stock'))
expect(() => getFruitStock('pineapples')).toThrow(expect.objectContaining({
  message: 'Pineapples are not in stock',
}))
```

> **Note:** 同期コードは関数でラップする必要があり、そうしないとエラーを捕捉できません。非同期呼び出しは `rejects` で扱います:`await expect(() => getAsyncFruitStock()).rejects.toThrow('empty')`。非 Error の投げ値にも対応します:`expect(() => { throw 42 }).toThrow(42)`。

> **Warning:** フェイクタイマーでは、`vi.advanceTimersByTimeAsync` 中にリジェクトする非同期関数は、後で `.rejects.toThrow()` で検証しても未処理リジェクションを起こします。`vi.setTimerTickMode('nextTimerAsync')` を使うか、タイマー進行前にアサーションを作ってください。

## スナップショットマッチャー

| Matcher | Signature |
|---|---|
| `toMatchSnapshot` | `<T>(shape?: Partial<T> \| string, hint?: string) => void` |
| `toMatchInlineSnapshot` | `<T>(shape?: Partial<T> \| string, snapshot?: string, hint?: string) => void` |
| `toMatchFileSnapshot` | `<T>(filepath: string, hint?: string) => Promise<void>` |
| `toThrowErrorMatchingSnapshot` | `(hint?: string) => void` |
| `toThrowErrorMatchingInlineSnapshot` | `(snapshot?: string, hint?: string) => void` |
| `toMatchAriaSnapshot` (v4.1.4、実験的) | `() => void` |
| `toMatchAriaInlineSnapshot` (v4.1.4、実験的) | `(snapshot?: string) => void` |

`hint` は複数スナップショットを区別するためテスト名に付加されます。`toMatchSnapshot` は形状を受け付けます:`expect(data).toMatchSnapshot({ foo: expect.any(Set) })`。`toMatchFileSnapshot` は await が必要で、await なしでは `expect.soft` のように振る舞いテスト終了時に検査されます。ARIA スナップショットは DOM 要素のアクセシビリティーツリーを取得します。`u` を押すか `-u`/`--update` を渡すと失敗スナップショットを更新します。

## スパイとモックのマッチャー

Jest 形式マッチャー、すべて `Awaitable<void>`:

| Matcher | Signature |
|---|---|
| `toHaveBeenCalled` | `() => void` |
| `toHaveBeenCalledTimes` | `(amount: number) => void` |
| `toHaveBeenCalledWith` | `(...args: any[]) => void` |
| `toHaveBeenCalledBefore` | `(mock: MockInstance, failIfNoFirstInvocation?: boolean) => void` |
| `toHaveBeenCalledAfter` | `(mock: MockInstance, failIfNoFirstInvocation?: boolean) => void` |
| `toHaveBeenCalledExactlyOnceWith` | `(...args: any[]) => void` |
| `toHaveBeenLastCalledWith` | `(...args: any[]) => void` |
| `toHaveBeenNthCalledWith` | `(time: number, ...args: any[]) => void`（1始まり） |
| `toHaveReturned` | `() => void` |
| `toHaveReturnedTimes` | `(amount: number) => void` |
| `toHaveReturnedWith` | `(returnValue: any) => void` |
| `toHaveLastReturnedWith` | `(returnValue: any) => void` |
| `toHaveNthReturnedWith` | `(time: number, returnValue: any) => void`（1始まり） |
| `toHaveResolved` | `() => void` |
| `toHaveResolvedTimes` | `(amount: number) => void` |
| `toHaveResolvedWith` | `(returnValue: any) => void` |
| `toHaveLastResolvedWith` | `(returnValue: any) => void` |
| `toHaveNthResolvedWith` | `(time: number, returnValue: any) => void`（1始まり） |

```ts
const buySpy = vi.spyOn(market, 'buy')
expect(buySpy).not.toHaveBeenCalled()

market.buy('apples', 10)
market.buy('apples', 20)

expect(buySpy).toHaveBeenCalledTimes(2)
expect(buySpy).toHaveBeenCalledWith('apples', 10)
```

`toHaveResolved*` は Promise が既に解決済みである必要があり、保留中は失敗します。`toHaveReturned*` は正常リターン（投げなし）が必要です。

### Chai形式スパイアサーション（v4.1.0）

| Assertion | 対応するJest形式 |
|---|---|
| `expect(spy).to.have.been.called`（プロパティ） | `toHaveBeenCalled()` |
| `callCount(n)` | `toHaveBeenCalledTimes(n)` |
| `calledWith(...args)` | `toHaveBeenCalledWith(...args)` |
| `calledOnce`（プロパティ） | `toHaveBeenCalledOnce()` |
| `calledOnceWith(...args)` | `toHaveBeenCalledExactlyOnceWith(...args)` |
| `calledTwice` / `calledThrice`（プロパティ） | `toHaveBeenCalledTimes(2 / 3)` |
| `lastCalledWith(...args)` | `toHaveBeenLastCalledWith(...args)` |
| `nthCalledWith(n, ...args)` | `toHaveBeenNthCalledWith(n, ...args)` |
| `returned(value)` / `returnedWith(value)` | `toHaveReturnedWith(value)` |
| `returnedTimes(count)` | `toHaveReturnedTimes(count)` |
| `lastReturnedWith(value)` | `toHaveLastReturnedWith(value)` |
| `nthReturnedWith(n, value)` | `toHaveNthReturnedWith(n, value)` |
| `calledBefore(mock, failIfNoFirstInvocation?)` | `toHaveBeenCalledBefore(...)` |
| `calledAfter(mock, failIfNoFirstInvocation?)` | `toHaveBeenCalledAfter(...)` |

```ts
expect(spy).to.have.been.called
expect(spy).to.have.been.calledOnceWith('apple', 10)
expect(spy).to.have.returnedWith('apple')
expect(spy).to.have.nthReturnedWith(2, 'banana')
```

プロパティー（`called`、`calledOnce`、`calledTwice`、`calledThrice`）は括弧なしでアクセスし、`expect(spy).to.not.have.been.called` で否定します。

## 非対称マッチャー

`toEqual` や `toHaveBeenCalledWith` のような等価性検査内で使います。多くは `expect.not.<matcher>(...)` で否定できます。

| Matcher | Signature | マッチ対象 |
|---|---|---|
| `expect.anything` | `() => any` | `null`/`undefined` 以外すべて |
| `expect.any` | `(constructor: unknown) => any` | コンストラクターのインスタンス |
| `expect.closeTo` | `(expected: any, precision?: number) => any` | 浮動小数点値（デフォルト精度 `2`、基準 `< 0.005`） |
| `expect.arrayContaining` | `<T>(expected: T[]) => any` | すべての要素を含む配列 |
| `expect.objectContaining` | `(expected: any) => any` | 類似形状のオブジェクト |
| `expect.stringContaining` | `(expected: any) => any` | 部分文字列を含む文字列 |
| `expect.stringMatching` | `(expected: any) => any` | 部分文字列を含むか正規表現にマッチする文字列 |
| `expect.schemaMatching` | `(expected: StandardSchemaV1) => any` | Standard Schema にマッチする値（Zod、Valibot、ArkType） |
| `expect.toBeOneOf` | `(sample: Array<any> \| Set<any>) => any` | いずれかの要素に一致する値 |

```ts
expect({ id: generateId() }).toEqual({ id: expect.any(Number) })
expect({ sum: 0.1 + 0.2 }).toEqual({ sum: expect.closeTo(0.3, 5) })
expect(basket).toEqual({ varieties: expect.arrayContaining(['Fuji']) })
expect(basket).toEqual({ varieties: [expect.objectContaining({ name: 'Empire' })] })
expect(variety).toEqual({ name: expect.stringContaining('Emp') })
expect(variety).toEqual({ name: expect.stringMatching(/re$/) })
expect(user).toEqual({ email: expect.schemaMatching(z.string().email()) })
```

## 静的expectメソッド

| Method | Signature | 目的 |
|---|---|---|
| `expect.assert` | `Chai.AssertStatic` | Chai の `assert` API。型を絞り込みます（`assert.isDefined`、`assert.exists` など） |
| `expect.soft` | `ExpectStatic & (actual: any) => Assertions` | 失敗しても続行します |
| `expect.poll` | 上記参照 | 成功までアサーションをリトライします |
| `expect.assertions` | `(count: number) => void` | ちょうど `count` 個のアサーションが実行されたことを確認します |
| `expect.hasAssertions` | `() => void` | 1 つ以上のアサーションが実行されたことを確認します |
| `expect.unreachable` | `(message?: string) => never` | 到達しないはずの行であることを検証します |
| `expect.extend` | `(matchers: MatchersObject) => void` | カスタムマッチャーを追加します（非対称マッチャーも）。Jest 互換です |
| `expect.addSnapshotSerializer` | `(plugin: PrettyFormatPlugin) => void` | カスタムスナップショットシリアライザー（`setupFiles` で呼びます） |
| `expect.addEqualityTesters` | `(tester: Array<Tester>) => void` | カスタム等価性テスター。Jest 互換です |

```ts
expect.assert(animal.__type === 'Dog') // 型を絞り込みます
expect.unreachable('Should not pass build')
```

> **Warning:** 非同期の並列テストでは、正しいテストを検出するためローカルテストコンテキスト由来の `expect` を使ってください。

### expect.extend

マッチャーを定義すると非対称マッチャーも作られます（例:`expect.toBeFoo()`）。グローバルにするには `setupFiles` で呼んでください。

```ts
expect.extend({
  toBeFoo: (received, expected) => {
    if (received !== 'foo') {
      return { message: () => `expected ${received} to be foo`, pass: false }
    }
  },
})
expect('foo').toBeFoo()
expect({ foo: 'foo' }).toEqual({ foo: expect.toBeFoo() })
```

TypeScript 拡張:

```ts
interface CustomMatchers<R = unknown> {
  toBeFoo: () => R
}
declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}
```

## 要点

- プリミティブ/参照には `toBe`、構造には `toEqual`、構造＋型には `toStrictEqual` を使います。
- `resolves`、`rejects`、`poll` のアサーションは必ず `await` します。
- `toThrow` は同期コードを関数でラップする必要があります。非同期は `rejects.toThrow` を使います。
- 重要でない検査には `expect.soft` を使い、通常の `expect` はテストを停止します。
- TypeScript の型絞り込みも必要な場合は `expect.assert` を使います。
- 部分マッチには `expect.stringContaining`/`objectContaining`/`any` を使います。

<!-- Sources: docs/api/expect.md -->
