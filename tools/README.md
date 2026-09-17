# Pokémon Matchup Helper - Data Build

Pokémon Matchup Helper で使用する Pokémon GO のデータを、PokeMiners の Game Master / テキストデータから生成するためのツール群です。

この README では、`tools/` 配下の各 `.mjs` の役割、依存関係、データ更新手順について説明します。

---

## 通常のデータ更新

通常のサイト更新では、以下のコマンドだけを実行します。

```bash
npm run update:data
```

このコマンドで、

1. PokeMiners から最新データを取得
2. Latest APK / Latest Remote の言語テキストをマージ
3. 各種サイト用 JSON を生成

までをまとめて実行します。

更新後はブラウザで動作確認を行います。

---

## コマンド

### `npm run update:data`

通常のデータ更新に使用します。

```text
最新データ取得
    ↓
言語テキストのマージ
    ↓
全データのビルド
```

基本的にはこのコマンドだけ使用すれば問題ありません。

### `npm run fetch:data`

PokeMiners から最新の元データを取得するだけのコマンドです。

ビルドは行いません。

### `npm run build:data:all`

すでにローカルに存在する元データを使って、サイト用データをすべて再生成します。

PokeMiners からの取得は行いません。

### `npm run build:data:texts`

Latest APK / Latest Remote の言語テキストだけをマージします。

通常は `build:data:all` の中から実行されるため、単独で実行する必要はありません。

---

# データ取得元

## Game Master

PokeMiners `game_masters` の最新版を使用します。

```text
latest/latest.json
```

取得後は以下に保存されます。

```text
develop/data/raw/game_master.json
```

---

## 言語テキスト

PokeMiners `pogo_assets` の Latest APK / Latest Remote を使用します。

### Latest APK

```text
Texts/Latest APK/English.txt
Texts/Latest APK/Japanese.txt
```

保存先:

```text
develop/data/raw/texts/apk/English.txt
develop/data/raw/texts/apk/Japanese.txt
```

### Latest Remote

```text
Texts/Latest Remote/English.txt
Texts/Latest Remote/Japanese.txt
```

保存先:

```text
develop/data/raw/texts/remote/English.txt
develop/data/raw/texts/remote/Japanese.txt
```

Latest APK が基本となる言語データで、Latest Remote には APK 公開後に追加・変更された差分が含まれます。

そのため Latest APK だけでは、新しく追加されたポケモン名や技名が不足する場合があります。

このプロジェクトでは、

```text
Latest APK
    +
Latest Remote
    ↓
マージ済み言語テキスト
```

としてから各データを生成します。

同じ `RESOURCE ID` が APK / Remote の両方に存在する場合は、Remote を優先します。

---

# データ生成の全体像

通常は `npm run update:data` によって、以下の処理が実行されます。

```text
PokeMiners
│
├─ Game Master
│
│   └─ game_master.json
│
└─ Language Texts
    │
    ├─ Latest APK
    │   ├─ English.txt
    │   └─ Japanese.txt
    │
    └─ Latest Remote
        ├─ English.txt
        └─ Japanese.txt
            │
            ▼
      merge_texts.mjs
            │
            ├─ texts_english.txt
            └─ texts_japanese.txt
```

Game Master からは複数のデータ生成処理に分岐します。

```text
game_master.json
│
├─ build_moves_master.mjs
│       │
│       ▼
│   moves_master.json
│
├─ build_type_json_defense.mjs
│       │
│       ▼
│   type_defense.json
│
├─ build_pokemon_go_meta.mjs
│       │
│       ▼
│   pokemon_go_meta.json
│
└─ build_pokemon_go_meta_override.mjs
        │
        ▼
    pokemon_go_meta_override.json
```

技名は言語テキストから別途生成します。

```text
texts_english.txt
texts_japanese.txt
        │
        ▼
build_move_name_dict_ja.mjs
        │
        ▼
move_name_dict.json
```

技データと技名辞書を組み合わせます。

```text
moves_master.json
        │
        ├───────────────┐
        │               │
move_name_dict.json     │
        │               │
        └───────┬───────┘
                ▼
    build_moves_localized.mjs
                │
                ▼
    moves_master_localized.json
```

ポケモン検索用データは、Game Master、言語テキスト、GOメタデータを組み合わせて生成します。

