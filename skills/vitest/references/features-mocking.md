---
name: features-mocking
description: Vitest の vi ユーティリティーでモック関数、モジュール、タイマー、日付、グローバル、ファイルシステム、リクエストをモックする方法を説明します。
---

# モック

Vitest は `vitest` からインポートする（または `globals` 設定有効時はグローバルに使える）`vi` ヘルパー経由でモックユーティリティーを提供します。モック関数、クラス、日付、タイマー、グローバル、ファイルシステム、モジュール、ネットワークリクエストをカバーします。

> **Warning:** 実行間でモック状態の変更を取り消すため、各テストの前後で必ずモックをクリアまたは復元してください。`mockReset`、`clearMocks`、`restoreMocks`、`vi.resetAllMocks()` を参照してください。

## チートシート

### エクスポート変数のモック

```ts
import * as exports from './example.js'
vi.spyOn(exports, 'getter', 'get').mockReturnValue('mocked')
```

> **Warning:** ブラウザーモードでは動作しません。

### エクスポート関数のモック

`vi.mock` はファイル先頭に巻き上げられ、常にすべてのインポートより先に実行されます:

```ts
import { method } from './example.js'

vi.mock('./example.js', () => ({
  method: vi.fn(),
}))
```

または名前空間にスパイします（`vi.spyOn(exports, 'method').mockImplementation(() => {})`）。ブラウザーモードでは動作しません。

### エクスポートクラスの実装モック

```ts
vi.mock(import('./example.js'), () => {
  const SomeClass = vi.fn(class FakeClass {
    someMethod = vi.fn()
  })
  return { SomeClass }
})
```

### 関数が返すオブジェクトへのスパイ

ファクトリー内でオブジェクトをキャッシュし、毎回同じ参照を返すようにします:

```ts
vi.mock(import('./example.js'), () => {
  let _cache
  const useObject = () => (_cache ??= { method: vi.fn() })
  return { useObject }
})

expect(useObject().method).toHaveBeenCalled()
```

### モジュールの一部のモック

```ts
vi.mock(import('./some-path.js'), async (importOriginal) => {
  const mod = await importOriginal()
  return {
    ...mod,
    mocked: vi.fn(),
  }
})
original() // 元の振る舞いです
mocked()   // スパイ関数です
```

> **Warning:** これは *外部* アクセスだけモックします。`original` が内部で `mocked` を呼ぶ場合、モックファクトリーではなくモジュール定義の関数を常に呼びます。

### 現在日付、グローバル、env のモック

```ts
const mockDate = new Date(2022, 0, 1)
vi.setSystemTime(mockDate)
expect(new Date().valueOf()).toBe(mockDate.valueOf())
vi.useRealTimers() // モックした時刻を戻します

vi.stubGlobal('__VERSION__', '1.0.0') // vi.unstubAllGlobals() で戻します
vi.stubEnv('VITE_ENV', 'staging')    // vi.unstubAllEnvs() で戻します
expect(import.meta.env.VITE_ENV).toBe('staging')
```

`unstubGlobals` / `unstubEnvs` 設定が有効でない限り、`vi.setSystemTime` と `vi.stubGlobal` / `vi.stubEnv` はテスト間で自動リセットされません。`import.meta.env` への直接代入もできますが、手動復元が必要です（例: `beforeEach` 内）。

## モック関数

- `vi.spyOn()` はオブジェクトのメソッドを監視して呼び出しを追跡します。
- `vi.fn()` は引数として渡すかモック対象として使う新規モック関数を作ります。

両者は同じメソッドを共有します。

```js
it('should get the latest message with a spy', () => {
  const spy = vi.spyOn(messages, 'getLatest')
  expect(spy.getMockName()).toEqual('getLatest')

  expect(messages.getLatest()).toEqual(messages.items.at(-1))
  expect(spy).toHaveBeenCalledTimes(1)

  spy.mockImplementationOnce(() => 'access-restricted')
  expect(messages.getLatest()).toEqual('access-restricted')
  expect(spy).toHaveBeenCalledTimes(2)
})
```

コールバックとして渡す場合も `vi.fn()` は同様に使います: `messages.onItem(callback); expect(callback).toHaveBeenCalledWith(...)`。

## クラスのモック

