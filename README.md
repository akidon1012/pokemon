# Pokémon Matchup Helper

Pokémon GO のレイドやジムなどで、相手のタイプ相性・対策ポケモン・おすすめのわざ構成を確認するための非公式 Web ツールです。

Nintendo / The Pokémon Company / Niantic とは関係のないファンメイドです。

## 使用技術

- HTML
- Sass (SCSS)
- JavaScript
- jQuery
- EJS
- Gulp
- Node.js

## セットアップ

```bash
npm install
```

## ビルド

公開用ファイルは `html/` に出力されます。

```bash
npx gulp compile
```

開発時は次でローカルサーバーとウォッチが起動します。

```bash
npx gulp
```

サイトが参照するのは `develop/data/` 直下の生成済み JSON です。クローン直後でも、この JSON があればビルドと表示はできます。

## データ更新

ゲームデータの再取得・再生成は次のコマンドです。

```bash
npm run update:data
```

PokeMiners から最新の元データを取得し、サイト用 JSON に加工します。取得した元データは `develop/data/raw/` に置きます。このディレクトリは Git 管理外で、公開用の `html/` にも含まれません。

元データの取得元:

- Game Master: [PokeMiners/game_masters](https://github.com/PokeMiners/game_masters)
- Localization: [PokeMiners/pogo_assets](https://github.com/PokeMiners/pogo_assets)

各スクリプトの詳細は [`tools/README.md`](./tools/README.md) を参照してください。

## 権利について

Pokémon / Pokémon GO および関連する名称・キャラクター・データ等の権利は、それぞれの権利者に帰属します。本プロジェクトは非公式のファンメイドツールであり、Nintendo / The Pokémon Company / Niantic 等とは一切関係ありません。

PokeMiners が公開している Game Master および言語テキストは、本プロジェクトの著作物ではありません。
