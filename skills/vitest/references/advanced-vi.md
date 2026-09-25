---
name: vi-helper
description: モジュールや関数のモック、スパイ、フェイクタイマー、グローバル / env スタブ、ホイスティング、非同期待機ユーティリティーのための vi ヘルパーを説明します。
---

# viヘルパー

Vitest は `vi` ヘルパー経由でモックやテストユーティリティーを提供します。`vitest` からインポートするか、`globals: true` でグローバルに使います：

```js
import { vi } from 'vitest'
```

## モジュールのモック

`vi.mock` は ESM の `import` でのみ動作し、`require()` では動作しません。

### vi.mock

```ts
interface MockOptions { spy?: boolean }
interface MockFactory<T> { (importOriginal: () => T): unknown }

function mock(path: string, factory?: MockOptions | MockFactory<unknown>): void
function mock<T>(module: Promise<T>, factory?: MockOptions | MockFactory<T>): void
```

`path` からのすべてのインポートを別のモジュールに置き換えます（Vite エイリアスも使えます）。呼び出しはホイストされるため、常にすべてのインポートより先に実行されます。ファクトリーは一度だけ呼ばれ、`vi.unmock` / `vi.doUnmock` まで後続のすべてのインポートでキャッシュされます。非同期ファクトリーにも対応します。`vi.mock` / `vi.hoisted` はテストファイル内でのみ使います。

ファクトリーの代わりに `{ spy: true }` を渡すと、モジュールを自動モックしつつ実装を呼び出し可能かつアサート可能なままにできます：

```ts
import { calculator } from './src/calculator.ts'

vi.mock('./src/calculator.ts', { spy: true })

const result = calculator(1, 2)
expect(result).toBe(3)
expect(calculator).toHaveBeenCalledWith(1, 2)
```

非同期ファクトリーは部分モックのために `importOriginal` を受け取ります：

```ts
vi.mock('./example.js', async (importOriginal) => ({
  ...(await importOriginal()),
  get: vi.fn(),
}))
```

文字列の代わりにモジュール Promise を指定すると IDE サポートが向上します。ファイル移動時にパスが更新され、`importOriginal` は型を継承し、ファクトリーの戻り値の型は元モジュールに対して検証されます（エクスポートは任意のままです）。

```ts
vi.mock(import('./path/to/module.js'), async (importOriginal) => {
  const mod = await importOriginal() // 型は推論されます
  return { ...mod, total: vi.fn() }
})
```

TypeScript の `paths` エイリアスでは、コンパイラーがインポート型を解決できるよう相対パス（`import('./path/to/module.js')`）を渡します。

> **Warning:** `vi.mock` はホイストされるため、ファクトリー外で定義された変数は使えません。`vi.doMock` を使うか、`vi.mock` より前に宣言された `vi.hoisted` の戻り値を参照してください：

```ts
import { namedExport } from './path/to/module.js'

const mocks = vi.hoisted(() => ({ namedExport: vi.fn() }))
vi.mock('./path/to/module.js', () => ({ namedExport: mocks.namedExport }))

vi.mocked(namedExport).mockReturnValue(100)
expect(namedExport()).toBe(100)
expect(namedExport).toBe(mocks.namedExport)
```

> **Warning:** Vitest はファイルを静的解析して `vi.mock` をホイストします。`vi` は `vitest` から直接インポートする（または `globals` を有効化する）必要があります。`setupFiles` ファイル内でインポートされたモジュールはキャッシュされ、モックされません。最初に `vi.hoisted` 内で `vi.resetModules()` を呼び出してキャッシュをクリアしてください。

> **Warning:** デフォルトエクスポートを持つモジュールをモックするには、ファクトリー結果に `default` キーが必要です（ESM の注意点）：

```ts
vi.mock('./path/to/module.js', () => ({
  default: { myDefaultKey: vi.fn() },
  namedExport: vi.fn(),
}))
```

ファクトリーがない場合、Vitest は隣接する `__mocks__` フォルダーから同名ファイルを使い、依存関係についてはプロジェクト `root` の `__mocks__` フォルダーを使います（`deps.moduleDirectories` で設定できます）：