クラス全体を 1 回の `vi.fn` 呼び出しでモックします。または `vi.spyOn().mockImplementation()` を使います:

```ts
const Dog = vi.fn(class {
  static getType = vi.fn(() => 'mocked animal')

  constructor(name) {
    this.name = name
  }

  greet = vi.fn(() => `Hi! My name is ${this.name}!`)
  speak = vi.fn(() => 'loud bark!')
  feed = vi.fn()
})
```

> **Warning:** コンストラクター関数が非プリミティブを返すと、その値が `new` 式の結果となり、`[[Prototype]]` が正しく束縛されない場合があります（`new CorrectDogClass('Marti') instanceof CorrectDogClass` は `vi.fn(function (name) { this.name = name })` では true ですが、`vi.fn(name => ({ name }))` では false になります）。クラスをモックする場合は関数よりクラス構文を優先してください。

他モジュールから再エクスポートされる場合はモジュールファクトリー内でクラスを再作成します:

```ts
vi.mock(import('./dog.js'), () => {
  const Dog = vi.fn(class { feed = vi.fn() })
  return { Dog }
})
```

直接代入したメソッドはインスタンス間で共有されません: `expect(Max.speak).not.toHaveBeenCalled()`。`vi.mocked`（モック検証なしに関数を `Mock<T>` でラップする型ヘルパー）でインスタンスごとに返り値を再指定します:

```ts
const dog = new Dog('Cooper')
vi.mocked(dog.speak).mockReturnValue('woof woof')
dog.speak() // ワンワン
```

`vi.spyOn(object, 'name', 'get')` でプロパティをモックします。getter と setter の両方に対応します:

```ts
const nameSpy = vi.spyOn(dog, 'name', 'get').mockReturnValue('Max')
expect(dog.name).toBe('Max')
expect(nameSpy).toHaveBeenCalledTimes(1)
```

> **Warning:** `vi.fn()` でのクラス使用は Vitest 4 で導入されました。以前は `function` と `prototype` 継承を直接使う必要がありました。

## 日付のモック

Vitest はタイマーとシステム日付の操作に `@sinonjs/fake-timers` を使います。

```js
beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

vi.setSystemTime(new Date(2000, 1, 1, 13))
expect(purchase()).toEqual({ message: 'Success' }) // 営業時間内です

vi.setSystemTime(new Date(2000, 1, 1, 19))
expect(purchase()).toEqual({ message: 'Error' }) // 営業時間外です
```

## タイマーのモック

フェイクタイマーはタイムアウトやインターバルを含むテストを高速化します。

```js
beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.clearAllMocks()
})

it('should execute the function', () => {
  executeAfterTwoHours(mock)
  vi.runAllTimers()
  expect(mock).toHaveBeenCalledTimes(1)
})

it('should not execute the function', () => {
  executeAfterTwoHours(mock)
  vi.advanceTimersByTime(2) // 2ms is not enough
  expect(mock).not.toHaveBeenCalled()
})
```

主な操作: `vi.useFakeTimers()`、`vi.useRealTimers()`、`vi.runAllTimers()`、`vi.runOnlyPendingTimers()`、`vi.advanceTimersByTime(ms)`、`vi.advanceTimersToNextTimer()`、および `vi.advanceTimersByTimeAsync(ms)` などの非同期版です。

## グローバルのモック

`jsdom` や `node` が提供しないグローバルには `vi.stubGlobal` を使います。`globalThis` に書き込みます。`unstubGlobals` 有効時や `vi.unstubAllGlobals()` 呼び出し時を除き、値はデフォルトでリセットされません。

```ts
const IntersectionObserverMock = vi.fn(class {
  observe = vi.fn()
  unobserve = vi.fn()
})

vi.stubGlobal('IntersectionObserver', IntersectionObserverMock)
// `IntersectionObserver` または `window.IntersectionObserver` として使えます
```

## ファイルシステムのモック

Vitest にファイルシステムモック API は組み込まれていません。推奨方法はインメモリーファイルシステムの `memfs` です。プロジェクトルートに `__mocks__/fs.cjs` と `__mocks__/fs/promises.cjs` を作ります:

```ts [__mocks__/fs.cjs]
const { fs } = require('memfs')
module.exports = fs
// __mocks__/fs/promises.cjs: module.exports = fs.promises
```