```text
game_master.json
texts_english.txt
texts_japanese.txt
pokemon_go_meta.json
pokemon_go_meta_override.json
        │
        ▼
build_pokemon_list_from_gm.mjs
        │
        ▼
pokemon_list.json
```

---

# `tools/` 各ファイル

## `fetch_data.mjs`

### 役割

PokeMiners からビルドに必要な最新の元データを取得します。

### 取得データ

- Game Master
- Latest APK / English
- Latest APK / Japanese
- Latest Remote / English
- Latest Remote / Japanese

### 出力

```text
develop/data/raw/game_master.json

develop/data/raw/texts/apk/English.txt
develop/data/raw/texts/apk/Japanese.txt

develop/data/raw/texts/remote/English.txt
develop/data/raw/texts/remote/Japanese.txt
```

### 処理

取得したファイルを直接既存ファイルへ上書きするのではなく、いったん一時ディレクトリへ保存します。

以下を検証してから既存データを置換します。

- Game Master が JSON 配列である
- 言語テキストに `RESOURCE ID:` が含まれている
- 必要なファイルの取得が完了している

これにより、途中で取得に失敗した場合に新旧データが混在することを防ぎます。

GitHub Raw からの取得に失敗した場合は jsDelivr をフォールバックとして使用します。

---

## `merge_texts.mjs`

### 役割

Latest APK と Latest Remote の言語テキストをマージします。

### 入力

```text
develop/data/raw/texts/apk/English.txt
develop/data/raw/texts/apk/Japanese.txt

develop/data/raw/texts/remote/English.txt
develop/data/raw/texts/remote/Japanese.txt
```

### 出力

```text
develop/data/raw/texts_english.txt
develop/data/raw/texts_japanese.txt
```

### 処理

APK をベースデータとして使用し、Remote のデータを追加します。

同じ `RESOURCE ID` が存在する場合は Remote を優先して上書きします。

UTF-8 BOM は無視します。

Remote が空、またはファイルが存在しない場合は APK のみを使用します。

APK が存在しない、または有効な `RESOURCE ID` が存在しない場合はエラーとします。

### 依存関係

```text
fetch_data.mjs
      ↓
merge_texts.mjs
```

---

## `build_moves_master.mjs`

### 役割

Game Master から Pokémon GO の技データを抽出します。

### 入力

```text
develop/data/raw/game_master.json
```

### 出力

```text
moves_master.json
```

### 補足

この段階では技名のローカライズは行いません。

そのため、例えば以下のように Game Master 上の ID が名称として残ります。

```text
CHILLING_WATER
```

日本語名・英語名の確定は後続の `build_moves_localized.mjs` で行います。

---

## `build_move_name_dict_ja.mjs`

### 役割

マージ済みの英語・日本語テキストから技名辞書を生成します。

### 入力

```text
develop/data/raw/texts_english.txt
develop/data/raw/texts_japanese.txt
```

`move_name_*` の `RESOURCE ID` を抽出します。

### 出力

```text
move_name_dict.json
```

例:

```json
{
  "CHILLING_WATER": {
    "resourceId": "move_name_0488",
    "en": "Chilling Water",
    "ja": "ひやみず"
  }
}
```

### 補足

`move_name_dict.json` はブラウザから直接使用するデータではなく、技名ローカライズ用の中間データです。

### 依存関係

```text
merge_texts.mjs
      ↓
build_move_name_dict_ja.mjs
```

---

## `build_moves_localized.mjs`

### 役割

Game Master から生成した技データと技名辞書を組み合わせ、英語名・日本語名を含むサイト用技データを生成します。

### 入力

```text
moves_master.json
move_name_dict.json
```

### 出力

```text
moves_master_localized.json
```

### 依存関係

```text
build_moves_master.mjs
        │
        ├──────────────┐
        │              │
build_move_name_dict_ja.mjs
        │              │
        └──────┬───────┘
               ▼
    build_moves_localized.mjs
```

---

## `build_type_json_defense.mjs`

### 役割

Game Master から Pokémon GO のタイプ相性データを生成します。

### 入力

```text
develop/data/raw/game_master.json
```

### 出力

```text
type_defense.json
```

### 処理

現在の Game Master では、タイプ相性は各 `POKEMON_TYPE_*` の以下に格納されています。

```text
data.typeEffective.attackType
data.typeEffective.attackScalar
```

Game Master は「攻撃タイプ → 各防御タイプに対する倍率」の形式になっています。