```
- __mocks__/axios.js          // vi.mock('axios')
- src/__mocks__/increment.js  // vi.mock('../increment.js')
```

`__mocks__` ファイルもファクトリーも存在しない場合、Vitest は元モジュールをインポートし、すべてのエクスポートを自動モックします。Jest の自動モックを再現するには、`setupFiles` 内で各モジュールに `vi.mock` を呼び出してください。

### vi.doMock

```ts
function doMock(path: string, factory?: MockOptions | MockFactory<unknown>): Disposable
function doMock<T>(module: Promise<T>, factory?: MockOptions | MockFactory<T>): Disposable
```

`vi.mock` と同じですがホイストされません。ファイルスコープの変数を参照できます。次の動的インポートにだけ影響し、静的インポートはモックされません。Explicit Resource Management では、`using _mock = vi.doMock('my-module')` とすると、スコープを抜ける際に `vi.doUnmock()` が呼ばれます。

```ts
import { increment } from './increment.js' // まだモックされていません

vi.doMock('./increment.js', () => ({ increment: () => 100 }))
const { increment: mocked } = await import('./increment.js')
expect(mocked(1)).toBe(100)
```

### vi.mocked

```ts
function mocked<T>(object: T, deep?: boolean): MaybeMockedDeep<T>
function mocked<T>(object: T, options?: { partial?: boolean; deep?: boolean }): MaybePartiallyMockedDeep<T>
```

TypeScript ヘルパーで、オブジェクトをそのまま返します。デフォルトでは第一階層の値だけモック型となります。`{ deep: true }` でオブジェクト全体、`{ partial: true }` で `Partial<T>` を期待します（`partial` + `deep` で再帰します）。

```ts
vi.mock('./example')
vi.mocked(example.add).mockReturnValue(10)
vi.mocked(example.fetchSomething, { partial: true }).mockResolvedValue({ ok: false })
vi.mocked(example.getUser, { partial: true, deep: true }).mockReturnValue({ address: { city: 'LA' } })
```

### その他のモジュールヘルパー

- `importActual<T>(path: string): Promise<T>` — すべてのモックチェックを迂回してインポートします。部分モックに役立ちます：`vi.mock('./m.js', async () => ({ ...(await vi.importActual('./m.js')), get: vi.fn() }))`。
- `importMock<T>(path: string): Promise<MaybeMockedDeep<T>>` — `vi.mock` の規則に従い、すべてのプロパティ（ネスト含む）をモックしてモジュールをインポートします。
- `unmock(path: string | Promise<Module>): void` — モックレジストリーからモジュールを削除します。ホイストされるため、以前に定義されたモジュール（例えば `setupFiles` 内）のみアンモックします。
- `doUnmock(path: string | Promise<Module>): void` — ホイストされません。次のインポートは元モジュールを返します。既にインポート済みのモジュールは再評価されないため、既存のバインディングはモックされたままです。
- `resetModules(): Vitest` — モジュールキャッシュをクリアし、再インポート時に再評価します。トップレベルインポートは再評価できません。モックレジストリーはリセットしません。
- `dynamicImportSettled(): Promise<void>` — ネストしたものを含むすべての動的インポートと 1 回の `setTimeout` ティックを待ち、同期処理を完了させます：

```ts
renderComponent() // 待機できない import を開始します
await vi.dynamicImportSettled()
expect(document.querySelector('.component')).not.toBeNull()
```

## 関数とオブジェクトのモック

### vi.fn

```ts
function fn(fn?: Procedure | Constructable): Mock
```

関数へのスパイを作り、または `undefined` を返すベアモックを作ります。呼び出し引数、戻り値、インスタンスを記録します。動作は Mock API メソッドで設定します。実装としてクラスを渡せます（`vi.fn(class { get = () => 0 })`）。呼び出しや戻り値をアサートできます（`expect(fn).toHaveBeenCalled()`、`toHaveReturnedWith()`）。

### vi.mockObject (v3.2.0)

```ts
function mockObject<T>(value: T, options?: MockOptions): MaybeMockedDeep<T>
```

