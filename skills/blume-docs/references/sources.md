---
name: blume-sources
description: ローカルファイル・リモートリポジトリ・CMS などからドキュメントを取得するコンテンツソースを説明します。複数ソースの統合とカスタムアダプターを扱います。
---

# コンテンツソース

Blume はデフォルトで `.md`/`.mdx` ファイルのフォルダーを読み込みます。**コンテンツソース**を使うと、リモートリポジトリ、CMS、任意のカスタムバックエンドなど、別の場所からページを取得し、複数のソースを1つのサイトに統合できます。ソースはビルド時に読み込まれ、Blume はスタティックファーストのままです。

## デフォルトの動作 [#the-default]

設定を行わない場合、Blume はコンテンツルート（デフォルトでは `docs`）を1つのファイルシステムソースとしてスキャンします。トップレベルの `content.root`、`content.include`、`content.exclude` オプションはその単一ソースの省略記法であり、インポートするものも変更するものもありません。

```ts blume.config.ts
import { defineConfig } from "blume";

export default defineConfig({
  content: { root: "docs" },
});
```

## アダプター [#adapters]

`content.sources` の各エントリは**アダプター**です。アダプターは `blume/sources` からインポートするファクトリーで、Blume がビルド時に読み込むプレーンなディスクリプターを返します。ソースを組み合わせるには `sources` 配列を追加します。`sources` が存在する場合は暗黙のデフォルトが置き換えられるため、ローカルドキュメント用に `filesystem()` エントリを含め、`root`、`include`、`exclude` をそこへ移動してください。省略記法と `sources` は併用できません。その場合、Blume はどのフィールドを移動すべきかを報告します。

```ts blume.config.ts
import { defineConfig } from "blume";
import { filesystem, mdxRemote } from "blume/sources";

export default defineConfig({
  content: {
    sources: [
      // Local docs at the site root
      filesystem({ root: "docs" }),

      // Remote MDX from a GitHub repo, mounted under /sdk
      mdxRemote({
        prefix: "sdk",
        github: { owner: "acme", repo: "sdk", ref: "main", path: "docs" },
      }),
    ],
  },
});
```