```ts [hello-world.test.js]
import { beforeEach, expect, it, vi } from 'vitest'
import { fs, vol } from 'memfs'
import { readHelloWorld } from './read-hello-world.js'

vi.mock('node:fs')
vi.mock('node:fs/promises')

beforeEach(() => {
  vol.reset()
})

it('should return correct text', () => {
  fs.writeFileSync('/hello-world.txt', 'hello world')
  expect(readHelloWorld('/hello-world.txt')).toBe('hello world')
})
```

複数ファイルを一括定義するには `vol.fromJSON({ './dir1/hw.txt': 'hello dir1' }, '/tmp')` を使います。ディスクからテストを分離し、副作用を回避し、権限エラーや読み書き失敗などの境界ケースを検証できます。

## モジュールのモック

用語: **モックモジュール**は完全置換されます。**スパイモジュール**は元の実装を保持しつつ追跡します。**モック / スパイエクスポート**は追跡可能な個別エクスポートです。

`vi.mock` とファクトリーでモジュールを完全置換します:

```ts
vi.mock(import('./example.js'), () => {
  return {
    answer() {
      return 42
    },
    variable: 'mock',
  }
})
```

`vi.mock` はセットアップファイルで呼び出すと全テストファイルにモックを適用できます。動的インポート形式（`import('./example.ts')`）により TypeScript が文字列を検証し、`importOriginal` に型を付けます。ファクトリーが返さないメソッドへのアクセスは例外になります。未追跡エクスポートは `vi.fn()` で追跡可能になります。

ファクトリーは元のモジュールオブジェクトを返す非同期 `importOriginal` を受け取ります:

```ts
vi.mock(import('./example.js'), async (importOriginal) => {
  const originalModule = await importOriginal()
  return {
    answer: vi.fn(originalModule.answer),
    variable: 'mock',
  }
})

expect(answer()).toBe(42)
expect(answer).toHaveBeenCalled()
```

> **Warning:** `importOriginal` は非同期です。必ず await します。

モジュール置換ではなく 1 エクスポートにスパイするには名前空間オブジェクトを使います:

```ts
import * as exampleObject from './example.js'

vi.spyOn(exampleObject, 'answer').mockReturnValue(0)
expect(exampleObject.answer()).toBe(0)
expect(exampleObject.answer).toHaveBeenCalled()
```

> **Warning (Browser Mode):** ネイティブ ESM ではモジュール名前空間が封印されるため、名前空間への `vi.spyOn` は動作しません。`vi.mock('./example.js', { spy: true })` を使い、`vi.mocked(exampleObject.answer).mockReturnValue(0)` とします。

`vi.spyOn` はスパイ設置後の呼び出しだけ報告します。インポート前に任意モジュールを自動モックするには、パスのみで `vi.mock` を呼びます:

```ts
vi.mock(import('./example.js'))
```

`./__mocks__/example.js` が存在すれば Vitest はそれを読み込みます。なければ元を読み込み、再帰的にすべて置換します（自動モック）:

- すべての配列は空になります。
- すべてのプリミティブはそのまま残ります。
- すべての getter は `undefined` を返します。
- すべてのメソッドは `undefined` を返します。
- すべてのオブジェクトは深く複製されます。
- クラスとプロトタイプの全インスタンスは複製されます。

`spy: true` を渡すと元の実装を呼びつつ呼び出しを追跡します:

```ts
vi.mock(import('./example.js'), { spy: true })

expect(answer()).toBe(42) // 元の実装を呼びます
expect(answer).toHaveBeenCalled()
```

モックモジュールはインスタンスとプロトタイプ間で状態を共有する。`vi.mock(import('./answer.js'), { spy: true })` 後の例:

```ts
const answer1 = new Answer(42)
const answer2 = new Answer(0)

expect(answer1.value()).toBe(42)
expect(answer1.value).toHaveBeenCalled()
expect(answer2.value).not.toHaveBeenCalled() // インスタンスごとに状態を持ちます

// プロトタイプの状態に全呼び出しが蓄積されます
expect(Answer.prototype.value).toHaveBeenCalledTimes(2)
```

これによりテストに公開されないインスタンスへの呼び出しも追跡できます。