`vi.mock` がモジュールエクスポートをモックするように、プロパティやメソッドを深くモックします。関数プロパティは設定しない限り `undefined` を返します。非関数プロパティは値を保持します。`{ spy: true }` を渡すと実装を保持しつつ呼び出しを記録します。

```ts
const original = { simple: () => 'value', nested: { method: () => 'real' }, prop: 'foo' }
const mocked = vi.mockObject(original)

mocked.simple.mockReturnValue('mocked')
expect(original.prop).toBe(mocked.prop) // 'foo'

const spied = vi.mockObject(original, { spy: true })
expect(spied.simple()).toBe('value')
expect(spied.simple).toHaveBeenCalled()
```

### モック管理

- `isMockFunction(fn: unknown): asserts fn is Mock` — モック関数か確認し、型を絞り込みます。
- `clearAllMocks(): Vitest` — すべてのスパイに `.mockClear()` を呼びます。履歴をクリアし、実装は保持します。
- `resetAllMocks(): Vitest` — `.mockReset()` を呼びます。履歴をクリアし、実装をリセットします。
- `restoreAllMocks(): Vitest` — `vi.spyOn` で作ったスパイの元の実装を復元します。その後再びスパイできます。

> **Warning:** `restoreAllMocks` は自動モックされたモックに影響せず、`mock.mockRestore` とは異なりモック履歴のクリアやモック実装のリセットを行いません。

### vi.spyOn

```ts
function spyOn<T, K extends keyof T>(object: T, key: K, accessor?: 'get' | 'set'): Mock<T[K]>
```

メソッドや getter / setter へのスパイを作り、モック関数を返します：

```ts
let apples = 0
const cart = { getApples: () => 42 }

const spy = vi.spyOn(cart, 'getApples').mockImplementation(() => apples)
apples = 1

expect(cart.getApples()).toBe(1)
expect(spy).toHaveBeenCalled()
```

スパイ対象のメソッドがクラスの場合、実装は `function` または `class` を使う必要があります。アロー関数では `<anonymous> is not a constructor` で失敗します。getter / setter のスパイは第 3 引数を使います：`vi.spyOn(obj, 'prop', 'get')`。

> **Note:** Explicit Resource Management では、`using spy = vi.spyOn(console, 'log').mockImplementation(() => {})` とするとブロック終了時に自動復元されます。

> **Note:** `afterEach` で `vi.restoreAllMocks()` を呼ぶ（または `test.restoreMocks` を有効化する）と、元のプロパティ記述子が復元されるため、古いスパイオブジェクトではメソッド実装を変更できなくなります。代わりに再びスパイしてください。

> **Note:** Browser Mode ではエクスポートされたメソッドにスパイできません。代わりに `vi.mock('./file-path.js', { spy: true })` を呼び出し、すべてのエクスポートをモックしつつ実装を維持します。`jsdom` やその他の Node.js 環境ではエクスポートへのスパイはできますが、将来変更される可能性があります。

### グローバルとenvのスタブ

```ts
function stubEnv<T extends string>(
  name: T,
  value: T extends 'PROD' | 'DEV' | 'SSR' ? boolean : string | undefined
): Vitest
function unstubAllEnvs(): Vitest
function stubGlobal(name: string | number | symbol, value: unknown): Vitest
function unstubAllGlobals(): Vitest
```

- `stubEnv` は `process.env` と `import.meta.env` の両方の値を変更します。`unstubAllEnvs` は最初の `stubEnv` 呼び出し前の値に復元します。`import.meta.env` への直接代入は復元されません。
- `stubGlobal` は `globalThis` / `global` 上のグローバルに加え、`jsdom` や `happy-dom` 使用時は `window` / `top` / `self` / `parent` も変更します。`unstubAllGlobals` は元に戻します。直接代入は復元できません。

```ts
vi.stubEnv('NODE_ENV', 'production') // process.env と import.meta.env に影響します
vi.unstubAllEnvs() // "development" に戻します

vi.stubGlobal('innerWidth', 100)
vi.unstubAllGlobals()
```

## フェイクタイマー

```ts
function useFakeTimers(config?: FakeTimerInstallOpts): Vitest
function useRealTimers(): Vitest
```

