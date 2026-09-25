---
name: type-testing
description: expectTypeOf と assertType による型レベルテスト、エラーの読み方、typecheck 設定を説明します。
---

# 型テスト

Vitest では `expectTypeOf` や `assertType` で型のテストを記述できます。デフォルトでは `*.test-d.ts` ファイル内のすべてのテストが型テストとみなされます。`typecheck.include` で変更できます。

内部では設定に応じて `tsc` または `vue-tsc` を呼び出し、結果を解析します。ソースコード内の型エラーも出力します。`typecheck.ignoreSourceErrors` で無効化できます。

> **Note:** Vitest は型テストファイルを実行しません。コンパイラーによる静的解析だけ行います。動的な名前や `test.each`、`test.for` は評価されず、テスト名は記述通りに表示されます。

> **Warning:** Vitest 2.1 より前は `typecheck.include` が `include` を上書きしたため、ランタイムテストは実行されず型チェックだけ行われました。Vitest 2.1 以降、`include` と `typecheck.include` が重なる場合、Vitest は型テストとランタイムテストを別エントリーとして報告します。

`--allowOnly` や `-t` などの CLI フラグは型チェックでも使えます。

```ts [mount.test-d.ts]
import { assertType, expectTypeOf } from 'vitest'
import { mount } from './mount.js'

test('my types work properly', () => {
  expectTypeOf(mount).toBeFunction()
  expectTypeOf(mount).parameter(0).toExtend<{ name: string }>()

  // @ts-expect-error name is a string
  assertType(mount({ name: 42 }))
})
```

テストファイル内で発生した型エラーはすべてテストエラーとして扱われます。あらゆる型テクニックでプロジェクトの型をテストできます。

## 型チェックの実行

Vitest コマンドに `--typecheck` フラグを追加します：

```json [package.json]
{
  "scripts": {
    "test": "vitest --typecheck"
  }
}
```

```bash
npm run test
# または yarn test / pnpm run test / bun test
```

Vitest は設定に応じて `tsc --noEmit` または `vue-tsc --noEmit` を使うため、個別に型チェック用スクリプトを用意する必要はありません。

## assertType

- **型:** `<T>(value: T): void`

引数の型が指定したジェネリクスと等しいことを検証します。`expectTypeOf` の簡易版にあたります。

> **Warning:** ランタイム中この関数は何もしません。型チェックを有効化するには `--typecheck` フラグを渡してください。

```ts
import { assertType } from 'vitest'

function concat(a: string, b: string): string
function concat(a: number, b: number): number
function concat(a: string | number, b: string | number): string | number

assertType<string>(concat('a', 'b'))
assertType<number>(concat(1, 2))
// @ts-expect-error wrong types
assertType(concat('a', 2))
```

## expectTypeOf

- **型:** `<T>(a: unknown) => ExpectTypeOf`

> **Warning:** ランタイム中この関数は何もしません。型チェックを有効化するには `--typecheck` フラグを渡してください。

### not

- **型:** `ExpectTypeOf`

`.not` プロパティですべてのアサーションを否定できます。

### 等価性と互換性のマッチャー

```ts
import { expectTypeOf } from 'vitest'

// toEqualTypeOf: 型が完全に一致する必要があります。値は関係ありませんが、
// プロパティーの欠落はアサーション失敗になります
expectTypeOf({ a: 1 }).toEqualTypeOf<{ a: number }>()
expectTypeOf({ a: 1 }).toEqualTypeOf({ a: 1 })
expectTypeOf({ a: 1 }).toEqualTypeOf({ a: 2 })
expectTypeOf({ a: 1, b: 1 }).not.toEqualTypeOf<{ a: number }>()

// toMatchTypeOf:（expect-type v1.2.0 以降は非推奨）代わりに toExtend を使います
expectTypeOf({ a: 1, b: 1 }).toMatchTypeOf({ a: 1 })

// toExtend: 実際の型が期待する型を拡張しているか調べます。
// expect の toMatchObject() に相当します
expectTypeOf({ a: 1, b: 1 }).toExtend({ a: 1 })
expectTypeOf<number>().toExtend<string | number>()
expectTypeOf<string | number>().not.toExtend<number>()

// toMatchObjectType: 厳密なプレーンオブジェクト検査で、toExtend より厳密です。
// オブジェクト型におすすめです（readonly プロパティーなどの問題を検出します）
expectTypeOf({ a: 1, b: 2 }).toMatchObjectType<{ a: number }>() // 推奨
expectTypeOf(user).toMatchObjectType<{ name: string; address: { city: string } }>()
```

