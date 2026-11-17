// Kiểm thử App ↔ API cho giai đoạn 2 – Artist Studio (IT93–IT97), chạy bản web thật + máy chủ thật
// với CSDL tạm, điều khiển Chrome (kể cả hộp chọn file) và chụp ảnh từng bước.
//
// Chuẩn bị: build bản web trỏ tới cổng API test (ở thư mục gốc):
//   EXPO_PUBLIC_API_URL=http://127.0.0.1:5055 npx expo export --platform web --output-dir dist-e2e
// Chạy:  cd server && WEB_BUILD_DIR=../dist-e2e node tests/e2e/studio.e2e.mjs
// Kết quả: server/tests/output/e2e-gd2/ket-qua.json và ảnh *.png
import { spawn } from 'node:child_process';
import http from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(HERE, '..', '..');
const WEB_DIR = path.resolve(process.env.WEB_BUILD_DIR || path.join(SERVER_DIR, '..', 'dist-e2e'));
const OUT = process.env.E2E_OUT || path.join(SERVER_DIR, 'tests', 'output', 'e2e-gd2');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const API_PORT = Number(process.env.API_PORT || 5055);
const WEB_PORT = 8094, CDP_PORT = 9339;
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

const uploadRoot = path.join(os.tmpdir(), `music-e2e-studio-${Date.now()}`);
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
  const ok = await evalJs(`(() => { const e = ${findJs(sel, text, last)}; if (!e) return false; (e.closest('[tabindex="0"]') || e).click(); return true; })()`);
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