`useFakeTimers` は `vi.useRealTimers()` が呼ばれるまで `setTimeout`、`setInterval`、`clearTimeout`、`clearInterval`、`setImmediate`、`clearImmediate`、`Date` をラップします（スケジュール済みタイマーは破棄されます）。`@sinonjs/fake-timers` を基盤とします。

> **Warning:** `--pool=forks` では `nextTick` のモックには対応していません。Node.js が `node:child_process` 内で `process.nextTick` を内部的に使うため、プロセスがハングする可能性があります。`--pool=threads` では使えます。

> **Note:** `useFakeTimers()` は `process.nextTick` と `queueMicrotask` を自動的にはモックしません。`vi.useFakeTimers({ toFake: ['nextTick', 'queueMicrotask'] })` で有効化します。

### タイマーの進行と実行

```ts
function advanceTimersByTime(ms: number): Vitest
function advanceTimersByTimeAsync(ms: number): Promise<Vitest>
function advanceTimersToNextTimer(): Vitest
function advanceTimersToNextTimerAsync(): Promise<Vitest>
function advanceTimersToNextFrame(): Vitest
function runAllTicks(): Vitest
function runAllTimers(): Vitest
function runAllTimersAsync(): Promise<Vitest>
function runOnlyPendingTimers(): Vitest
function runOnlyPendingTimersAsync(): Promise<Vitest>
function clearAllTimers(): void
function getTimerCount(): number
```

- `advanceTimersByTime` は `ms` が経過するかキューが空になるまで開始済みのすべてのタイマーを実行します。非同期版は非同期に設定されたタイマーも処理します。
- `advanceTimersToNextTimer` は次に利用可能なタイマーを呼び出し、連鎖できます。非同期版は非同期タイマーの解決を待ちます。`advanceTimersToNextFrame` は保留中の `requestAnimationFrame` コールバックに必要なミリ秒だけ進めます。
- `runAllTicks` は `process.nextTick` でキューに入ったすべてのマイクロタスクを実行します（自己スケジュール分を含む）。
- `runAllTimers` / `runAllTimersAsync` は呼び出し中にスケジュールされたものを含めすべてのタイマーを発火します。無限インターバルは 10,000 回試行後に投げます（`fakeTimers.loopLimit` で設定できます）。
- `runOnlyPendingTimers` / `runOnlyPendingTimersAsync` は `useFakeTimers` 後に開始されたタイマーだけ呼び出します。呼び出し中に開始されたタイマーは発火しません。
- `clearAllTimers` はスケジュール済みのすべてのタイマーを削除します。`getTimerCount` は待機中のタイマー数を返します。

```ts
let i = 0
setInterval(() => Promise.resolve().then(() => console.log(++i)), 50)

await vi.advanceTimersByTimeAsync(150) // 1、2、3 を記録します
vi.advanceTimersToNextTimer().advanceTimersToNextTimer() // 1、2 を記録します

requestAnimationFrame(() => { frameRendered = true })
vi.advanceTimersToNextFrame() // frameRendered === true
```

### システム時刻とタイマー状態

```ts
function setSystemTime(date: string | number | Date): Vitest
function getMockedSystemTime(): Date | null
function getRealSystemTime(): number
function isFakeTimers(): boolean
```

- フェイクタイマー有効時、`setSystemTime` はタイマーを発火させずに時計変更を模擬します（`hrtime`、`performance.now`、`new Date()` に影響します）。フェイクタイマーなしでは `Date.*` 呼び出しだけモックします。`Date` と同じ引数を受け付けます。
- `getMockedSystemTime` はモックされた日付または `null` を返します。`getRealSystemTime` は `Date.now` のモック中も実際のエポックミリ秒を返します。`isFakeTimers` はフェイクタイマーが有効かを報告します。

```ts
vi.useFakeTimers()
vi.setSystemTime(new Date(1998, 11, 19))
expect(Date.now()).toBe(new Date(1998, 11, 19).valueOf())
vi.useRealTimers()
```

### vi.setTimerTickMode (v4.1.0)

