/* ===== 1) 結果LPのURL（実LPに差し替え） ===== */
const RESULT_URLS = {
  "Black Belt System": "https://www.kosenjudoonline.com/kosen-judo-black-belt-system",
  "Kosen Judo Technique Video": "https://www.kosenjudoonline.com/kosen-judo-technique-video",
  "Judo Technique Video": "Kosen Judo: Learn Authentic Kosen Judo With Gatame Online",
};

/* ===== 2) TSVを読み込んで辞書化 =====
   ファイル: mapping.tsv
   形式: Q1\tQ2\tQ3\tQ4\tQ5\t最終サービス\t結果メッセージ
   例のキー: "A|B|C|A|C"
*/
async function loadRuleMap() {
  const res = await fetch('mapping.tsv', { cache: 'no-store' });
  if (!res.ok) throw new Error(`mapping.tsv 読み込み失敗: ${res.status}`);
  const tsv = await res.text();
  return buildMapFromTSV(tsv);
}

function buildMapFromTSV(tsv) {
  const lines = tsv.trim().split(/\r?\n/);
  const map = new Map();
  // 先頭行はヘッダ
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;
    const cols = raw.split('\t');
    if (cols.length < 7) continue;

    const pick = s => (s || '').trim().charAt(0).toUpperCase(); // "A: ..." -> "A"
    const key = [
      pick(cols[0]), pick(cols[1]), pick(cols[2]), pick(cols[3]), pick(cols[4])
    ].join('|');

    const service = (cols[5] || '').trim();
    const message = (cols[6] || '').trim();
    map.set(key, { service, message });
  }
  return map;
}

/* ===== 3) 本処理：フォーム送信 → 5文字キー生成 → ルックアップ → 遷移/プレビュー ===== */
const form = document.getElementById('quizForm');
const btn = document.getElementById('submitBtn');
const msg = document.getElementById('msg');
const previewBox = document.getElementById('preview');
const isPreview = new URLSearchParams(location.search).get('mode') === 'preview';

let RULE_MAP = null; // 起動時に読み込む

window.addEventListener('DOMContentLoaded', async () => {
  try {
    RULE_MAP = await loadRuleMap();
    // console.log('RULE_MAP size:', RULE_MAP.size);
  } catch (e) {
    console.error(e);
    msg.textContent = '分岐表（mapping.tsv）の読み込みに失敗しました。配置と中身を確認してください。';
  }
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  msg.textContent = '';

  if (!RULE_MAP) {
    msg.textContent = '分岐表が未読み込みです。数秒後に再度お試しください。';
    return;
  }

  const fd = new FormData(form);
  const vals = ['q1','q2','q3','q4','q5'].map(n => fd.get(n));
  if (vals.some(v => !v)) {
    msg.textContent = '未回答の質問があります。すべて選択してください。';
    return;
  }
  const key = vals.join('|'); // 例: "A|B|C|A|C"

  const hit = RULE_MAP.get(key);
  if (!hit) {
    msg.textContent = `条件に一致する結果が見つかりません（${key}）。mapping.tsv に当該行が存在するか確認してください。`;
    return;
  }

  const url = RESULT_URLS[hit.service];
  if (!url) {
    msg.textContent = `サービスURL未設定: ${hit.service}。RESULT_URLS を設定してください。`;
    return;
  }

  if (isPreview) {
    previewBox.hidden = false;
    previewBox.textContent = `最終サービス: ${hit.service}\nURL: ${url}\nメッセージ: ${hit.message}`;
    return; // プレビューでは遷移しない
  }

  btn.disabled = true;
  msg.textContent = '判定中...';
  location.href = url; // 即リダイレクト
});