サイト側では防御タイプを基準に扱うため、18タイプの行列を転置して `type_defense.json` を生成します。

Game Master 上のタイプ順は以下です。

```text
NORMAL
FIGHTING
FLYING
POISON
GROUND
ROCK
BUG
GHOST
STEEL
FIRE
WATER
GRASS
ELECTRIC
PSYCHIC
ICE
DRAGON
DARK
FAIRY
```

倍率は Game Master の値をそのまま使用します。

```text
ばつぐん      1.6
等倍          1.0
いまひとつ    0.625
無効相当      0.390625
```

`multiplier` が Game Master 由来の正確な倍率です。

`value` は既存処理との互換性のため残しています。

```text
1.6      →  1
1.0      →  0
0.625    → -1
0.390625 → -2
```

### 補足

以前使用していた `COMBAT_TYPE_EFFECTIVENESS` は現在の Game Master には存在しないため使用しません。

タイプ相性は手書きデータではなく、現在の Game Master の `typeEffective.attackScalar` から生成します。

---

## `build_pokemon_go_meta.mjs`

### 役割

Game Master からポケモンの Pokémon GO 用メタデータを生成します。

### 入力

```text
develop/data/raw/game_master.json
```

### 出力

```text
pokemon_go_meta.json
```

### 主なデータ

- タイプ
- 種族値
- 使用可能な技
- その他おすすめ計算に必要な Pokémon GO データ

### 依存関係

後続の `build_pokemon_list_from_gm.mjs` から使用されます。

---

## `build_pokemon_go_meta_override.mjs`

### 役割

Game Master の特殊フォーム等について、通常データとは別に扱う必要がある override データを生成します。

### 入力

```text
develop/data/raw/game_master.json
```

### 出力

```text
pokemon_go_meta_override.json
```

### 依存関係

後続の `build_pokemon_list_from_gm.mjs` から使用されます。

---

## `build_pokemon_list_from_gm.mjs`

### 役割

ポケモン検索・選択UIで使用するポケモン一覧を生成します。

### 主な入力

```text
develop/data/raw/game_master.json
develop/data/raw/texts_english.txt
develop/data/raw/texts_japanese.txt
pokemon_go_meta.json
pokemon_go_meta_override.json
```

### 出力

```text
pokemon_list.json
```

### 主な処理

- Game Master からポケモンを抽出
- 英語名・日本語名を付与
- フォームを分類
- タイプ等の Pokémon GO データを統合
- 検索UIで使用する形式へ変換

### 名称のフォールバック

日本語名は概ね以下の優先順位で決定します。

```text
IDに対応する日本語名
        ↓
図鑑番号に対応する日本語名
        ↓
pokemonId
```

Game Master と言語テキストは更新タイミングが異なるため、Game Master に新しいポケモンが追加されても、Latest APK / Latest Remote に名称リソースがまだ存在しない場合があります。

その場合は `pokemonId` をフォールバック表示します。

例:

```text
PECHARUNT
```

これはビルドエラーではありません。

後日 PokeMiners の言語テキストに名称リソースが追加されたあと、

```bash
npm run update:data
```

を再実行すれば自動的に日本語名が反映されます。

---

## `common.mjs`

### 役割

複数のビルドスクリプトで使用する共通処理をまとめています。

単独でデータを生成するスクリプトではありません。

---

# ビルド依存関係

主要な依存関係をまとめると以下のようになります。

```text
fetch_data.mjs
│
├─ game_master.json
│
└─ APK / Remote texts
          │
          ▼
    merge_texts.mjs
          │
          ├─ texts_english.txt
          └─ texts_japanese.txt
                  │
                  ▼
        build_move_name_dict_ja.mjs
                  │
                  ▼
          move_name_dict.json
                  │
                  │
game_master.json  │
      │           │
      ▼           │
build_moves_master.mjs
      │           │
      ▼           │
moves_master.json │
      │           │
      └─────┬─────┘
            ▼
build_moves_localized.mjs
            │
            ▼
moves_master_localized.json


game_master.json
      │
      ├─ build_type_json_defense.mjs
      │       └─ type_defense.json
      │
      ├─ build_pokemon_go_meta.mjs
      │       └─ pokemon_go_meta.json
      │
      └─ build_pokemon_go_meta_override.mjs
              └─ pokemon_go_meta_override.json


game_master.json
texts_english.txt
texts_japanese.txt
pokemon_go_meta.json
pokemon_go_meta_override.json
      │
      ▼
build_pokemon_list_from_gm.mjs
      │
      ▼
pokemon_list.json
```