- `toEqualTypeOf` type: `<T>(expected: T) => void`
- `toMatchTypeOf` type: `<T>(expected: T) => void` (deprecated)
- `toExtend` type: `<T>(expected: T) => void`
- `toMatchObjectType` type: `() => void`

> **Warning:** `toMatchObjectType` はプレーンなオブジェクト型でのみ動作します。ユニオン型やその他の複雑な型では失敗します。それらには `toExtend` を使ってください。

### 絞り込みアクセサー

```ts
// extract: ユニオンを一致するメンバーに絞ります
expectTypeOf(getResponsiveProp(cssProperties))
  .extract<{ xs?: any }>()
  .toEqualTypeOf<{ xs?: CSSProperties; sm?: CSSProperties; md?: CSSProperties }>()

expectTypeOf(getResponsiveProp(cssProperties))
  .extract<unknown[]>()
  .toEqualTypeOf<CSSProperties[]>()

// exclude: ユニオンからメンバーを取り除きます
expectTypeOf(getResponsiveProp(cssProperties))
  .exclude<unknown[]>()
  .exclude<{ xs?: unknown }>()
  .toEqualTypeOf<CSSProperties>()
```

- `extract` type: `ExpectTypeOf<ExtractedUnion>`
- `exclude` type: `ExpectTypeOf<NonExcludedUnion>`
- ユニオン内に型が見つからない場合、どちらも `never` を返します。

### 関数・コンストラクタ・コレクションのアクセサー

```ts
// returns: 関数型の戻り値を取り出します
expectTypeOf(() => {}).returns.toBeVoid()
expectTypeOf((a: number) => [a, a]).returns.toEqualTypeOf([1, 2])

// parameters: 関数の引数を配列として取り出します
type NoParam = () => void
type HasParam = (s: string) => void
expectTypeOf<NoParam>().parameters.toEqualTypeOf<[]>()
expectTypeOf<HasParam>().parameters.toEqualTypeOf<[string]>()

// parameter(nth): 引数を 1 つ取り出します
function foo(a: number, b: string) { return [a, b] }
expectTypeOf(foo).parameter(0).toBeNumber()
expectTypeOf(foo).parameter(1).toBeString()

// constructorParameters: コンストラクターの引数を配列として取り出します
expectTypeOf(Date).constructorParameters.toEqualTypeOf<[] | [string | number | Date]>()

// instance: 指定クラスのインスタンスに対するマッチャーです
expectTypeOf(Date).instance.toHaveProperty('toISOString')

// items: 配列要素の型です
expectTypeOf([1, 2, 3]).items.toEqualTypeOf<number>()
expectTypeOf([1, 2, 3]).items.not.toEqualTypeOf<string>()

// resolves: Promise の解決値です
expectTypeOf(asyncFunc).returns.resolves.toBeNumber()
expectTypeOf(Promise.resolve('string')).resolves.toBeString()

// guards: 型ガードの値です（例: `v is string`）
expectTypeOf(isString).guards.toBeString()

// asserts: アサーションの値です（例: `asserts v is number`）
expectTypeOf(assertNumber).asserts.toBeNumber()
```

- `returns`: `ExpectTypeOf<ReturnValue>`
- `parameters`: `ExpectTypeOf<Parameters>`
- `parameter`: `(nth: number) => ExpectTypeOf`
- `constructorParameters`: `ExpectTypeOf<ConstructorParameters>`
- `instance`: `ExpectTypeOf<ConstructableInstance>`
- `items`: `ExpectTypeOf<T>`
- `resolves`: `ExpectTypeOf<ResolvedPromise>`
- `guards`: `ExpectTypeOf<Guard>`
- `asserts`: `ExpectTypeOf<Assert>`

> **Warning:** 適用対象外の型では `returns`、`parameters`、`parameter`、`constructorParameters`、`instance`、`resolves`、`guards`、`asserts` は `never` を返すため、他のマッチャーと連結できません。

> **Note:** `.toBeCallableWith` は `.parameters` のより表現力のある代替です。`.toBeConstructibleWith` は `.constructorParameters` のより表現力のある代替です。

### branded

- **型:** `ExpectTypeOf<BrandedType>`

意味的には等価だが表現が異なる型に対するアサーションを成功させます：

```ts
// .branded なしでは、型が実質同じでも失敗します
expectTypeOf<{ a: { b: 1 } & { c: 1 } }>().toEqualTypeOf<{ a: { b: 1; c: 1 } }>()

// .branded ありではアサーションが通ります
expectTypeOf<{ a: { b: 1 } & { c: 1 } }>().branded.toEqualTypeOf<{ a: { b: 1; c: 1 } }>()
```