```ts
function setTimerTickMode(mode: 'manual' | 'nextTimerAsync' | 'interval', interval?: number): Vitest
```

- `manual`（デフォルト）：`vi.advanceTimers...()`メソッドでのみ時刻が進む。
- `nextTimerAsync`：各マクロタスク後に次の利用可能なタイマーへ自動的に進む。
- `interval`：指定間隔で自動的に進む（`fakeTimers.shouldAdvanceTime`が`true`の場合のデフォルト）。

## その他

### vi.waitFor

```ts
function waitFor<T>(callback: WaitForCallback<T>, options?: number | WaitForOptions): Promise<T>
```

成功またはタイムアウトまでコールバックを再試行します。投げられた場合や拒否された Promise を返した場合、待機を継続します。数値引数は `{ timeout: number }` と等価です。デフォルトは `timeout` 1000 ms、`interval` 50 ms です。

```ts
await vi.waitFor(
  () => { if (!server.isReady) throw new Error('Server not started') },
  { timeout: 500, interval: 20 }
)
```

非同期コールバックを使えます。`vi.useFakeTimers` 動作中は `vi.waitFor` が各チェックで自動的に `vi.advanceTimersByTime(interval)` を呼びます。

### vi.waitUntil

```ts
function waitUntil<T>(callback: WaitUntilCallback<T>, options?: number | WaitUntilOptions): Promise<T>
```

`vi.waitFor` と似ていますが、投げられたエラーでは即中断し、falsy な戻り値では truthy になるまでポーリングを継続します。デフォルトは同じです（`timeout` 1000 ms、`interval` 50 ms）。

### vi.hoisted

```ts
function hoisted<T>(factory: () => T): T
```

静的インポートをライブバインディングを保ったまま動的インポートに変換し、インポートより先にコードを実行します。ファクトリー値を返し、`vi.mock` ファクトリー内で使えます（上記例を参照）。

> **Warning:** インポートされた変数は `vi.hoisted` 内では使えません（アクセスすると `Cannot access '__vi_import_0__' before initialization` で投げます）。避けられない場合はファクトリー内で動的 `import()` を使ってください。トップレベル await がなくてもファクトリーは非同期にできます。

### vi.setConfig / vi.resetConfig

```ts
function setConfig(config: RuntimeOptions): void
function resetConfig(): void
```

`setConfig` は現在のテストファイルだけ設定を更新し、`allowOnly`、`testTimeout`、`hookTimeout`、`clearMocks`、`restoreMocks`、`fakeTimers`（オブジェクト全体）、`maxConcurrency`、`sequence.hooks` をサポートします。`resetConfig` は元の状態に復元します。

```ts
vi.setConfig({
  testTimeout: 10_000,
  clearMocks: true,
  restoreMocks: true,
  fakeTimers: { now: new Date(2021, 11, 19) },
  maxConcurrency: 10,
  sequence: { hooks: 'stack' },
})
```

### vi.defineHelper (v4.1.0)

```ts
function defineHelper<F extends (...args: any) => any>(fn: F): F
```

アサーションヘルパーを作るため関数をラップします。失敗時、スタックトレースはヘルパー内部ではなくヘルパー呼び出し箇所を指します。同期・非同期関数に対応し、`expect.soft()` を使えます。

```ts
const assertPair = vi.defineHelper((a, b) => {
  expect(a).toEqual(b)
})

test('example', () => {
  assertPair('left', 'right') // エラーはこの行を指します
})
```

## 要点

- `vi.mock` / `vi.unmock` はホイストされます。`vi.doMock` / `vi.doUnmock` はホイストされず、次のインポートにだけ影響します。
- ファイルスコープとモックファクトリー間で変数を共有するには `vi.hoisted` を使います。
- `vi.spyOn` は `vi.restoreAllMocks` で復元しますが、モック履歴はクリアしません。
- フェイクタイマーは `vi.useFakeTimers()` で有効化し、`vi.useRealTimers()` で終了します。
- `vi.waitFor` はあらゆる失敗で再試行します。`vi.waitUntil` は投げられたエラーで中断し、falsy 値のポーリングを継続します。

<!-- Sources: docs/api/vi.md -->