### 存在しないモジュールのモック

ディスクに実体のない仮想モジュールをモックするには、`test.alias` 設定オプションでインポートをリダイレクトします（`alias: { vscode: resolve(import.meta.dirname, './mock/vscode.js') }`）。またはプラグインの `resolveId` フックで常に解決済みとしてマークします（`if (id === 'vscode') return 'vscode'`）。その後通常通り `vi.mock` を使います: `vi.mock(import('vscode'), () => ({ window: { createOutputChannel: vi.fn() } }))`。

### 動作の仕組み

ファイル内に `vi.mock` を見つけると、Vitest はすべての静的インポートを動的インポートに変換し、`vi.mock` 呼び出しを先頭に移動してインポート前にモックを登録します。ESM の巻き上げを保ちつつ、モジュール変更なしにモック解決を先行させる `__handle_mock__` ラッパーです。プラグインは `@vitest/mocker` にあります。

JSDOM、happy-dom、Node では、モジュールランナーがモジュール評価にフックして登録済みモックに置換するため、ES モジュールへの `vi.spyOn` ができます。モジュールランナー無効時で node ローダーのみの場合は、代わりに Node ローダーフックを登録し、ES モジュールへの `vi.spyOn` は動作しません。ブラウザーモードはネイティブ ESM を使います。Vitest は fetch リクエストを傍受し（Playwright の `page.route`、または `preview` / `webdriverio` 用の Vite プラグイン）、変換コードを提供し、自動モックした静的エクスポートを `vi.fn()` プレースホルダーに置換します（`spy: true` では保持します）。

### モジュールモックの落とし穴

同一ファイル内の他メソッドから行われるメソッド呼び出しはモックできません。直接参照されるためです:

```ts [foobar.js]
export function foo() {
  return 'foo'
}

export function foobar() {
  return `${foo()}bar`
}
```

`vi.spyOn(mod, 'foo')` も `foo` を置換する `vi.mock` ファクトリーも、`foobar` 内の `foo` 呼び出しには影響しません（他モジュールからの `foo` 呼び出しには影響します）。これは意図した仕様です。複数ファイルへの分割や依存性注入でリファクタリングしてください。

## リクエストのモック

Vitest は Node で実行され、ネットワーク用 Web API は使えません。推奨ライブラリーは Mock Service Worker（MSW）で、アプリケーションコードを変更せずに `http`、`WebSocket`、`GraphQL` リクエストをモックします。セットアップファイルで設定します:

```js
import { afterAll, afterEach, beforeAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

const restHandlers = [
  http.get('https://rest-endpoint.example/path/to/posts', () =>
    HttpResponse.json(posts)),
]

const server = setupServer(...restHandlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => server.resetHandlers())
```

GraphQL は `graphql.query('ListPosts', () => HttpResponse.json({ data: { posts } }))` を使います。WebSocket は `ws.link('wss://chat.example.com')` と `chat.addEventListener('connection', ...)` を使います。

> **Note:** `onUnhandledRequest: 'error'` は一致ハンドラーがないリクエストがあると例外をスローします。MSW は Cookie やクエリパラメーターにもアクセスでき、モックのエラーレスポンスも定義できます。

## 要点

- テスト間でモック状態をクリア / リセット / 復元します（`clearMocks`、`mockReset`、`restoreMocks`、または明示呼び出し）。
- `vi.mock` は巻き上げられ、インポートより先に実行されます。非巻き上げの動的モックには `vi.doMock` を使い、取り消しには `vi.unmock` / `vi.doUnmock` を使います。
- 元の実装を保持しつつ呼び出し追跡するには `{ spy: true }` を使います。
- 自動モックはメソッドを `undefined` を返すモックに置換します。配列は空化され、getter は `undefined` を返します。
- モックファクトリー内で参照する変数の定義には `vi.hoisted` を使います。

<!-- Sources: docs/guide/mocking.md, docs/guide/mocking/classes.md, docs/guide/mocking/dates.md, docs/guide/mocking/file-system.md, docs/guide/mocking/functions.md, docs/guide/mocking/globals.md, docs/guide/mocking/modules.md, docs/guide/mocking/requests.md, docs/guide/mocking/timers.md -->
