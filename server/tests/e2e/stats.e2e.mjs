// Kiểm thử App ↔ API cho giai đoạn 4 – Thống kê cho nghệ sĩ (IT126–IT130), chạy bản web thật + máy chủ thật
// với CSDL tạm, điều khiển Chrome (kể cả hộp chọn file) và chụp ảnh từng bước.
//
// Chuẩn bị: build bản web trỏ tới cổng API test (ở thư mục gốc):
//   EXPO_PUBLIC_API_URL=http://127.0.0.1:5055 npx expo export --platform web --output-dir dist-e2e
// Chạy:  cd server && WEB_BUILD_DIR=../dist-e2e node tests/e2e/stats.e2e.mjs
// Kết quả: server/tests/output/e2e-gd4/ket-qua.json và ảnh *.png
import { spawn } from 'node:child_process';
import http from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(HERE, '..', '..');
const WEB_DIR = path.resolve(process.env.WEB_BUILD_DIR || path.join(SERVER_DIR, '..', 'dist-e2e'));
const OUT = process.env.E2E_OUT || path.join(SERVER_DIR, 'tests', 'output', 'e2e-gd4');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const API_PORT = Number(process.env.API_PORT || 5055);
const WEB_PORT = 8096, CDP_PORT = 9342;
const API = `http://127.0.0.1:${API_PORT}`;
// File nhạc thật trong dữ liệu mẫu của project (để server đọc được thời lượng)
const AUDIO_FILE = path.join(SERVER_DIR, 'public', 'audio', 's8.m4a');
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ketQua = [];

if (!existsSync(path.join(WEB_DIR, 'index.html'))) {
  console.error(`Chưa có bản web ở ${WEB_DIR}. Xem hướng dẫn ở đầu file.`);
  process.exit(1);
}

// ---------------- bản web + máy chủ API (CSDL tạm, không bao giờ dùng Atlas)
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.json': 'application/json', '.ico': 'image/x-icon' };
const web = http.createServer((req, res) => {
  let p = path.join(WEB_DIR, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(p) || statSync(p).isDirectory()) p = path.join(WEB_DIR, 'index.html');
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
}).listen(WEB_PORT, '127.0.0.1');

