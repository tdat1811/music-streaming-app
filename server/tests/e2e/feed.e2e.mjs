// Kiểm thử App ↔ API cho giai đoạn 3 – Bảng tin & tương tác (IT111–IT115), chạy bản web thật + máy chủ thật
// với CSDL tạm, điều khiển Chrome (kể cả hộp chọn file) và chụp ảnh từng bước.
//
// Chuẩn bị: build bản web trỏ tới cổng API test (ở thư mục gốc):
//   EXPO_PUBLIC_API_URL=http://127.0.0.1:5055 npx expo export --platform web --output-dir dist-e2e
// Chạy:  cd server && WEB_BUILD_DIR=../dist-e2e node tests/e2e/feed.e2e.mjs
// Kết quả: server/tests/output/e2e-gd3/ket-qua.json và ảnh *.png
import { spawn } from 'node:child_process';
import http from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(HERE, '..', '..');
const WEB_DIR = path.resolve(process.env.WEB_BUILD_DIR || path.join(SERVER_DIR, '..', 'dist-e2e'));
const OUT = process.env.E2E_OUT || path.join(SERVER_DIR, 'tests', 'output', 'e2e-gd3');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const API_PORT = Number(process.env.API_PORT || 5055);
const WEB_PORT = 8095, CDP_PORT = 9340;
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

const uploadRoot = path.join(os.tmpdir(), `music-e2e-feed-${Date.now()}`);
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


const SONG_TITLE = 'Sunday Morning Demo';
const POST_TEXT = 'Thank you all for 1 year of listening! New song below 🎧';
const EDITED_TEXT = 'Thank you all for 1 year of listening! New song below 🎧 (updated)';