> **Warning:** `.branded` はパフォーマンスコストがかかり、過度に深い型では TypeScript コンパイラーが処理を諦める場合があります。控えめに使ってください。

### プリミティブ型と型マッチャー

以下のすべてのマッチャーは `()` => `void` 型です：

```ts
expectTypeOf<any>().toBeAny()
expectTypeOf({} as any).toBeAny()
expectTypeOf('string').not.toBeAny()

expectTypeOf().toBeUnknown()
expectTypeOf({} as unknown).toBeUnknown()
expectTypeOf('string').not.toBeUnknown()

expectTypeOf<never>().toBeNever()
expectTypeOf((): never => {}).returns.toBeNever()

expectTypeOf(42).not.toBeFunction()
expectTypeOf((): never => {}).toBeFunction()

expectTypeOf(42).not.toBeObject()
expectTypeOf({}).toBeObject()

expectTypeOf(42).not.toBeArray()
expectTypeOf([1, 2]).toBeArray()

expectTypeOf(42).not.toBeString()
expectTypeOf('a').toBeString()

expectTypeOf(42).not.toBeBoolean()
expectTypeOf(true).toBeBoolean()
expectTypeOf<boolean>().toBeBoolean()

expectTypeOf(() => {}).returns.toBeVoid()
expectTypeOf<void>().toBeVoid()

expectTypeOf(Symbol(1)).toBeSymbol()
expectTypeOf<symbol>().toBeSymbol()

expectTypeOf(null).toBeNull()
expectTypeOf(undefined).not.toBeNull()

expectTypeOf(undefined).toBeUndefined()
expectTypeOf(null).not.toBeUndefined()

// toBeNullable: 指定の型に null や undefined を組み合わせられます
expectTypeOf<undefined | 1>().toBeNullable()
expectTypeOf<null | 1>().toBeNullable()
expectTypeOf<undefined | null | 1>().toBeNullable()
```

- `toBeAny`、`toBeUnknown`、`toBeNever`、`toBeFunction`、`toBeObject`、`toBeArray`、`toBeString`、`toBeBoolean`、`toBeVoid`、`toBeSymbol`、`toBeNull`、`toBeUndefined`、`toBeNullable`。

### 呼び出し可能・構築可能なマッチャー

```ts
type NoParam = () => void
type HasParam = (s: string) => void

expectTypeOf<NoParam>().toBeCallableWith()
expectTypeOf<HasParam>().toBeCallableWith('some string')

expectTypeOf(Date).toBeConstructibleWith(new Date())
expectTypeOf(Date).toBeConstructibleWith('01-01-2000')
```

> **Warning:** 非関数型ではこれらは `never` を返すため、それ以上連結できません。

### toHaveProperty

- **型:** `<K extends keyof T>(property: K) => ExpectTypeOf<T[K]>`

プロパティの存在を確認し、そのプロパティの型に対するマッチャーを返すことで、連鎖したアサーションができます：

```ts
const obj = { a: 1, b: '' }

expectTypeOf(obj).toHaveProperty('a')
expectTypeOf(obj).not.toHaveProperty('c')

expectTypeOf(obj).toHaveProperty('a').toBeNumber()
expectTypeOf(obj).toHaveProperty('b').toBeString()
expectTypeOf(obj).toHaveProperty('a').not.toBeString()
```

## エラーの読み方