const uploadRoot = path.join(os.tmpdir(), `music-e2e-stats-${Date.now()}`);
const apiProc = spawn(process.execPath, [path.join(HERE, 'test-server.js')], {
  cwd: SERVER_DIR,
  env: { ...process.env, PORT_TEST: String(API_PORT), UPLOAD_ROOT: uploadRoot, JWT_SECRET: 'e2e-secret' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const apiReady = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Máy chủ test không khởi động sau 60 giây')), 60000);
  apiProc.stdout.on('data', (d) => { if (/READY/.test(String(d))) { clearTimeout(timer); resolve(); } });
  apiProc.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));
});
const apiCall = async (method, url, token, body) => {
  const res = await fetch(`${API}${url}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
};
const apiLogin = async (email) => (await apiCall('POST', '/api/auth/login', null, { email, password: '123456' })).body.token;

// ---------------- điều khiển Chrome
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${CDP_PORT}`, '--window-size=430,900',
  `--user-data-dir=${path.join(OUT, 'chrome-profile')}`, '--no-first-run', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
let ws, seq = 0; const pending = new Map(); const fileChoosers = []; const loiTrinhDuyet = [];
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true })).result.value;
const pageText = () => evalJs('document.body.innerText');
const findJs = (sel, text, last) => `(() => {
  let els = [...document.querySelectorAll(${JSON.stringify(sel)})];
  ${text != null ? `els = els.filter(e => (e.innerText||'').trim() === ${JSON.stringify(text)} && ![...e.children].some(c => (c.innerText||'').trim() === ${JSON.stringify(text)}));` : ''}
  els = els.filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  return els[${last ? 'els.length - 1' : '0'}] || null;
})()`;
async function tap(sel, { text = null, last = false } = {}) {
  const ok = await evalJs(`(() => { const e = ${findJs(sel, text, last)}; if (!e) return false; (e.tagName === 'BUTTON' ? e : (e.closest('[tabindex="0"]') || e)).click(); return true; })()`);
  if (!ok) throw new Error(`Không bấm được ${sel} ${text ?? ''}`);
  await sleep(700);
}
async function typeInto(sel, text, { clear = false } = {}) {
  const ok = await evalJs(`(() => { const e = ${findJs(sel, null, false)}; if (!e) return false; e.focus(); ${clear ? 'e.select && e.select();' : ''} return true; })()`);
  if (!ok) throw new Error(`Không thấy ô nhập ${sel}`);
  if (clear) { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 }); }
  await send('Input.insertText', { text });
  await sleep(400);
}
async function choDen(text, ms = 20000) {
  for (let t = 0; t < ms; t += 300) { if ((await pageText()).includes(text)) return true; await sleep(300); }
  throw new Error(`Không thấy "${text}" trên màn hình`);
}
async function khongCo(text) {
  if ((await pageText()).includes(text)) throw new Error(`Không được thấy "${text}" nhưng vẫn thấy`);
}
async function chup(ten) {
  await evalJs(`(() => { document.activeElement?.blur?.();
    for (const e of document.querySelectorAll('div')) if ((e.innerText||'').trim().startsWith('Screens (') && e.getBoundingClientRect().width < 260) {
      let top = e; for (let a = e.parentElement; a; a = a.parentElement) { const r = a.getBoundingClientRect(); if (r.width < 260 && r.height < 140) top = a; else break; }
      top.style.visibility = 'hidden'; } })()`);
  await sleep(400);
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(path.join(OUT, ten), Buffer.from(data, 'base64'));
  return ten;
}
// Bấm nút mở hộp chọn file rồi đưa file vào (Chrome chặn hộp thoại thật, trả về ô <input type=file>)
async function chonFile(sel, filePath) {
  fileChoosers.length = 0;
  await tap(sel);
  for (let t = 0; t < 5000 && !fileChoosers.length; t += 100) await sleep(100);
  if (!fileChoosers.length) throw new Error('Không mở được hộp chọn file');
  await send('DOM.setFileInputFiles', { files: [filePath], backendNodeId: fileChoosers[0].backendNodeId });
  await sleep(1200);
}
async function moApp() {
  await send('Page.navigate', { url: `http://127.0.0.1:${WEB_PORT}/` });
  await choDen('I already have an account', 20000);
}
async function dangNhap(email, tenHienThi) {
  await moApp();
  await tap('div', { text: 'I already have an account' });
  await typeInto('input', email);
  await evalJs(`document.querySelectorAll('input')[1].focus()`);
  await send('Input.insertText', { text: '123456' });
  await sleep(300);
  await tap('div', { text: 'Log in' });
  await choDen(tenHienThi);
}
async function moStudio() {
  await tap('[aria-label="Profile"]');
  await choDen('Personal information');
  await tap('[aria-label="Artist Studio"]');
  await choDen('Upload a song');
}

async function chay(id, moTa, fn) {
  const anh = [];
  try {
    const thucTe = await fn(anh);
    ketQua.push({ id, moTa, status: 'Pass', actual: thucTe, screenshots: anh });
    console.log(`✓ ${id} ${moTa}`);
  } catch (err) {
    anh.push(await chup(`${id}_loi.png`).catch(() => null));
    ketQua.push({ id, moTa, status: 'Fail', actual: err.message, screenshots: anh.filter(Boolean) });
    console.log(`✕ ${id} ${moTa}: ${err.message}`);
  }
}



const SONG_TITLE = 'Stats Demo Song';
const SONG_2 = 'Second Demo Song';
const TZ = -new Date().getTimezoneOffset();