async function moFeed() {
  await tap('div', { text: 'Feed', last: true });
  await choDen('For you');
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


  // Jason theo dõi Mer, Ashley thì không (đặt qua API)
  const jasonToken = await apiLogin('jason@example.com');
  await apiCall('POST', '/api/auth/follow-artist', jasonToken, { artistId: 'a_mer' });

  await chay('IT111', 'Nghệ sĩ tải bài hát với "Share to feed" bật → bài tự lên Feed, người theo dõi được báo', async (anh) => {
    await dangNhap('mer@example.com', 'Mer Watson');
    await moStudio();
    await tap('div', { text: 'Upload a song' });
    await choDen('Share to feed');
    await chonFile('[aria-label="Choose an audio file"]', AUDIO_FILE);
    await choDen('s8.m4a');
    await typeInto('input[aria-label="Song title"]', SONG_TITLE, { clear: true });
    await tap('[aria-label="Genre Pop"]');
    anh.push(await chup('IT111_1_share_to_feed.png'));
    await tap('[aria-label="Upload"]');
    await choDen('Song published!', 30000);
    await choDen('Shared to the Feed');
    anh.push(await chup('IT111_2_da_dang_va_chia_se.png'));
    const tb = (await apiCall('GET', '/api/notifications', jasonToken)).body?.data || [];
    const moi = tb.find((n) => n.type === 'artist_new_song');
    if (!moi) throw new Error('Jason không nhận được thông báo "bài hát mới"');
    const feed = (await apiCall('GET', '/api/feed/posts')).body.data;
    if (feed[0]?.authorName !== 'Mer Watson') throw new Error('Bài chia sẻ không nằm đầu Feed');
    return `Tải xong: "Shared to the Feed · 1 follower notified"; đầu Feed là bài của Mer kèm "${SONG_TITLE}"; Jason nhận thông báo bài hát mới "${moi.text}"`;
  });

  await chay('IT112', 'Nghệ sĩ viết bài trên Feed (chữ + gắn bài hát), sửa bài → nhãn "edited"', async (anh) => {
    await dangNhap('mer@example.com', 'Mer Watson');
    await moFeed();
    await choDen("What's new, Mer Watson?");
    anh.push(await chup('IT112_1_feed_nghe_si.png'));
    await tap('[aria-label="Create post"]');
    await choDen('New post');
    await typeInto('textarea[aria-label="Post content"]', POST_TEXT);
    await tap('[aria-label="Attach a song"]');
    await tap(`[aria-label="Pick ${SONG_TITLE}"]`);
    anh.push(await chup('IT112_2_viet_bai.png'));
    await tap('[aria-label="Post"]');
    await choDen(POST_TEXT);
    anh.push(await chup('IT112_3_bai_moi_tren_feed.png'));
    await tap('[aria-label="Post options"]');
    await choDen('Edit post');
    anh.push(await chup('IT112_4_menu_bai_cua_minh.png'));
    await tap('[aria-label="Edit post"]');
    await typeInto('textarea[aria-label="Post content"]', EDITED_TEXT, { clear: true });
    await tap('[aria-label="Save"]');
    await choDen('(updated)');
    await choDen('· edited');
    anh.push(await chup('IT112_5_da_sua.png'));
    return 'Ô "What\'s new, Mer Watson?" hiện cho nghệ sĩ; bài chữ + bài hát lên đầu Feed; sửa xong hiện "· edited"';
  });

  await chay('IT113', 'Người theo dõi nhận thông báo, mở bài trên Feed, tab Following, bình luận', async (anh) => {
    await dangNhap('jason@example.com', 'Jason Smith');
    await tap('[aria-label^="Notifications"]');
    await choDen('posted on the Feed');
    await choDen('released a new song');
    anh.push(await chup('IT113_1_thong_bao.png'));
    await tap('[aria-label^="Mer Watson posted on the Feed"]');
    await choDen('(updated)');
    anh.push(await chup('IT113_2_mo_bai_tu_thong_bao.png'));
    await tap('[aria-label="Following"]');
    await choDen('(updated)');
    if ((await pageText()).includes('The Weeknd')) throw new Error('Tab Following vẫn hiện bài của nghệ sĩ không theo dõi');
    anh.push(await chup('IT113_3_tab_following.png'));
    await tap('[aria-label="Comments"]');
    await typeInto('input[placeholder="Write a comment..."]', 'Congrats Mer! Acoustic version please?');
    await tap('[aria-label="Send comment"]');
    await choDen('Acoustic version please?');
    anh.push(await chup('IT113_4_binh_luan.png'));
    return 'Thấy thông báo "posted on the Feed" và "released a new song"; bấm mở đúng bài; tab Following chỉ có bài của Mer; bình luận thành công';
  });

  await chay('IT114', 'Nghệ sĩ trả lời bình luận → nhãn "✓ Artist"; xoá bài (kèm bình luận)', async (anh) => {
    await dangNhap('mer@example.com', 'Mer Watson');
    await moFeed();
    await tap('[aria-label="Comments"]');
    await choDen('Acoustic version please?');
    await tap('div', { text: 'Reply' });
    await typeInto('input[placeholder="Write a comment..."]', 'Coming next month!');
    await tap('[aria-label="Send comment"]');
    await choDen('Coming next month!');
    await choDen('✓ Artist');
    anh.push(await chup('IT114_1_nghe_si_tra_loi.png'));
    await tap('[aria-label="Close comments"]');
    await choDen('For you');
    await tap('[aria-label="Post options"]');
    await tap('[aria-label="Delete post"]');
    await choDen('Delete this post?');
    anh.push(await chup('IT114_2_xac_nhan_xoa.png'));
    await tap('[aria-label="Delete"]');
    await sleep(1500);
    await khongCo('(updated)');
    anh.push(await chup('IT114_3_da_xoa.png'));
    const conLai = (await apiCall('GET', '/api/feed/posts?artistId=a_mer')).body.data.length;
    return `Trả lời của Mer có nhãn "✓ Artist" (nền xanh nhạt); xoá bài thành công, Mer còn ${conLai} bài (bài chia sẻ bài hát)`;
  });

  await chay('IT115', 'Người không theo dõi: không có ô viết bài, tab Following trống → "Discover artists"; không nhận thông báo', async (anh) => {
    const ashleyToken = await apiLogin('ashley@example.com');
    const tb = (await apiCall('GET', '/api/notifications', ashleyToken)).body?.data || [];
    await dangNhap('ashley@example.com', 'Ashley');
    await moFeed();
    await khongCo("What's new");
    await tap('[aria-label="Following"]');
    await choDen('No posts from artists you follow');
    anh.push(await chup('IT115_1_following_trong.png'));
    await tap('[aria-label="Discover artists"]');
    await sleep(1500);
    anh.push(await chup('IT115_2_kham_pha_nghe_si.png'));
    if (tb.some((n) => String(n.type).startsWith('artist_new'))) throw new Error('Ashley không theo dõi nhưng vẫn nhận thông báo');
    return 'Listener không có ô viết bài; tab Following trống có nút "Discover artists"; Ashley không nhận thông báo của Mer';
  });
} catch (err) {
  console.error('Lỗi chạy kiểm thử:', err);
} finally {
  if (loiTrinhDuyet.length) console.log('Lỗi trong trình duyệt:\n' + [...new Set(loiTrinhDuyet)].slice(0, 10).join('\n---\n'));
  writeFileSync(path.join(OUT, 'ket-qua.json'), JSON.stringify({ chayLuc: new Date().toISOString(), results: ketQua, loiTrinhDuyet }, null, 2));
  console.log(`\nApp ↔ API (giai đoạn 3): ${ketQua.filter((k) => k.status === 'Pass').length}/${ketQua.length} Pass`);
  ws?.close();
  chrome.kill();
  apiProc.kill();
  web.close();
  await sleep(500);
  try { rmSync(uploadRoot, { recursive: true, force: true }); } catch {}
  try { rmSync(path.join(OUT, 'chrome-profile'), { recursive: true, force: true }); } catch {}
  process.exit(ketQua.length === 5 && ketQua.every((k) => k.status === 'Pass') ? 0 : 1);
}
