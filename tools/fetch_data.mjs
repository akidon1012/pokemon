// tools/fetch_data.mjs
// PokeMiners から Game Master と言語テキストを取得し、所定位置へ原子的に置換する。
import fs from 'fs';
import os from 'os';
import path from 'path';
import { RAW_DIR, GAME_MASTER_PATH } from './common.mjs';

const RAW_BASE = 'https://raw.githubusercontent.com';
const JSDELIVR_BASE = 'https://cdn.jsdelivr.net/gh';

const FILES = [
  {
    name: 'game_master',
    dest: GAME_MASTER_PATH,
    kind: 'json',
    urls: [
      `${RAW_BASE}/PokeMiners/game_masters/master/latest/latest.json`,
      `${JSDELIVR_BASE}/PokeMiners/game_masters@master/latest/latest.json`,
    ],
  },
  {
    name: 'texts_apk_en',
    dest: path.join(RAW_DIR, 'texts', 'apk', 'English.txt'),
    kind: 'text-apk',
    urls: [
      `${RAW_BASE}/PokeMiners/pogo_assets/master/Texts/Latest%20APK/English.txt`,
      `${JSDELIVR_BASE}/PokeMiners/pogo_assets@master/Texts/Latest%20APK/English.txt`,
    ],
  },
  {
    name: 'texts_apk_ja',
    dest: path.join(RAW_DIR, 'texts', 'apk', 'Japanese.txt'),
    kind: 'text-apk',
    urls: [
      `${RAW_BASE}/PokeMiners/pogo_assets/master/Texts/Latest%20APK/Japanese.txt`,
      `${JSDELIVR_BASE}/PokeMiners/pogo_assets@master/Texts/Latest%20APK/Japanese.txt`,
    ],
  },
  {
    name: 'texts_remote_en',
    dest: path.join(RAW_DIR, 'texts', 'remote', 'English.txt'),
    kind: 'text-remote',
    urls: [
      `${RAW_BASE}/PokeMiners/pogo_assets/master/Texts/Latest%20Remote/English.txt`,
      `${JSDELIVR_BASE}/PokeMiners/pogo_assets@master/Texts/Latest%20Remote/English.txt`,
    ],
  },
  {
    name: 'texts_remote_ja',
    dest: path.join(RAW_DIR, 'texts', 'remote', 'Japanese.txt'),
    kind: 'text-remote',
    urls: [
      `${RAW_BASE}/PokeMiners/pogo_assets/master/Texts/Latest%20Remote/Japanese.txt`,
      `${JSDELIVR_BASE}/PokeMiners/pogo_assets@master/Texts/Latest%20Remote/Japanese.txt`,
    ],
  },
];

const HEADERS = {
  'User-Agent': 'pokemon-matchup-helper (local data fetch)',
  Accept: '*/*',
};

function validate(kind, buf) {
  const text = buf.toString('utf8').replace(/^\uFEFF/, '');
  if (kind === 'json') {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      throw new Error(`JSON として読めません: ${e.message}`);
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('Game Master が空の配列です');
    }
    return;
  }
  if (kind === 'text-apk') {
    if (!text.trim() || !/^RESOURCE ID:/m.test(text)) {
      throw new Error('APK テキストに RESOURCE ID がありません');
    }
    return;
  }
  if (kind === 'text-remote') {
    if (!text.trim()) return;
    if (!/^RESOURCE ID:/m.test(text)) {
      throw new Error('Remote テキストに RESOURCE ID がありません');
    }
  }
}

async function downloadToFile(urls, dest, kind) {
  let lastErr = null;
  for (const url of urls) {
    try {
      console.log(`[fetch] GET ${url}`);
      const res = await fetch(url, { headers: HEADERS });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (!buf.length && kind !== 'text-remote') {
        throw new Error('本文が空です');
      }
      fs.writeFileSync(dest, buf);
      return { url, bytes: buf.length };
    } catch (e) {
      lastErr = e;
      console.warn(`[fetch] 失敗: ${url} (${e.message})`);
    }
  }
  throw lastErr || new Error('取得できませんでした');
}

function replaceFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  try {
    fs.renameSync(from, to);
  } catch {
    fs.copyFileSync(from, to);
    fs.unlinkSync(from);
  }
}

async function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pokemon-fetch-'));
  const backups = [];
  console.log('[fetch] temp =', tmpDir);

  try {
    const downloaded = [];
    for (const file of FILES) {
      const tmpPath = path.join(tmpDir, path.basename(file.dest) + '.' + file.name);
      const info = await downloadToFile(file.urls, tmpPath, file.kind);
      const buf = fs.readFileSync(tmpPath);
      validate(file.kind, buf);
      downloaded.push({ ...file, tmpPath, ...info });
      console.log(`[fetch] OK ${file.name} ${info.bytes} bytes`);
    }

    if (downloaded.length !== FILES.length) {
      throw new Error('必要なファイルをすべて取得できませんでした');
    }

    for (const file of downloaded) {
      if (fs.existsSync(file.dest)) {
        const bak = file.dest + '.bak';
        fs.copyFileSync(file.dest, bak);
        backups.push({ dest: file.dest, bak });
      }
      replaceFile(file.tmpPath, file.dest);
      console.log(`[fetch] wrote ${file.dest}`);
    }

    for (const b of backups) {
      fs.rmSync(b.bak, { force: true });
    }
    console.log('[fetch] done');
  } catch (e) {
    for (const b of backups) {
      if (fs.existsSync(b.bak)) {
        replaceFile(b.bak, b.dest);
      }
    }
    throw e;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

try {
  await main();
} catch (e) {
  console.error('[fetch] ERROR:', e.message || e);
  process.exit(1);
}
