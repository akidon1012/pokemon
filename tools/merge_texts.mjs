// tools/merge_texts.mjs
// Latest APK を土台に Latest Remote を上書きマージし、
// 既存ビルドが読む texts_english.txt / texts_japanese.txt を生成する。
import fs from 'fs';
import path from 'path';
import { RAW_DIR } from './common.mjs';

const APK_DIR    = path.resolve(RAW_DIR, 'texts', 'apk');
const REMOTE_DIR = path.resolve(RAW_DIR, 'texts', 'remote');

const TARGETS = [
  {
    lang: 'english',
    apk:    path.join(APK_DIR, 'English.txt'),
    remote: path.join(REMOTE_DIR, 'English.txt'),
    output: path.join(RAW_DIR, 'texts_english.txt'),
  },
  {
    lang: 'japanese',
    apk:    path.join(APK_DIR, 'Japanese.txt'),
    remote: path.join(REMOTE_DIR, 'Japanese.txt'),
    output: path.join(RAW_DIR, 'texts_japanese.txt'),
  },
];

function loadTextMap(file) {
  if (!file || !fs.existsSync(file)) return {};
  const stat = fs.statSync(file);
  if (!stat.isFile() || stat.size === 0) return {};

  const txt = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  if (!txt.trim()) return {};

  const map = {};
  let currentId = null;

  for (const line of txt.split(/\r?\n/)) {
    const mId = line.match(/^RESOURCE ID:\s*(.+)$/);
    if (mId) {
      currentId = mId[1].trim();
      continue;
    }
    const mText = line.match(/^TEXT:\s*(.+)$/);
    if (mText && currentId) {
      map[currentId] = mText[1].trim();
      currentId = null;
    }
  }
  return map;
}

function mergeMaps(apk, remote) {
  const out = { ...apk };
  let overwritten = 0;
  let added = 0;

  Object.keys(remote).forEach((id) => {
    if (Object.prototype.hasOwnProperty.call(apk, id)) {
      overwritten += 1;
    } else {
      added += 1;
    }
    out[id] = remote[id];
  });

  return { map: out, overwritten, added };
}

function serialize(map) {
  return Object.keys(map)
    .map((id) => `RESOURCE ID: ${id}\nTEXT: ${map[id]}`)
    .join('\n\n') + (Object.keys(map).length ? '\n' : '');
}

function mergeOne(target) {
  if (!fs.existsSync(target.apk)) {
    throw new Error(`[merge_texts] APK ファイルがありません: ${target.apk}`);
  }

  const apk = loadTextMap(target.apk);
  const apkCount = Object.keys(apk).length;
  if (apkCount === 0) {
    throw new Error(`[merge_texts] APK に RESOURCE ID がありません: ${target.apk}`);
  }

  const remoteExists = fs.existsSync(target.remote);
  const remote = loadTextMap(target.remote);
  const remoteCount = Object.keys(remote).length;

  if (!remoteExists) {
    console.warn(`[merge_texts] ${target.lang}: Remote なし → APK のみで出力`);
  } else if (remoteCount === 0) {
    console.log(`[merge_texts] ${target.lang}: Remote は空 → APK のみで出力`);
  }

  const { map, overwritten, added } = mergeMaps(apk, remote);
  fs.mkdirSync(path.dirname(target.output), { recursive: true });
  fs.writeFileSync(target.output, serialize(map), 'utf8');

  console.log(
    `[merge_texts] ${target.lang}: apk=${apkCount} remote=${remoteCount}` +
    ` overwritten=${overwritten} added=${added} out=${Object.keys(map).length}`
  );
  console.log(`[merge_texts] wrote ${target.output}`);
}

function build() {
  TARGETS.forEach(mergeOne);
}

try {
  build();
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
}