`expectTypeOf` については、[expect-type のエラーメッセージに関するドキュメント](https://github.com/mmkal/expect-type#error-messages)を参照してください。型が一致しない場合、`.toEqualTypeOf` と `.toExtend` は期待値を示す `MismatchInfo` 型を生成します。アサーションは流暢な API であるため、失敗は「期待される」型（`expect<Actual>().toEqualTypeOf<Expected>()`）側に報告されます。

例えば、これは `{ a: 1 }` の型が `{ a: string }` ではなく `{ a: number }` なため失敗します：

```ts
expectTypeOf({ a: 1 }).toEqualTypeOf<{ a: string }>()
```

```
error TS2344: Type '{ a: string; }' does not satisfy the constraint '{ a: "Expected: string, Actual: number"; }'.
  Types of property 'a' are incompatible.
    Type 'string' is not assignable to type '"Expected: string, Actual: number"'.
```

プロパティ名と `Expected: ... , Actual: ...` メッセージを読み、文字通りの割り当て可能性の文ではなくそちらを参照してください。

`toBe...` メソッド（`toBeString`、`toBeNumber`、`toBeVoid` など）は、呼び出し不可能な型に解決されることで失敗します：

```
error TS2349: This expression is not callable.
  Type 'ExpectString<number>' has no call signatures.
```

重要な部分は `ExpectString<number>` です。文字列をアサートした箇所に数値が渡されたことを意味します。

### 具体的な「期待」オブジェクトと型引数

具体的な値より型引数を優先してください：

```ts
// 分かりにくいエラー: 型引数は推論される必要があり、失敗時は
// 汎用の Mismatch 型と比較されます
expectTypeOf({ a: 1 }).toEqualTypeOf({ a: '' })

// 分かりやすい書き方
expectTypeOf({ a: 1 }).toEqualTypeOf<{ a: string }>()
```

2 つの具体的な型を比較する方が便利な場合は `typeof` を使います：

```ts
const one = valueFromFunctionOne({ some: { complex: inputs } })
const two = valueFromFunctionTwo({ some: { other: inputs } })

expectTypeOf(one).toEqualTypeOf<typeof two>()
```

> **Note:** `@ts-expect-error` を使う場合、型ファイルは `test.include` に含めて Vitest でも実行し、タイプミスで `ReferenceError` により失敗するようにしてください。これはエラーが期待されるためパスしますが、`answer` のスペルが間違っており、偽陽性となっています：

```ts
// @ts-expect-error answer is not a string
assertType<string>(answr)
```

## typecheck設定（実験的）

型チェックテスト環境を設定するオプションです。すべてのオプションは `test.typecheck` 配下にあります。

| Option | Type | Default | CLI |
|---|---|---|---|
| `enabled` | `boolean` | `false` | `--typecheck`, `--typecheck.enabled` |
| `only` | `boolean` | `false` | `--typecheck.only` |
| `checker` | `'tsc' \| 'vue-tsc' \| string` | `tsc` | — |
| `include` | `string[]` | `['**/*.{test,spec}-d.?(c\|m)[jt]s?(x)']` | — |
| `exclude` | `string[]` | `['**/node_modules/**', '**/dist/**', '**/cypress/**', '**/.{idea,git,cache,output,temp}/**']` | — |
| `allowJs` | `boolean` | `false` | — |
| `ignoreSourceErrors` | `boolean` | `false` | — |
| `tsconfig` | `string` | closest `tsconfig.json` | — |
| `spawnTimeout` | `number` | `10_000` | — |

- `enabled`：通常のテストと並行して型チェックを有効化します。
- `only`：型チェック有効時に型チェックテストだけ実行します。CLI 経由では自動的に型チェックが有効になります。
- `checker`：型チェックのために起動するツールです。`tsc --noEmit --pretty false` 互換の出力を生成する必要があります。`tsc` には `typescript` パッケージ、`vue-tsc` には `vue-tsc` が必要です。カスタムのバイナリパスやコマンド名も指定できます。
- `include` / `exclude`：型テストファイルとして扱うファイルの glob パターンです。
- `allowJs`：`@ts-check` コメント付きの JS ファイルをチェックします。有効な `tsconfig` 設定は上書きしません。
- `ignoreSourceErrors`：テストファイル外でエラーが見つかっても失敗しません（まったく表示されません）。デフォルトではソースエラーでスイートが失敗します。
- `tsconfig`：カスタム tsconfig へのパスです。プロジェクトルートからの相対パスです。
- `spawnTimeout`：タイプチェッカーを起動するための最小時間（ミリ秒）です。

## 要点

- 型テストは静的です。Vitest はファイルを実行せず、`tsc` / `vue-tsc` の出力を解析します。
- シンプルなアサーションには `assertType<T>(value)` を、連鎖したマッチャーには `expectTypeOf(value)` を使います。
- `toEqualTypeOf` は完全な等価性を要求します。`toExtend` はより広い形状との一致を許します。`toMatchObjectType` はオブジェクト専用の厳密なマッチャーです。
- `toBeString` などの型マッチャーは、呼び出し不可能な `ExpectString<number>` エラーで失敗します。
- 明確なエラーのため、具体的な期待値より型引数（`toEqualTypeOf<{ a: string }>()`）を優先してください。
- `.extract` / `.exclude` はユニオンを絞り込みます。一致がない場合どちらも `never` になります。
- `--typecheck`（または `typecheck.enabled`）で有効化します。ランタイムテストを省くには `typecheck.only` を使います。
- `@ts-expect-error` で守られたタイプミスを検出するため、型ファイルは `test.include` に含めます。

<!-- Sources: docs/guide/testing-types.md, docs/api/expect-typeof.md, docs/api/assert-type.md, docs/config/typecheck.md -->
