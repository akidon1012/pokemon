# 対策おすすめ抽出ロジック

Pokémon Matchup Helper の「対策おすすめ」で、候補ポケモンを抽出・順位付けするロジックをまとめる。

実装の正本は `develop/matchup/js/matchup.js` の `matchup.recommend.recommendCounters()`。
このドキュメントは、計算式だけでなく「何を重視しておすすめ順を決めているか」を後から確認できるようにすることを目的とする。

## 基本方針

おすすめ順位は、単純なタイプ相性だけではなく、次の要素を組み合わせて決定する。

1. 相手に「ばつぐん」を取れる技を持っているか
2. 通常技＋スペシャル技の簡易攻撃サイクル（cycleDps）
3. ポケモン自身の GO 種族値（攻撃をやや重視）
4. 相手タイプから受けるダメージ倍率

概念的には次の流れになる。

```text
相手のタイプ
    ↓
各攻撃タイプの相性倍率を計算
    ↓
通常技 × スペシャル技の技構成を評価
    ↓
「ばつぐん」を取れる技がないポケモンを除外
    ↓
最も高い cycleDps を取得
    ↓
GO種族値によるウェイトを計算
    ↓
相手から弱点を突かれる場合は軽くペナルティ
    ↓
総合スコアを計算
    ↓
スコア順に並べて上位を表示
```

## 1. タイプ相性倍率

相手が複合タイプの場合は、各タイプに対する倍率を乗算する。

例：

```text
1.6 × 1.6   = 2.56
1.6 × 0.625 = 1.0
```

相性データは `type_defense.json` を使用する。

おすすめ候補に含める条件は、通常技かスペシャル技の**どちらか一方でも**最終倍率が **1.6 以上**であること。

```js
const isSE = function(mult) {
  return mult >= (1.6 - 1e-3);
};
```

つまり「ふつう」「いまひとつ」の技しか持たないポケモンは、おすすめ候補から除外する。

技構成の cycleDps 自体は、ばつぐんでない技との組み合わせも含めて計算する。
片方だけばつぐん（例: チャージビーム＋クロスサンダー、りゅうのいぶき＋クロスサンダー）でも構成として残す。
両方しばつぐん必須にすると、ゼクロムのようなケースで構成数が極端に減るため。

## 2. 技構成スコア（cycleDps）

各ポケモンが覚える通常技 × スペシャル技の全組み合わせを評価する。

通常技・スペシャル技の判定は `pve.energyDelta` の符号（正＝通常、負＝スペシャル）。両方ない場合のみ id の `/_FAST(?:_|$)/` にフォールバックする。

各技のダメージ評価は次の式。

```text
moveDamage = power × typeMultiplier × STAB
```

技構成は簡易サイクルで評価する（余剰エネルギーの持ち越しはしない）。

```text
normalCount = ceil( abs(special.energyDelta) / normal.energyDelta )
cycleDamage = normalDamage × normalCount + specialDamage
cycleTime   = normal.durationMs × normalCount + special.durationMs
cycleDps    = cycleDamage / cycleTime × 1000
```

### power / energyDelta / durationMs

レイド／ジム向けおすすめでは Game Master の PvE 値を使う。

- `pve.power`
- `pve.energyDelta`
- `pve.durationMs`

`HORN_DRILL` / `FISSURE` は通常のおすすめ評価対象から除外する。

PvE 値が欠けてサイクルを組めない組み合わせはスキップする。

ゲージ本数はおすすめ順位の計算には使わない。★評価とゲージ表示では次の対応を使う。

```text
-100 → 1ゲージ
-50  → 2ゲージ
-33  → 3ゲージ
```

### typeMultiplier

相手タイプに対する倍率。

主な値：

| 相性 | 倍率 |
| --- | ---: |
| ばつぐん（複合弱点） | 2.56 |
| ばつぐん | 1.6 |
| ふつう | 1.0 |
| いまひとつ | 0.625 |
| 強く軽減 | 0.390625 |

### STAB

技タイプと使用ポケモンのタイプが一致する場合、STAB（タイプ一致ボーナス）を加える。

```text
タイプ一致     1.2
タイプ不一致   1.0
```

実装上はフォームによるタイプ上書きも考慮して STAB を判定する。

### bestCycleDps

候補ポケモンの技構成のうち、最も高い `cycleDps` を `bestCycleDps` とする。

```text
bestCycleDps = max(cycleDps)
```

各ポケモンは cycleDps 上位3構成を `moveSets` として保持する。
各構成には `relativePerformance = cycleDps / bestCycleDps` を付ける（そのポケモン内での相対値）。

## 3. GO種族値によるウェイト

技性能だけで順位を決めず、ポケモン自身の GO 種族値も評価する。

使用する値：

```text
Attack
Defense
Stamina (HP)
```

GO種族値が利用できない場合は、取得可能な基礎ステータスをフォールバックとして使用する。

### 攻撃係数

```text
atkFactor = Attack / 180
```

ただし範囲を `0.5 ～ 2.0` に制限する。

### 耐久係数

```text
bulkFactor = (Defense + Stamina) / 320
```

ただし範囲を `0.5 ～ 1.8` に制限する。