各組み込みアダプターは `blume/sources` からエクスポートされるファクトリーで、以下のそれぞれのセクションで説明します。それ以外のバックエンドは [`custom()`](#custom-sources) で組み込めます。オプションオブジェクトを受け取るすべてのアダプターは、2つの共通オプションを受け付けます。

- **`prefix`** はソースのルートを `/<prefix>/…` の下に名前空間として分けます。この値は、診断メッセージにおけるソース名およびキャッシュディレクトリ名にもなります。2つのソースが同じルートに解決される場合、Blume は `BLUME_DUPLICATE_ROUTE` ビルドエラーを報告します。各ソースには異なる `prefix` を指定してください。
- **`pollInterval`**（秒）を設定すると、開発環境でリモートソースがその間隔で再取得を行い、コンテンツが実際に変更された場合にのみリロードします。未設定のままにすると、一度だけ取得してそのセッション中は固定されます。ローカルソース（`filesystem()`、`obsidian()`）は代わりにファイルシステムを監視するため、このオプションは無視されます。

`custom(source)` は例外です。オプションオブジェクトではなく `ContentSource` インスタンスを受け取るため、`prefix` や `pollInterval` を渡す場所がありません。ソース自身が `prefix` プロパティを設定し、再取得の動作はその `watch` メソッドの実装に従います。

アダプターのディスクリプターは、必要とする SDK と読み込む環境変数も宣言します。そのため、生成されるプロジェクトはそのパッケージを宣言し、`blume dev` と `blume build` は変数が未設定の場合に警告を出し、`blume doctor` は設定済みのソースを一覧表示します。オプションは設定の読み込み時に検証されます。必須オプションの欠落、不明なキー、または 1.x の `{ type: "…" }` オブジェクトの残存があると、修正方法を示すメッセージとともに失敗します。

`filesystem()` ソースが1つだけの場合、生成されるドキュメントコレクションはそのソース自身のディレクトリをルートとします。複数のファイルシステムソースは1つのルートを共有し、`include` の glob でそれを分割する必要があります。別の場所をルートとする2つ目のソースは `BLUME_ENTRY_ID_MISMATCH` として報告されるため、そのページが気づかないうちに 404 になることはありません。

## Obsidian

組み込みの `obsidian()` アダプターは、[Obsidian](https://obsidian.md) の Vault をその場で読み込みます。エクスポート手順は不要で、リポジトリに何かが生成されることもありません。Vault が信頼できる唯一の情報源のままであり、Blume は読み込みの際に Obsidian の方言を Markdown へと変換します。

```ts blume.config.ts
import { defineConfig } from "blume";
import { filesystem, obsidian } from "blume/sources";

export default defineConfig({
  content: {
    sources: [
      filesystem({ root: "docs" }),
      obsidian({
        prefix: "notes",
        vault: "vault",
        // Vault folder names to skip at any depth, on top of dot-folders
        exclude: ["Templates", "Daily"],
      }),
    ],
  },
});
```

`[[Wikilinks]]` はルートへのリンクになり、Obsidian がノートを指し示すのと同じように、パスではなく Vault 全体を通じたノート名で解決されます。カスタムのリンクテキスト（`[[Note|label]]`）、見出しアンカー（`[[Note#Install]]`）、フルパス（`[[folder/Note]]` および `[[folder/Note.md]]`）、Obsidian のデフォルト設定「可能な場合は最短のパス」が書き出す部分パス（`[[guides/Note]]`）、そして Obsidian がテーブルセル内で書き出す `[[Note\|label]]` の形式はいずれも動作し、フロントマターで `slug` を設定しているノートは、その slug が公開するルートへリンクされます。2つのノートが同じ名前を共有する場合は、Vault のフルパスがちょうどその名前と一致するノートが優先され（Obsidian はリンクを名前より先にパスとして解決します）、次に Vault の順序で最初のもの（Obsidian のファイルエクスプローラーと同じく、大文字小文字を区別せず、ノートよりフォルダーが先）が優先されます。Blume が警告を出すのは、wikilink が実際にそのような衝突を経て解決された場合のみです。曖昧さを解消するには、より長いパスを書いてください。ブロック参照（`[[Note#^id]]`）は、アンカーなしでそのノートへリンクします。ブロックは着地先となる id を持たずにレンダリングされるためです。見出しアンカーは対象ノートの実際の見出しに対して解決され、Obsidian のオートコンプリートが書き出すのと同じ方法（`**bold**`、`` `code` ``、リンク記法を取り除いた形）で照合され、ページマニフェストを埋めるのと同じ `extractHeadings` の処理によって slug 化されます。そのため `#Install` へのリンクは、どのページも出力しない id ではなく、その見出しに着地します。`[[#Install]]` は、書いているノート自身の見出しを指します。存在しない見出しへのリンクは、ページへのリンクは維持したままアンカーを削除し、警告を出します。

フロントマターは、Blume の[ページスキーマ](frontmatter.md)が受け付けるものに加え、[`frontmatter.extend`](frontmatter.md#custom-keys)（または、その `type` のノートについてはコンテンツタイプの `frontmatter`）で宣言したキーを保持します。それ以外の Obsidian のプロパティ — Dataview のフィールド、Templater の日付、`publish`、および Obsidian 自身の `tags`、`aliases`、`cssclasses` — は、ノートの変換時に削除されます。そのため、Properties UI で書かれた Vault もフロントマターのエラーなくビルドできます。`aliases` は解決されるのではなく削除されます。エイリアスによるリンク先はまだサポートされていません。ノートの隣にある相対パスの Markdown 画像（`![chart](./chart.png)`）は Vault から提供され、Vault が git リポジトリ内にある場合、Vault のページも他のページと同様に git 由来の[「最終更新」日付](configuration.md#last-modified)を取得します。「このページを編集」リンクは `github.dir` を通じて解決されるため、モノレポでドキュメントアプリの隣に置かれた Vault でもそのファイルへリンクされます。リポジトリ外の Vault にはリンクは付きません。

Vault 内のロケールディレクトリとバージョンスナップショットは、ファイルシステムソースが読み込むのと同じように読み込まれます。[i18n](i18n.md) を設定していれば `fr/Note.md` は `/fr/` 配下に、[バージョン](versioning.md)を設定していれば `v1.0/Note.md` は `/v1.0/` 配下に公開され、それらのノートへの wikilink はそれぞれが公開するルートを指します。

`index` ノートへのリンクは、実体のない `/index` ではなくそのフォルダーのルートに着地します。**解決できない wikilink は、ビルドを失敗させる代わりに、ビルド警告を出したうえでプレーンテキストに縮退します**。そのため、リファクタリング途中の Vault でも公開できます。単一行の `%%comments%%` は取り除かれ、HTML コメント内の wikilink（`<!-- [[Draft]] -->`）は Obsidian でも非表示になるためそのまま残され、フロントマターに `title` がないノートはファイル名がタイトルになります — これは Obsidian 自身が適用するのと同じルールです。唯一の例外は `index` ノートで、これはノートではなくルートを指すため、そのタイトルは Blume の通常の導出（最初の見出し、次に人間可読化したセグメント）にフォールバックします。フェンス付き、インデント付き、およびインラインのコードはそのまま通過するため、この構文を説明するノートも壊れません。

ドットフォルダーはスキップされます。これには Obsidian 自身の `.obsidian` 設定ディレクトリと `.trash` が含まれ、開発時のウォッチャーもこれらを無視するため、アプリでペインを移動したりノートをゴミ箱に削除したりしてもサイトは再ビルドされません。ノートの編集では再ビルドされます。どのコンテンツスキャンも読み込まないディレクトリ（`node_modules`、`dist`、`.git` など）もスキップされるため、プロジェクト自体をルートとする Vault が依存関係の README を公開することはありません。パスに `#` または `?` を含むノートは、[コンテンツファイル](page.md#files-and-routes)の場合と同様に、エラーを出したうえで除外されます。Astro がそのコピーを読み込めないため、名前を変更してください。Vault 内のシンボリックリンクは、ファイルシステムソースがたどるのと同じようにたどられるため、Vault にリンクされた共有フォルダーも一緒に公開されます。ファイルシステムソースのルート内にある Vault は、そこから除外する必要があります（`filesystem({ root: "docs", exclude: ["**/_*", "**/.*", "vault/**"] })`。`exclude` はデフォルトの `["**/_*", "**/.*"]` に追加されるのではなくそれを置き換えるため、`_` で始まるパーシャルやドットファイルを非公開のままにするには、この2つを残してください）。そうすると、Vault は自身のノートを引き続き最新版として公開するため、[`blume version <id>`](https://useblume.dev/ja/docs/cli/version) はそれをスナップショットから除外します。

まだ変換されていないもの: コールアウト（`> [!note]`）はプレーンな引用ブロックとしてレンダリングされ、埋め込み（`![[image.png]]`）はそのまま通過し、複数行の `%%comments%%` はそのまま残され、バックリンクグラフはありません。

## リモート MDX [#remote-mdx]

組み込みの `mdxRemote()` アダプターは、生の `.md`/`.mdx` を HTTP 経由で取得します。ファイルの列挙は、GitHub リポジトリのサブツリー（`github`）から行うか、raw ベース URL に対して明示的に指定（`url` + `files`）します。

```ts blume.config.ts
mdxRemote({
  prefix: "sdk",
  url: "https://raw.githubusercontent.com/acme/sdk/main/docs",
  files: ["intro.mdx", "guide.mdx"],
});
```

プライベートリポジトリのトークンは `GITHUB_TOKEN` 環境変数から読み込まれます。アダプターがこれを宣言しているため、未設定の場合は `blume dev` と `blume build` が警告を出します。設定ファイルや生成された出力にインライン展開されることはなく、送信先は GitHub 自身のホスト（`api.github.com`、`raw.githubusercontent.com`）のみで、カスタムの `url` ベースに送信されることはありません。公開リポジトリではトークンなしで動作します。

リモートページは MDX とコンポーネントの機能をすべて備えた形でレンダリングされます。その本文は隠しステージングディレクトリに実体化され、ローカルドキュメントと並んで Astro を通してレンダリングされるため、コールアウト、タブ、その他すべての Blume コンポーネントが引き続き動作します。

### キャッシュとオフラインビルド [#caching-and-offline-builds]

各リモートソースは `.blume/cache/<source>/` 配下にスナップショットを保持します。ネットワークの一時的な不調や CMS の障害などで取得に失敗した場合、Blume はビルドを失敗させる代わりに、警告を出しつつ最後に取得できた正常なスナップショットを提供します。プレビュー用と公開済みのコンテンツは別々のスナップショットを持ち、ソースオプションの組み合わせごとにも別々のスナップショットが作られます。そのため、ビルドが `--preview` で取得した下書きにフォールバックすることはなく、ソースの `query` や `fields` を編集すると新たに取得し直します。キャッシュは `.blume/` 内に置かれ、再生成されるものであり、コミットすることはありません。

開発環境では、リモートソースはスナップショットがあればそこから提供されるため、開発サーバーを再起動しても再取得されません。最新のコンテンツを取得するには `blume sync` を実行するか（起動中の開発サーバーはホットリロードします）、先にスナップショットを破棄するには `blume sync --force` を実行してください。ローカルのファイルシステムソースは通常どおりホットリロードされます。代わりにリモートソースの変更をポーリングするには、そのソースに共通オプションの `pollInterval`（秒）を設定します。開発サーバーはその間隔で再取得を行い、コンテンツが実際に変更された場合にのみリロードします。作業中に API へアクセスしないようにするには、未設定のままにしてください。

## GitHub Releases

組み込みの `githubReleases()` アダプターは、リポジトリのリリースを変更履歴（changelog）に変換します。各リリースは `type: changelog` のエントリになるため、リリースノートが*そのまま*変更履歴になり、二重に書く必要はありません。生成される[変更履歴タイムライン](https://useblume.dev/ja/docs/advanced/changelog)と組み合わせれば、GitHub リリースを公開するだけで変更履歴エントリが出荷されます。

```ts blume.config.ts
import { defineConfig } from "blume";
import { filesystem, githubReleases } from "blume/sources";

export default defineConfig({
  content: {
    sources: [
      filesystem({ root: "content" }),
      githubReleases({
        prefix: "changelog",
        owner: "acme",
        repo: "sdk",
        // prereleases: false,  // include prereleases (default off)
        // drafts: false,       // include drafts (needs a write token)
        // limit: 100,          // cap releases, newest-first
      }),
    ],
  },
});
```

各リリースは変更履歴のフィールドへ自動的にマッピングされます。名前（またはタグ）がタイトルになり、公開日がタイムラインの並び順を決定し、タグが `changelog.version` になり、プレリリースには `Prerelease`（それ以外には `Release`）のタグが付きます。リリースノートはエントリの本文としてレンダリングされ、そのリンクには2つの変更が加えられます。Web、メール、電話、または相対パスのアドレスではないリンク（たとえば `javascript:` URL）はラベルのみが残り、自身の [`deployment.site`](https://useblume.dev/ja/docs/deployment) へ戻るリンクはルート相対パスに書き換えられるため、プレビューデプロイやデプロイのベースパスに追従します。リリースページを `/changelog/v1-2-0` のようなルートにネストさせるには、ソースに `prefix` を指定してください。

プライベートリポジトリの認証には `GITHUB_TOKEN` 環境変数を使用します。これは他の GitHub 機能が使うものと同じトークンで、設定ファイルにインライン展開されることはありません。アダプターがこれを宣言しているため、トークンなしのビルドでは警告が出ます。他のすべてのリモートソースと同様に `.blume/cache/<source>/` にキャッシュされ、API に到達できない場合はオフラインで提供されます。変更履歴は補助的なものであるため、キャッシュがない状態で取得に失敗した場合（トークンのない CI ビルドなど）は、ビルドを失敗させるのではなく、警告を出して空の変更履歴に縮退します。内容を反映させるには、CI やデプロイ環境で `GITHUB_TOKEN` を設定してください。

## Sanity

組み込みの `sanity()` アダプターは GROQ クエリを実行し、各ドキュメントのフィールドをフロントマターに、Portable Text の本文を Markdown にマッピングします。アダプターは `@sanity/client` をランタイム依存関係として宣言します。これは任意の peer dependency であるため、このソースを使う場合にのみインストールしてください。

```ts blume.config.ts
import { defineConfig } from "blume";
import { filesystem, sanity } from "blume/sources";

export default defineConfig({
  content: {
    sources: [
      filesystem({ root: "docs" }),
      sanity({
        prefix: "guides",
        projectId: "abc123",
        dataset: "production",
        query: `*[_type == "guide"]`,
        // Field paths default to title / slug.current / body / _updatedAt
        fields: { slug: "slug.current", body: "content" },
      }),
    ],
  },
});
```

プライベートデータセット用の読み取りトークンは `SANITY_TOKEN` 環境変数から取得され、アダプターがこれを宣言します。カスタムの Portable Text ブロックタイプは、エンジンの `serializers` オプションを通じて Blume コンポーネントにマッピングできます。このオプションは `sanitySource` を直接構築して [`custom()`](#custom-sources) に渡す場合に利用できます。`serializers` を設定するとソースのページが MDX として書き出されるため、シリアライザーが返すコンポーネントやディレクティブがレンダリングされます。

## Notion

組み込みの `notion()` アダプターは、Notion のデータベースをコレクションに変換します。各行がページになり、そのプロパティがフロントマターに、ブロックツリーが MDX になります。コールアウト、トグル、カラム、コードブロックは対応する Blume コンポーネントにマッピングされ、Notion で入力したテキストは書いたとおりにレンダリングされます。ページ内の `{`、`<`、または Markdown の記号は、MDX、JSX、書式として解釈されるのではなくエスケープされます。動画ブロックは、YouTube のリンクを保持している場合は `<YouTube>` 埋め込みに、それ以外の場合は `<video>` プレーヤーになり、いずれの場合もブロックのキャプションが `<Frame>` のキャプションになります。メディアファイルではなく動画ページへのリンク（たとえば Vimeo や Loom の URL）はビルド警告として報告され、その `<video>` プレーヤーは再生できないそのページを指したままになります。代わりに本文からその動画へリンクしてください。アダプターは `@notionhq/client`（v5 以降）をランタイム依存関係として宣言します。これは任意の peer dependency です。Blume はデータベースをその最初のデータソースを通じて読み込みます。

```ts blume.config.ts
import { defineConfig } from "blume";
import { filesystem, notion } from "blume/sources";

export default defineConfig({
  content: {
    sources: [
      filesystem({ root: "docs" }),
      notion({
        prefix: "handbook",
        database: "8f2c1e0a4b7d4f3c9e6a5d2b1c0f9e8d", // the id in the database URL
        // Property names default to the title-typed prop / Description / Slug / Order / Status
        // Pages whose Status isn't publishedValue (default "Published") import as drafts
        publishedValue: "Done",
      }),
    ],
  },
});
```

インテグレーショントークンは `NOTION_TOKEN` 環境変数から取得されます（データベースをインテグレーションと共有してください）。アダプターがこれを宣言しているため、トークンなしのビルドでは警告が出ます。

`Status` プロパティはデフォルトで公開ゲートとして扱われます。Status（ステータスまたはセレクトプロパティ）が `publishedValue`（デフォルトは `Published`）以外の値を持つページは `draft: true` としてインポートされ、本番ビルドでは下書きが除外されます。Status の値がないページは公開され、このプロパティを持たないデータベースではすべてのページが公開されます。Notion のデフォルトのステータスの選択肢は Not started、In progress、Done であるため、これらを使うデータベースには `Published` の値がなく、`publishedValue: "Done"`（または公開済みを意味する任意の選択肢）を設定するまで何も公開されません。別の名前のプロパティを指定するには `properties.status` を使います。ステータスに関係なくすべてのページをインポートするには、データベースに存在しないプロパティを指定してください。

**Notion の画像および動画の URL は署名付きで有効期限がある**ため、アダプターはビルド時にそれらをダウンロードしてサイトのアセットに取り込み、参照を書き換えます。CMS のアセットが静的ビルドを壊すことはありません。保存されるのは、サーバーが画像または動画であると報告したファイル（レスポンスにその記載がない場合は、URL が画像または動画の拡張子を示すファイル）のみです。それ以外のものはビルド警告を出したうえで元の URL のまま残されるため、サイトのオリジンからメディア以外のものが提供されることはありません。API 呼び出しは小さなリクエストプール（Notion のインテグレーションごとのレート制限に合わせて同時3件）を通してペース調整されるため、数百ページ規模のデータベースでも `429` レスポンスを引き起こすことなくインポートできます。調整するには、ソースに `concurrency` を設定してください。

## Contentful

組み込みの `contentful()` アダプターは、Content Delivery API を通じて1つのコンテンツタイプのエントリを読み込み、各エントリのリッチテキスト本文を Markdown に変換します。見出し、マーク、リンク、リスト、引用、テーブル、埋め込みアセットは対応する Markdown の記法に変換され、Markdown の長文テキストフィールドに保持された本文は書かれたとおりに通過します。ただし、Web、メール、電話、または相対パスのアドレスではないリンク（たとえば `javascript:` URL）は、リッチテキストの場合と同様にラベルのみが残ります。インストールは不要です。アダプターが REST API と直接やり取りします。

```ts blume.config.ts
import { defineConfig } from "blume";
import { contentful, filesystem } from "blume/sources";

export default defineConfig({
  content: {
    sources: [
      filesystem({ root: "docs" }),
      contentful({
        prefix: "guides",
        space: "abc123",
        contentType: "guide",
        // environment: "master", locale: "en-US"
        // Field ids default to title / description / slug / body, and the
        // date to sys.updatedAt
        fields: { body: "content" },
        // Extra Delivery API query parameters
        params: { "fields.section": "sdk" },
      }),
    ],
  },
});
```

Delivery API のトークンは `CONTENTFUL_ACCESS_TOKEN` 環境変数から取得され、アダプターがこれを宣言します。`--preview` 指定時には、アダプターは `CONTENTFUL_PREVIEW_TOKEN` を使って Preview API から下書きを読み込みます。Preview API は Delivery 用のトークンを受け付けないため、プレビュートークンなしで `--preview` を指定すると、`CONTENTFUL_ACCESS_TOKEN` にフォールバックするのではなく、明確なエラーで失敗します。アセットの URL は安定しているため、ダウンロードはされず、Contentful の CDN から参照されます。`contentfulSource` を直接構築して [`custom()`](#custom-sources) に渡す場合、埋め込みエントリはコンテンツタイプ ID をキーとするエンジンの `serializers` オプションを通じて Blume コンポーネントにマッピングされます。`serializers` を設定するとソースのページが MDX として書き出されるため、返されたコンポーネントがレンダリングされます。シリアライザーのない埋め込みエントリは、その旨がコメントとして残されます。別のエントリへのリンクは、指し示すルートがないため、プレーンテキストとしてレンダリングされます。

## Payload

組み込みの `payload()` アダプターは、Payload REST API（`/api/<collection>`）を通じてコレクションを読み込み、各ドキュメントの Lexical 本文を Markdown に変換します。対象は段落、見出し、箇条書き・番号付き・チェックリスト、引用、リンク、アップロード、水平線です。テキストフィールドに保持された本文は Markdown としてそのまま通過します。ただし、Web、メール、電話、または相対パスのアドレスではないリンクはラベルのみが残ります。インストールは不要です。

```ts blume.config.ts
import { defineConfig } from "blume";
import { filesystem, payload } from "blume/sources";

export default defineConfig({
  content: {
    sources: [
      filesystem({ root: "docs" }),
      payload({
        prefix: "handbook",
        url: "https://cms.example.com",
        collection: "docs",
        // Field paths default to title / description / slug / content / updatedAt
        fields: { body: "richText" },
        // Extra query parameters: where[...], sort
        params: { sort: "title" },
      }),
    ],
  },
});
```

API キーは `PAYLOAD_API_KEY` 環境変数から取得され、`users API-Key <key>` として送信されます。キーが別の認証対応コレクションに属している場合は `authCollection` を設定してください。インポートされるのは公開済みのドキュメントのみです。`--preview` を指定すると下書きをリクエストし、`draft: true` を付けてステージングします。ドキュメントは `depth: 1` で取得されるためアップロードには URL が含まれ、相対パスのアップロード（`/media/x.png`）は `url` を基準に解決されます。`payloadSource` を直接構築して [`custom()`](#custom-sources) に渡す場合、`block` または `inlineBlock` ノードは `blockType` をキーとするエンジンの `serializers` オプションを通じて Blume コンポーネントにマッピングされます。`serializers` を設定するとソースのページが MDX として書き出されるため、返されたコンポーネントがレンダリングされます。Markdown のテキストフィールドに保持された本文は Markdown のままです。

## Strapi

組み込みの `strapi()` アダプターは、Strapi REST API（`/api/<pluralApiId>`）を通じてコンテンツタイプを読み込み、各エントリの Blocks 本文を Markdown に変換します。対象は段落、見出し、リスト、引用、コードブロック、画像、リンクです。Markdown のリッチテキストフィールドは書かれたとおりに通過します。ただし、Web、メール、電話、または相対パスのアドレスではないリンクはラベルのみが残ります。Strapi 5 のレスポンスはそのまま読み込まれ、Strapi 4 の `attributes` エンベロープは平坦化されるため、同じフィールドパスが適用されます。インストールは不要です。

```ts blume.config.ts
import { defineConfig } from "blume";
import { filesystem, strapi } from "blume/sources";

export default defineConfig({
  content: {
    sources: [
      filesystem({ root: "docs" }),
      strapi({
        prefix: "guides",
        url: "https://cms.example.com",
        contentType: "guides",
        // locale: "en"
        // Field paths default to title / description / slug / content / updatedAt
        fields: { body: "body" },
        // Extra query parameters: filters[...], sort
        params: { "filters[section][$eq]": "sdk" },
      }),
    ],
  },
});
```

API トークンは `STRAPI_API_TOKEN` 環境変数から取得され、Bearer トークンとして送信されます。エントリは `populate=*` で取得されるため画像には URL が含まれ（範囲を絞るには `populate` を設定してください）、相対パスのアップロード（`/uploads/x.png`）は `url` を基準に解決されます。インポートされるのは公開済みのエントリのみです。`--preview` を指定すると下書きをリクエストし（Strapi 5 では `status=draft`、Strapi 4 では `publicationState=preview`）、一度も公開されていない各ドキュメントを `draft: true` を付けてステージングします。公開済みのドキュメントは、その最新の下書きがプレビューされます。

## プレビューと同期 [#preview-and-sync]

リモートコンテンツの取得方法と対象範囲は、2つのフラグで制御します。

- **`--preview`** を `blume dev` または `blume build` に付けると、下書きがレンダリングされ、未公開の CMS コンテンツが取得されます。Sanity は `previewDrafts` パースペクティブに切り替わり、Notion は `Status` によるフィルタリングを停止し、Contentful は Preview API を通じて読み込み、Payload と Strapi は下書きをリクエストします。フラグなしの本番ビルドはこれまでどおり下書きを除外するため、プレビュービルドは出荷前に未公開の作業を安全に確認する手段になります。
- **`blume sync`** はすべてのリモートソースを再取得し、ランタイムを再生成します。開発環境はキャッシュ優先で、リモートソースは一度取得されると再起動時には `.blume/cache` から提供されます（高速でオフラインにも強い）。そのため、開発サーバーを再起動せずに最新の CMS コンテンツを取得する手段が `blume sync` です（起動中のサーバーはホットリロードします）。先にキャッシュを破棄するには `--force` を追加するか、ソースに `pollInterval` を設定して自動更新してください。

```sh
blume dev --preview      # author workflow: see drafts live
blume build --preview    # render a full preview build
blume sync               # refresh remote content now
blume sync --force       # ...ignoring any cached snapshot
```

## カスタムソース [#custom-sources]

`ContentSource` インターフェースを実装したオブジェクトは `custom()` に渡せます。これにより、カスタムシリアライザーを備えたアダプターや、組み込みでない任意のバックエンドを、その SDK をコアのインストールに持ち込むことなく組み込めます。

```ts blume.config.ts
import { defineConfig } from "blume";
import { custom, filesystem } from "blume/sources";
import { sanitySource } from "blume/sources/sanity.ts";

export default defineConfig({
  content: {
    sources: [
      filesystem({ root: "docs" }),
      custom(
        sanitySource({
          name: "guides",
          prefix: "guides",
          projectId: "abc123",
          dataset: "production",
          query: `*[_type == "guide"]`,
          // Map custom Portable Text blocks to Blume components
          serializers: {
            callout: (block) => `<Callout>${block.text}</Callout>`,
          },
        })
      ),
    ],
  },
});
```

上記の `sanitySource` のように Blume のエンジンファクトリーで構築したソースは、実行中のコマンドのコンテキスト上で再構築されます。そのため、組み込みアダプターと同様に、`--preview` 指定時には下書きを読み込み、スナップショットを `.blume/cache` に保持します。独自のソースでも、`withContext(ctx)` を実装し、そのコンテキスト上で再構築した自身を返すことで同じ動作を実現できます。

ソースは自身のネイティブな形式（Portable Text、Notion ブロック、リモート HTML）を Markdown/MDX テキストに正規化するため、ページがどこから来たものであっても、同じコンポーネントと Markdown の機能が適用されます。組み込みアダプターはリッチテキストを変換する際にエスケープするため、作成者が CMS で入力したもの（`{`、`<b>`、`import` で始まる段落、`&copy;` など）は書いたとおりにレンダリングされます。リンクは `http(s)`、`mailto:`、`tel:`、および相対パスのリンク先のみが保持され、それ以外のスキーム（`javascript:`、`data:`）はリンクのテキストとしてレンダリングされます。また、ソースがダウンロードした SVG 画像はサンドボックス化して提供されます。`githubReleases()` のリリースノートと `mdxRemote()` のファイルは、自分で書いたコンテンツと同様に扱われます。その生の HTML は書かれたとおりにレンダリングされるため、信頼できるリポジトリのみを指定してください。組み込みアダプターとは異なり、`custom()` はプレーンなデータではなく実行中のインスタンスを保持するため、独自のランタイム依存関係やシークレットを宣言しません。それらはインスタンス自身が管理します。

ローカルファイルを読み込むカスタムソースでは、各エントリに `sourcePath` を、ソース自体に `contentRoot` を設定してください。`sourcePath` は診断メッセージ内でファイルを示し、その隣にある相対パスの画像を解決します。`contentRoot` はページの日付を求める git の `log` の範囲を限定するもので、これがないとそのソースのページは git 由来の[「最終更新」日付](configuration.md#last-modified)を取得できません。

<!-- Sources: apps/docs/dist/client/ja/docs/content/sources.md -->