const SONG_TITLE = 'Mua thu Ha Noi';
const RENAMED = 'Mer & The Waves';

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

  await chay('IT93', 'Nghệ sĩ vào Artist Studio, tải 1 file nhạc thật lên và đăng ngay', async (anh) => {
    await dangNhap('mer@example.com', 'Mer Watson');
    await moStudio();
    anh.push(await chup('IT93_1_artist_studio.png'));
    await tap('div', { text: 'Upload a song' });
    await choDen('Choose an audio file *');
    await tap('[aria-label="Upload"]');
    await choDen('Please choose an audio file.');
    anh.push(await chup('IT93_2_bao_loi.png'));
    await chonFile('[aria-label="Choose an audio file"]', AUDIO_FILE);
    await choDen('s8.m4a');
    await typeInto('input[aria-label="Song title"]', SONG_TITLE, { clear: true });
    await tap('[aria-label="Genre Pop"]');
    anh.push(await chup('IT93_3_form_tai_bai.png'));
    await tap('[aria-label="Upload"]');
    await choDen('Song published!', 30000);
    anh.push(await chup('IT93_4_da_dang.png'));
    const songs = (await apiCall('GET', '/api/studio/songs', await apiLogin('mer@example.com'))).body.data;
    const song = songs.find((s) => s.title === SONG_TITLE);
    if (!song) throw new Error('CSDL không có bài vừa tải');
    return `Tải thành công; CSDL: "${song.title}", status = ${song.status}, duration = ${song.duration} (đọc từ file)`;
  });

  await chay('IT94', 'My songs: ẩn bài → hiện lại; sửa tên bài', async (anh) => {
    await tap('[aria-label="View in My songs"]');
    await choDen(SONG_TITLE);
    anh.push(await chup('IT94_1_bai_hat_cua_toi.png'));
    await tap(`[aria-label="Options for ${SONG_TITLE}"]`);
    await choDen('Hide from listeners');
    anh.push(await chup('IT94_2_menu_thao_tac.png'));
    await tap('[aria-label="Hide from listeners"]');
    await choDen('is hidden from listeners');
    anh.push(await chup('IT94_3_da_an.png'));
    await tap(`[aria-label="Options for ${SONG_TITLE}"]`);
    await tap('[aria-label="Show again"]');
    await choDen('is published');
    await tap(`[aria-label="Options for ${SONG_TITLE}"]`);
    await tap('[aria-label="Edit details"]');
    await choDen('Edit song');
    await typeInto('input[aria-label="Song title"]', 'Mùa thu Hà Nội', { clear: true });
    anh.push(await chup('IT94_4_sua_bai.png'));
    await tap('[aria-label="Save changes"]');
    await choDen('Mùa thu Hà Nội');
    anh.push(await chup('IT94_5_sau_khi_sua.png'));
    return 'Ẩn → nhãn Hidden; Show again → Published; đổi tên thành "Mùa thu Hà Nội" hiện ngay trong danh sách';
  });

  await chay('IT95', 'Tạo album, chọn bài, đăng; bài nháp trong album không hiện cho người nghe', async (anh) => {
    await dangNhap('mer@example.com', 'Mer Watson');
    await moStudio();
    await tap('[aria-label="Albums"]');
    await choDen('New album');
    await tap('[aria-label="New album"]');
    await choDen('Songs (0 selected)');
    await typeInto('input[aria-label="Album title"]', 'Hà Nội Stories');
    await tap('[aria-label="Add Mùa thu Hà Nội"]');
    await tap('[aria-label="Add Bản nháp chưa phát hành"]');
    await choDen('Songs (2 selected)');
    anh.push(await chup('IT95_1_tao_album.png'));
    await tap('[aria-label="Save & publish"]');
    await choDen('Hà Nội Stories');
    anh.push(await chup('IT95_2_danh_sach_album.png'));
    const trang = (await apiCall('GET', '/api/artists/a_mer')).body.data;
    const album = trang.albums.find((a) => a.title === 'Hà Nội Stories');
    if (!album || album.songIds.length !== 1) throw new Error(`Album công khai có ${album?.songIds.length} bài (mong đợi 1)`);
    return 'Album "Hà Nội Stories" đăng thành công; người nghe chỉ thấy 1 bài (bài nháp bị bỏ ra)';
  });

  await chay('IT96', 'Sửa trang nghệ sĩ: đổi nghệ danh, thể loại, tiểu sử', async (anh) => {
    await dangNhap('mer@example.com', 'Mer Watson');
    await moStudio();
    await tap('[aria-label="Edit artist page"]');
    await choDen('Edit artist page');
    await typeInto('input[aria-label="Stage name"]', 'son tung m-tp', { clear: true });
    await tap('[aria-label="Acoustic"]');
    await typeInto('textarea[aria-label="Bio"]', 'Acoustic songwriter from the coast of Đà Nẵng.', { clear: true });
    await tap('[aria-label="Save changes"]');
    await choDen('already used by another artist');
    anh.push(await chup('IT96_1_trung_nghe_danh.png'));
    await typeInto('input[aria-label="Stage name"]', RENAMED, { clear: true });
    await tap('[aria-label="Save changes"]');
    await choDen('Your artist page has been updated.');
    anh.push(await chup('IT96_2_da_luu.png'));
    const bai = (await apiCall('GET', '/api/studio/songs', await apiLogin('mer@example.com'))).body.data.find((s) => s.title === 'Mùa thu Hà Nội');
    if (bai.artist !== RENAMED) throw new Error(`Tên nghệ sĩ trên bài hát chưa đổi: ${bai.artist}`);
    return `Trùng "Sơn Tùng M-TP" bị chặn; đổi thành "${RENAMED}" thành công, bài hát hiển thị tên mới`;
  });

  await chay('IT97', 'Người nghe tìm thấy bài mới, mở trang nghệ sĩ thấy bài + album, phát được bài', async (anh) => {
    await dangNhap('jason@example.com', 'Jason Smith');
    await typeInto('input[placeholder="What you want to listen to"]', 'mua thu ha noi');
    await choDen('Mùa thu Hà Nội');
    await khongCo('Bản nháp chưa phát hành');
    anh.push(await chup('IT97_1_tim_kiem.png'));
    await typeInto('input[placeholder="What you want to listen to"]', 'mer waves', { clear: true });
    await choDen(RENAMED);
    await tap('div', { text: RENAMED, last: true }); // dòng nghệ sĩ nằm sau dòng bài hát
    await choDen('Hà Nội Stories');
    await khongCo('Bản nháp chưa phát hành');
    anh.push(await chup('IT97_2_trang_nghe_si.png'));
    await tap('div', { text: 'Mùa thu Hà Nội' });
    await sleep(2500);
    anh.push(await chup('IT97_3_phat_bai.png'));
    const text = await pageText();
    if (!text.includes('Mùa thu Hà Nội')) throw new Error('Màn phát nhạc không hiện bài');
    return 'Tìm không dấu ra bài mới, bài nháp không hiện; trang nghệ sĩ có bài và album; bấm bài thì phát';
  });
} catch (err) {
  console.error('Lỗi chạy kiểm thử:', err);
} finally {
  if (loiTrinhDuyet.length) console.log('Lỗi trong trình duyệt:\n' + [...new Set(loiTrinhDuyet)].slice(0, 10).join('\n---\n'));
  writeFileSync(path.join(OUT, 'ket-qua.json'), JSON.stringify({ chayLuc: new Date().toISOString(), results: ketQua, loiTrinhDuyet }, null, 2));
  console.log(`\nApp ↔ API (giai đoạn 2): ${ketQua.filter((k) => k.status === 'Pass').length}/${ketQua.length} Pass`);
  ws?.close();
  chrome.kill();
  apiProc.kill();
  web.close();
  await sleep(500);
  try { rmSync(uploadRoot, { recursive: true, force: true }); } catch {}
  try { rmSync(path.join(OUT, 'chrome-profile'), { recursive: true, force: true }); } catch {}
  process.exit(ketQua.length === 5 && ketQua.every((k) => k.status === 'Pass') ? 0 : 1);
}