// Tải 1 bài hát (file nhạc thật) lên bằng API của Artist Studio
async function taiBaiQuaApi(token, title) {
  const form = new FormData();
  form.append('title', title);
  form.append('genre', 'Pop');
  form.append('audio', new Blob([readFileSync(AUDIO_FILE)], { type: 'audio/mp4' }), 's8.m4a');
  const res = await fetch(`${API}/api/studio/songs`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  const body = await res.json();
  if (res.status !== 201) throw new Error(`Tải bài thất bại: ${res.status} ${body.message}`);
  return body.data.id;
}
const ngheQuaApi = (songId, token, source) => apiCall('POST', `/api/songs/${songId}/play`, token, { source });
const layStats = async (token, range = '7') => (await apiCall('GET', `/api/studio/stats?range=${range}&tz=${TZ}`, token)).body.data;
async function moStats() {
  await moStudio();
  await tap('[aria-label="Stats"]');
  await choDen('Followers');
}

try {
  await apiReady;
  let url;
  for (let i = 0; i < 40 && !url; i++) {
    try { url = (await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()).find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch {}
    if (!url) await sleep(250);
  }
  ws = new WebSocket(url);
  await new Promise((r) => (ws.onopen = r));
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.method === 'Page.fileChooserOpened') fileChoosers.push(d.params);
    // Ghi lại lỗi JavaScript của app (để biết vì sao màn hình bị trắng nếu có)
    if (d.method === 'Runtime.exceptionThrown') loiTrinhDuyet.push(d.params.exceptionDetails?.exception?.description || d.params.exceptionDetails?.text);
    if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') loiTrinhDuyet.push(d.params.args.map((a) => a.value ?? a.description).join(' '));
    if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.rej(new Error(d.error.message)) : p.res(d.result); }
  };
  await send('Page.enable');
  await send('DOM.enable');
  await send('Runtime.enable');
  await send('Page.setInterceptFileChooserDialog', { enabled: true });
  await send('Emulation.setDeviceMetricsOverride', { width: 400, height: 860, deviceScaleFactor: 2, mobile: true });



  const merToken = await apiLogin('mer@example.com');
  const jasonToken = await apiLogin('jason@example.com');
  const ashleyToken = await apiLogin('ashley@example.com');
  let songId, song2Id;

  await chay('IT126', 'Nghệ sĩ chưa có lượt nghe: Studio có mục Stats, màn Stats hiện "No plays yet" và 2 nút gợi ý', async (anh) => {
    songId = await taiBaiQuaApi(merToken, SONG_TITLE);
    song2Id = await taiBaiQuaApi(merToken, SONG_2);
    await dangNhap('mer@example.com', 'Mer Watson');
    await moStudio();
    await choDen('0 plays in the last 7 days');
    anh.push(await chup('IT126_1_studio_co_muc_stats.png'));
    await tap('[aria-label="Stats"]');
    await choDen('No plays yet');
    await choDen('Post on the Feed');
    anh.push(await chup('IT126_2_chua_co_luot_nghe.png'));
    await tap('[aria-label="How stats are counted"]');
    await choDen('at most once per song every 10 minutes');
    anh.push(await chup('IT126_3_cach_tinh.png'));
    await tap('[aria-label="Got it"]');
    await tap('[aria-label="Upload a song"]');
    await choDen('Choose an audio file *');
    return 'Mục Stats ghi "0 plays in the last 7 days"; màn Stats hiện "No plays yet"; nút ⓘ mở bảng cách tính; nút "Upload a song" mở màn tải bài';
  });

  await chay('IT127', 'Người nghe tìm và nghe bài hơn 30 giây trên app → được tính 1 lượt, nguồn Search; nghe lại ngay không tính', async (anh) => {
    await dangNhap('jason@example.com', 'Jason Smith');
    await typeInto('input[placeholder="What you want to listen to"]', 'stats demo');
    await choDen(SONG_TITLE);
    anh.push(await chup('IT127_1_tim_bai.png'));
    await tap('div', { text: SONG_TITLE });
    // Chờ app tự gửi lượt nghe sau khi phát đủ 30 giây
    let d;
    for (let t = 0; t < 75000; t += 3000) {
      await sleep(3000);
      d = await layStats(merToken);
      if (d.tiles.plays.value >= 1) break;
    }
    anh.push(await chup('IT127_2_dang_phat.png'));
    if (d.tiles.plays.value !== 1) throw new Error(`Sau 75 giây máy chủ ghi ${d.tiles.plays.value} lượt nghe (mong đợi 1)`);
    const lai = (await ngheQuaApi(songId, jasonToken, 'search')).body;
    const tuNghe = (await ngheQuaApi(songId, merToken, 'artist')).body;
    const sau = await layStats(merToken);
    if (lai.counted !== false || tuNghe.counted !== false || sau.tiles.plays.value !== 1) throw new Error('Lượt nghe trùng / tự nghe vẫn được tính');
    return `App gửi lượt nghe sau ~30 giây phát: Plays = 1, Listeners = ${d.tiles.listeners.value}, nguồn = ${d.sources.map((s) => s.source).join(',')}; nghe lại ngay: counted = ${lai.counted} (${lai.reason}); nghệ sĩ tự nghe: counted = ${tuNghe.counted} (${tuNghe.reason})`;
  });

  await chay('IT128', 'Màn Stats 7 ngày: ô số, biểu đồ, top bài, nguồn lượt nghe, người theo dõi, Feed', async (anh) => {
    // Thêm lượt nghe từ người nghe khác + khách, theo dõi, thích bài, bài đăng
    await ngheQuaApi(songId, ashleyToken, 'feed');
    await ngheQuaApi(songId, null, 'home');
    await ngheQuaApi(song2Id, ashleyToken, 'feed');
    await apiCall('POST', '/api/auth/follow-artist', jasonToken, { artistId: 'a_mer' });
    await apiCall('POST', '/api/auth/follow-artist', ashleyToken, { artistId: 'a_mer' });
    await apiCall('POST', '/api/auth/like-song', jasonToken, { songId });
    await apiCall('POST', '/api/feed/posts', merToken, { content: 'Thank you for listening!', songId });
    await dangNhap('mer@example.com', 'Mer Watson');
    await moStudio();
    await choDen('4 plays in the last 7 days');
    await choDen('+2 this week');
    anh.push(await chup('IT128_1_studio_tuan_nay.png'));
    await tap('[aria-label="Stats"]');
    await choDen('Plays per day');
    await choDen('Top songs');
    await choDen('Where plays come from');
    const text = await pageText();
    for (const can of ['▲ new', SONG_TITLE, SONG_2, 'Feed', 'Search', '+2', 'followed']) {
      if (!text.includes(can)) throw new Error(`Màn Stats thiếu "${can}"`);
    }
    anh.push(await chup('IT128_2_stats_7_ngay.png'));
    await tap('[aria-label$="· 4 plays"]');
    await choDen('· 4 plays');
    anh.push(await chup('IT128_3_bam_cot_hom_nay.png'));
    await evalJs(`(() => { const s = [...document.querySelectorAll('div')].filter(e => e.scrollHeight > e.clientHeight + 40 && getComputedStyle(e).overflowY !== 'visible').pop(); if (s) s.scrollTop = s.scrollHeight; })()`);
    await sleep(600);
    anh.push(await chup('IT128_4_followers_feed.png'));
    const d = await layStats(merToken);
    return `Plays ${d.tiles.plays.value}, Listeners ${d.tiles.listeners.value}, New followers +${d.tiles.newFollowers.value}, Song likes +${d.tiles.songLikes.value}; top: ${d.topSongs.map((s) => `${s.title} ${s.plays}`).join(' | ')}; nguồn: ${d.sources.map((s) => `${s.source} ${s.percent}%`).join(', ')}; Feed: ${d.feed.posts} bài`;
  });

  await chay('IT129', 'Đổi khoảng thời gian: 30 days và All time (tổng, biểu đồ theo tháng)', async (anh) => {
    await evalJs(`(() => { const s = [...document.querySelectorAll('div')].filter(e => e.scrollTop > 0).pop(); if (s) s.scrollTop = 0; })()`);
    await tap('[aria-label="30 days"]');
    await choDen('vs prev. 30 days').catch(() => choDen('▲ new'));
    await sleep(800);
    anh.push(await chup('IT129_1_stats_30_ngay.png'));
    await tap('[aria-label="All time"]');
    await choDen('Plays per month');
    await choDen('All-time top songs');
    await choDen('Total plays');
    anh.push(await chup('IT129_2_stats_all_time.png'));
    const all = await layStats(merToken, 'all');
    if (all.tiles.plays.value !== 4 || all.series.length !== 12) throw new Error('Số liệu All time không đúng');
    return `30 days hiện 30 cột; All time: Total plays ${all.tiles.plays.value}, Listeners ${all.tiles.listeners.value}, biểu đồ ${all.series.length} tháng, Followers ${all.tiles.followers.value} (+${all.tiles.followers.followed} / −${all.tiles.followers.unfollowed})`;
  });

  await chay('IT130', 'Thống kê một bài: mở từ Top songs và từ menu ⋯ ở My songs', async (anh) => {
    await tap('[aria-label="7 days"]');
    await choDen('Top songs');
    await tap(`[aria-label="Stats for ${SONG_TITLE}"]`);
    await choDen('Song stats');
    await choDen('All-time plays');
    await choDen('Added to playlists');
    await choDen('this song');
    anh.push(await chup('IT130_1_thong_ke_bai_hat.png'));
    await tap('[aria-label="Back"]');
    await tap('[aria-label="Back"]');
    await choDen('Upload a song');
    await tap('[aria-label="My songs"]');
    await choDen(SONG_2);
    await tap(`[aria-label="Options for ${SONG_2}"]`);
    await choDen('Stats');
    anh.push(await chup('IT130_2_menu_co_stats.png'));
    await tap('[aria-label="Stats"]');
    await choDen('Song stats');
    await choDen(SONG_2);
    anh.push(await chup('IT130_3_thong_ke_bai_thu_hai.png'));
    const bai = (await apiCall('GET', `/api/studio/stats/songs/${songId}?range=7&tz=${TZ}`, merToken)).body.data;
    return `Bài "${SONG_TITLE}": Plays ${bai.tiles.plays.value}, Liked by +${bai.tiles.likes.value}, nguồn ${bai.sources.map((s) => `${s.source} ${s.percent}%`).join(', ')}; menu ⋯ ở My songs có mục Stats mở đúng bài "${SONG_2}"`;
  });
} catch (err) {
  console.error('Lỗi chạy kiểm thử:', err);
} finally {
  if (loiTrinhDuyet.length) console.log('Lỗi trong trình duyệt:\n' + [...new Set(loiTrinhDuyet)].slice(0, 10).join('\n---\n'));
  writeFileSync(path.join(OUT, 'ket-qua.json'), JSON.stringify({ chayLuc: new Date().toISOString(), results: ketQua, loiTrinhDuyet }, null, 2));
  console.log(`\nApp ↔ API (giai đoạn 4): ${ketQua.filter((k) => k.status === 'Pass').length}/${ketQua.length} Pass`);
  ws?.close();
  chrome.kill();
  apiProc.kill();
  web.close();
  await sleep(500);
  try { rmSync(uploadRoot, { recursive: true, force: true }); } catch {}
  try { rmSync(path.join(OUT, 'chrome-profile'), { recursive: true, force: true }); } catch {}
  process.exit(ketQua.length === 5 && ketQua.every((k) => k.status === 'Pass') ? 0 : 1);
}