### 種族値ウェイト

攻撃を重めに評価するため、攻撃 70%、耐久 30% で合成する。

```text
statWeight = atkFactor × 0.7
           + bulkFactor × 0.3
```

基準値は次の通り。

```text
OFF_REF  = 180
BULK_REF = 320
```

平均的なアタッカーが概ね `1.0` 前後、攻撃性能の高いポケモンほど大きな値になることを意図している。

## 4. 相手から受けるダメージのペナルティ

攻撃性能だけでなく、相手タイプからこちらが弱点を突かれるかも考慮する。

相手の各タイプを攻撃タイプとみなし、候補ポケモンの各タイプに対する倍率を乗算して `bossDamageMult` を求める。

ただし、耐性を持っていること自体にはボーナスを与えない。

```text
adjMult = max(1.0, bossDamageMult)
```

そのため、ペナルティが発生するのは相手からの攻撃が弱点になる場合だけ。

さらに、防御面を強く評価しすぎて高火力ポケモンが不自然に下位へ落ちないよう、指数 `0.25` で影響を緩める。

```text
defPenalty = adjMult ^ 0.25
```

## 5. 最終スコア

ポケモンごとのおすすめ順位に使用する最終スコアは次の式。

```text
monScore = bestCycleDps × statWeight / defPenalty
```

つまり、基本思想は次の通り。

```text
技構成の簡易DPS
  ×
ポケモン自身の攻撃・耐久性能
  ÷
相手から弱点を突かれるリスク（軽め）
```

火力を中心にしつつ、種族値を十分反映し、防御上の不利は補助的な減点として扱う。

## 6. 並び順

候補は次の優先順位で降順ソートする。

1. `score`（最終総合スコア）
2. `bestCycleDps`（最大技構成DPS。互換のため `maxMoveScore` にも同じ値を入れる）
3. GO の Attack
4. `baseTotal`

同じポケモン／フォーム由来の重複データについては、図鑑No・フォーム・GO種族値・タイプなどをキーに重複排除したうえで、指定件数まで切り出す。

現在の画面からの呼び出しでは `limit: 20`。

## 7. スペシャル技の★評価

おすすめポケモンの順位と、詳細表示に出すスペシャル技の★評価は**別ロジック**。

★評価では、まずスペシャル技の `moveScore` に攻撃種族値を加味する。

```text
statFactorForRating = 0.6 + Attack / 500
baseScore = moveScore × statFactorForRating
```

`baseScore` を `50 ～ 400` に丸め、1～5 の基本評価へ変換する。

その後、ゲージ数と相性・STABによる補正を行う。

### ゲージ補正

PvE の `energyDelta` からゲージ本数を決め、次の補正を加える。

```text
-100（1ゲージ）  -2
-50（2ゲージ）    0
-33（3ゲージ）   +1
```

### 相性・STAB補正

```text
ばつぐん + STAB   +1.5
ばつぐんのみ       +0.5
STABのみ            +0.3
```

「ばつぐん」の技については最低評価も設定する。

```text
ばつぐん + STAB   最低 ★3
ばつぐんのみ       最低 ★2
```

最後に四捨五入し、★1～★5の範囲に収める。

また、スペシャル技のうち `baseScore` が最も高いものには `__isStrongest` を付与する。

## 8. おすすめ順位と★評価を分けている理由

おすすめ順位では「どのポケモンを対策候補として選ぶか」を評価するため、通常技＋スペシャル技の簡易サイクルDPS・種族値・防御上の不利を組み合わせる。

一方、★評価は「そのポケモンが持つスペシャル技の中で、どの技が使いやすく有力か」を見せるための表示指標で、ゲージ数も考慮する。現状のカードUIはまだこの★評価を使っている。

この2つは目的が異なるため、同じスコア式にはしていない。

## 9. 調整するときに注意する値

ランキングの性格を変えたい場合、主に次の値が影響する。

| 値 | 現在値 | 役割 |
| --- | ---: | --- |
| STAB | 1.2 | タイプ一致技の補正 |
| `OFF_REF` | 180 | 攻撃係数の基準 |
| `BULK_REF` | 320 | 耐久係数の基準 |
| 攻撃比率 | 0.7 | 種族値ウェイト内の攻撃評価 |
| 耐久比率 | 0.3 | 種族値ウェイト内の耐久評価 |
| `DEF_POW` | 0.25 | 弱点ペナルティの強さ |
| おすすめ件数 | 20 | 表示候補数 |

これらを変更するとランキング全体が変わるため、変更時は代表的な相手タイプ・ポケモンで結果を比較する。

## 10. 実装箇所

主な実装は以下。

```text
develop/matchup/js/matchup.js
└─ matchup.recommend.recommendCounters()

develop/matchup/js/utilities.js
└─ pokemonUtil.evaluatePveMoveCycle()
└─ pokemonUtil.buildPveMoveCycleRanking()
```

関連データ：

```text
develop/data/type_defense.json
develop/data/pokemon_list.json
develop/data/pokemon_go_meta.json
develop/data/pokemon_go_meta_override.json
develop/data/moves_master_localized.json
```

おすすめロジックを変更した場合は、このドキュメントも同時に更新する。