---

# 手動でデータを更新する場合

通常は `npm run update:data` を使用します。

自動取得を使用せず、元データを手動で差し替える場合のみ以下の手順を使用します。

1. `develop/data/raw/game_master.json` を最新版へ差し替える
2. PokeMiners `pogo_assets` の言語テキストを配置する

```text
develop/data/raw/texts/apk/English.txt
develop/data/raw/texts/apk/Japanese.txt
develop/data/raw/texts/remote/English.txt
develop/data/raw/texts/remote/Japanese.txt
```

3. 以下を実行する

```bash
npm run build:data:all
```

4. ブラウザで動作確認する

---

# 新ポケモン追加時

通常は以下を実行します。

```bash
npm run update:data
```

更新後、最低限以下を確認します。

- ポケモン検索に表示される
- 日本語名が表示される
- タイプが正しい
- 種族値が表示される
- 技が表示される
- 対策おすすめが表示される

## 日本語名が表示されない場合

Game Master にポケモンが存在していても、Latest APK / Latest Remote に名称リソースがまだ存在しない場合があります。

その場合は `pokemonId` が表示されます。

例:

```text
PECHARUNT
```

まず以下を確認します。

```text
Latest APK
Latest Remote
マージ後 texts_*.txt
```

どこにも名称リソースが存在しなければ、ビルドの取りこぼしではありません。

名称リソースの追加を待ち、後日 `npm run update:data` を再実行します。

---

# 新しい技が追加された場合

更新後、以下の流れで名称が反映されているか確認します。

```text
Latest APK / Latest Remote
        ↓
texts_english.txt / texts_japanese.txt
        ↓
move_name_dict.json
        ↓
moves_master_localized.json
```

Latest APK に存在せず Latest Remote にだけ存在する技もあります。

例として `move_name_0488` は Latest Remote から、

```text
English: Chilling Water
Japanese: ひやみず
```

がマージされ、最終的な `moves_master_localized.json` まで正常に反映されることを確認済みです。

途中の `moves_master.json` では `CHILLING_WATER` のような ID のままでも正常です。

名称は後続のローカライズ処理で確定します。

---

# 新フォーム追加時

新しいリージョンフォーム・特殊フォーム等が追加された場合は、`classifyForm()` の結果を確認します。

更新後の `pokemon_list.json` と実際の画面で、以下を確認します。

- 通常フォームと特殊フォームが意図した単位で分かれている
- フォーム名が適切に表示される
- タイプが正しい
- 同じポケモンが不要に重複していない
- 本来表示しない内部フォームが検索候補に出ていない

Game Master にこれまでと異なるフォームの命名規則が追加された場合は、`classifyForm()` の対応が必要になる可能性があります。

---

# タイプ相性の確認

データ更新後は、タイプ相性が正常に生成されていることも確認します。

特に複合タイプでは、それぞれのタイプ倍率を掛け合わせます。

例: みず／ひこう

```text
でんき
1.6 × 1.6 = 2.56

くさ
1.6 × 0.625 = 1.0

じめん
1.0 × 0.390625 = 0.390625
```

`0.390625` は必ずしも「二重耐性」を意味しません。

例えば みず／ひこう に対する じめん技は、

```text
みず    1.0
ひこう  0.390625
```

の積によるものです。

---

# 更新後の動作確認

`npm run update:data` 実行後は、最低限以下をブラウザで確認します。

- タイプ指定ができる
- タイプ相性が正常に表示される
- ポケモン検索ができる
- ポケモン名が表示される
- タイプが正しい
- 種族値が表示される
- 技が表示される
- 対策おすすめが表示される
- 複合タイプの倍率が正常に計算される

新しいポケモン・技・フォームが追加されたタイミングでは、可能な限りその新規データを使って確認します。

---

# 通常更新時のまとめ

普段は以下だけ覚えておけば問題ありません。

```bash
npm run update:data
```

その後、

```text
ブラウザで動作確認
    ↓
サイトをビルド
    ↓
公開環境へアップロード
```

を行います。

`fetch:data`、`build:data:all`、`build:data:texts` は、取得やビルドの一部だけを個別に確認・再実行したい場合に使用します。
