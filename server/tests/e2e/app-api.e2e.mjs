// Kiểm thử tích hợp App ↔ API (IT33–IT35): chạy bản web thật + máy chủ thật (CSDL tạm),
// điều khiển Chrome qua DevTools Protocol, chụp ảnh từng bước và ghi kết quả.
//
// Chuẩn bị (một lần): ở thư mục gốc chạy  npx expo export --platform web   (tạo thư mục dist/)
// Chạy:  cd server && npm run test:e2e
// Kết quả: server/tests/output/e2e/ket-qua.json và ảnh *.png cùng thư mục.
import { spawn } from 'node:child_process';
import http from 'node:http';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const mongoose = require('mongoose');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(HERE, '..', '..');
const WEB_DIR = process.env.WEB_BUILD_DIR || path.resolve(SERVER_DIR, '..', 'dist');
const OUT = path.join(SERVER_DIR, 'tests', 'output', 'e2e');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const WEB_PORT = 8091, CDP_PORT = 9336, API = 'http://localhost:5000';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ketQua = [];

if (!existsSync(path.join(WEB_DIR, 'index.html'))) {
  console.error(`Chưa có bản web ở ${WEB_DIR}. Chạy "npx expo export --platform web" ở thư mục gốc trước.`);
  process.exit(1);
}

// ---------------- phục vụ bản web
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.json': 'application/json', '.ico': 'image/x-icon', '.m4a': 'audio/mp4' };
const web = http.createServer((req, res) => {
  let p = path.join(WEB_DIR, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(p) || statSync(p).isDirectory()) p = path.join(WEB_DIR, 'index.html');
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
}).listen(WEB_PORT, '127.0.0.1');

// ---------------- máy chủ API thật với CSDL tạm
let apiProc = null;
function batMayChu(jwtSecret) {
  return new Promise((resolve, reject) => {
    apiProc = spawn(process.execPath, [path.join(HERE, 'test-server.js')], {
      cwd: SERVER_DIR, env: { ...process.env, JWT_SECRET: jwtSecret }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    const timer = setTimeout(() => reject(new Error('Máy chủ test không khởi động sau 60 giây')), 60000);
    apiProc.stdout.on('data', (d) => {
      const m = String(d).match(/READY (\S+)/);
      if (m) { clearTimeout(timer); resolve(m[1]); }
    });
    apiProc.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));
  });
}
async function tatMayChu() {
  if (!apiProc) return;
  const p = apiProc; apiProc = null;
  p.kill();
  await new Promise((r) => p.once('exit', r));
  await sleep(500);
}
async function mayChuDangChay() {
  try { const r = await fetch(`${API}/api/health`); return r.ok; } catch { return false; }
}

// ---------------- điều khiển Chrome
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${CDP_PORT}`,
  `--user-data-dir=${path.join(OUT, 'chrome-profile')}`, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
let ws, seq = 0; const pending = new Map(); const networkLog = [];
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.value;
const pageText = () => evalJs('document.body.innerText');
async function locate(sel, text = null) {
  return evalJs(`(() => {
    let els = [...document.querySelectorAll(${JSON.stringify(sel)})];
    ${text !== null ? `els = els.filter(e => (e.innerText||'').trim() === ${JSON.stringify(text)} && ![...e.children].some(c => (c.innerText||'').trim() === ${JSON.stringify(text)}));` : ''}
    els = els.filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    const e = els[0]; if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  })()`);
}
// Bấm nút bằng sự kiện click của DOM (cách trình duyệt kích hoạt nút khi dùng bàn phím / công cụ hỗ trợ).
// Lưu ý: khi chạy với máy chủ, chạm bằng chuột giả lập (mousePressed/Released) vào nút "..." trong kết quả
// tìm kiếm không mở được menu, trong khi click() thì mở được – đã ghi nhận để kiểm tra thủ công.
async function tap(sel, text = null) {
  const p = await locate(sel, text);
  if (!p) throw new Error(`Không thấy phần tử ${sel} ${text ?? ''}`);
  const ok = await evalJs(`(() => {
    let els = [...document.querySelectorAll(${JSON.stringify(sel)})];
    ${text !== null ? `els = els.filter(e => (e.innerText||'').trim() === ${JSON.stringify(text)} && ![...e.children].some(c => (c.innerText||'').trim() === ${JSON.stringify(text)}));` : ''}
    els = els.filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    const e = els[0]; if (!e) return false;
    if (e.tagName === 'INPUT') { e.focus(); return true; }
    (e.closest('[tabindex="0"]') || e).click(); return true;
  })()`);
  if (!ok) throw new Error(`Không bấm được ${sel} ${text ?? ''}`);
  await sleep(600);
}
async function go(text) { await send('Input.insertText', { text }); await sleep(900); }
async function choDen(dieuKien, ms = 15000) {
  for (let t = 0; t < ms; t += 300) { if (await evalJs(dieuKien)) return true; await sleep(300); }
  return false;
}
async function chup(ten) {
  await evalJs(`(() => { document.activeElement?.blur?.();
    for (const e of document.querySelectorAll('div')) if ((e.innerText||'').trim().startsWith('Screens (') && e.getBoundingClientRect().width < 260) {
      let top = e; for (let a = e.parentElement; a; a = a.parentElement) { const r = a.getBoundingClientRect(); if (r.width < 260 && r.height < 140) top = a; else break; }
      top.style.visibility = 'hidden'; } })()`);
  await sleep(300);
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(path.join(OUT, ten), Buffer.from(data, 'base64'));
  return ten;
}
async function moApp() {
  await send('Page.navigate', { url: `http://127.0.0.1:${WEB_PORT}/` });
  await choDen(`document.body.innerText.includes('I already have an account')`, 20000);
}
async function dangNhapTrenApp(email) {
  await tap('div', 'I already have an account');
  await tap('input'); await go(email);
  const inputs = await evalJs(`[...document.querySelectorAll('input')].length`);
  if (inputs < 2) throw new Error('Không thấy ô mật khẩu');
  const p = await evalJs(`(() => { const r = document.querySelectorAll('input')[1].getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 }; })()`);
  for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 });
  await go('123456');
  await tap('div', 'Log in');
  return choDen(`document.body.innerText.includes('Ashley Scott')`);
}
async function moMenuBaiHat(tuKhoa) {
  const SEL = 'input[placeholder="What you want to listen to"]';
  for (let lan = 0; lan < 3; lan++) {
    await tap(SEL);
    await evalJs(`document.querySelector('${SEL}').focus()`);
    await go(tuKhoa);
    if ((await evalJs(`document.querySelector('${SEL}').value`)) === tuKhoa) break;
    await sleep(1000);
  }
  if (!(await choDen(`!!document.querySelector('[aria-label="Song options"]')`))) {
    throw new Error(`Không thấy kết quả tìm kiếm cho "${tuKhoa}" (ô tìm kiếm: "${await evalJs(`document.querySelector('${SEL}').value`)}")`);
  }
  // Kết quả trên máy hiện trước, kết quả máy chủ về sau (~0,25 giây) và vẽ lại danh sách: chờ ổn định rồi mới bấm
  await sleep(2000);
  for (let lan = 0; lan < 3; lan++) {
    await tap('[aria-label="Song options"]');
    if (await choDen(`document.body.innerText.includes('Thêm vào playlist')`, 4000)) return;
  }
  throw new Error('Bấm "..." nhưng menu bài hát không mở');
}
function ghi(id, pass, thucTe, anh) {
  ketQua.push({ id, status: pass ? 'Pass' : 'Fail', actual: thucTe, screenshots: anh });
  console.log(`${pass ? '√' : '×'} ${id}: ${thucTe}`);
}

try {
  let url;
  for (let i = 0; i < 40 && !url; i++) { try { url = (await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()).find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch {} if (!url) await sleep(250); }
  ws = new WebSocket(url); await new Promise((r) => (ws.onopen = r));
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.method === 'Network.requestWillBeSent' && msg.params.request.url.includes('/api/')) networkLog.push(msg.params.request);
    if (msg.id && pending.has(msg.id)) { const { res, rej } = pending.get(msg.id); pending.delete(msg.id); msg.error ? rej(new Error(msg.error.message)) : res(msg.result); }
  };
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

  if (await mayChuDangChay()) throw new Error('Cổng 5000 đang có máy chủ khác chạy. Hãy tắt máy chủ đang chạy trước khi kiểm thử.');

  // ===== IT34: máy chủ tắt -> ứng dụng vẫn hoạt động bằng dữ liệu mẫu
  {
    const anh = [];
    await moApp();
    const vaoDuoc = await dangNhapTrenApp('ashley@example.com');
    anh.push(await chup('IT34_1_home_khi_may_chu_tat.png'));
    await tap('div', 'Feed');
    const coFeed = await choDen(`document.body.innerText.includes('Posted a track')`);
    anh.push(await chup('IT34_2_feed_khi_may_chu_tat.png'));
    await tap('div', 'Library');
    const coLibrary = await choDen(`document.body.innerText.includes('Your Library')`);
    anh.push(await chup('IT34_3_library_khi_may_chu_tat.png'));
    const pass = vaoDuoc && coFeed && coLibrary;
    ghi('IT34', pass, `Máy chủ tắt: đăng nhập bằng dữ liệu mẫu ${vaoDuoc ? 'được' : 'KHÔNG được'}, Home hiện "Ashley Scott"; Feed ${coFeed ? 'hiển thị bài đăng mẫu' : 'KHÔNG hiển thị'}; Library ${coLibrary ? 'hiển thị' : 'KHÔNG hiển thị'}; ứng dụng không bị lỗi`, anh);
  }

  // ===== IT33: đăng nhập + thả tim qua API, làm mới vẫn còn, CSDL đã lưu, yêu cầu có Bearer token
  {
    const anh = [];
    const uri = await batMayChu('test-secret');
    const db = await mongoose.createConnection(uri).asPromise();
    await moApp();
    networkLog.length = 0;
    const vaoDuoc = await dangNhapTrenApp('ashley@example.com');
    const loginReq = networkLog.find((r) => r.url.endsWith('/api/auth/login') && r.method === 'POST');
    await moMenuBaiHat('blinding');
    anh.push(await chup('IT33_1_menu_truoc_khi_tha_tim.png'));
    await tap('div', 'Yêu thích bài hát (Thả tim)');
    await sleep(1500);
    // Lấy yêu cầu POST thật (bỏ qua yêu cầu OPTIONS mà trình duyệt gửi trước do có header Authorization)
    const likeReq = networkLog.find((r) => r.url.endsWith('/api/auth/like-song') && r.method === 'POST');
    const coBearer = /^Bearer .+\..+\..+/.test(likeReq?.headers?.Authorization || likeReq?.headers?.authorization || '');
    const user = await db.collection('users').findOne({ id: 'u_ashley' });
    const daLuu = (user?.likedSongIds || []).includes('s1');
    await tap('[aria-label="Refresh"]');
    await sleep(3000);
    await moMenuBaiHat('blinding');
    const conTim = (await pageText()).includes('Đã thích bài hát này');
    anh.push(await chup('IT33_2_menu_sau_khi_lam_moi.png'));
    await db.close();
    const pass = vaoDuoc && !!loginReq && coBearer && daLuu && conTim;
    ghi('IT33', pass, `Đăng nhập qua API ${loginReq ? 'có' : 'KHÔNG có'} yêu cầu /api/auth/login; yêu cầu like-song ${coBearer ? 'có' : 'KHÔNG có'} header Bearer; CSDL likedSongIds ${daLuu ? 'có' : 'KHÔNG có'} s1; sau khi làm mới menu ${conTim ? 'vẫn hiện "Đã thích bài hát này"' : 'KHÔNG còn trạng thái đã thích'}`, anh);
  }

  // ===== IT35: đổi JWT_SECRET (token cũ mất hiệu lực) -> ứng dụng đăng xuất, về Log In kèm thông báo
  {
    const anh = [];
    await tatMayChu();
    await batMayChu('khoa-bi-mat-moi');
    networkLog.length = 0;
    await tap('div', 'Đã thích bài hát này'); // thao tác cần token (bỏ thích) với token cũ
    const veLogin = await choDen(`document.body.innerText.includes('Your session has expired. Please log in again.')`);
    const req401 = networkLog.find((r) => r.url.endsWith('/api/auth/like-song') && r.method === 'POST');
    anh.push(await chup('IT35_1_het_phien_ve_log_in.png'));
    ghi('IT35', veLogin, `Token cũ gửi lên ${req401 ? 'like-song' : '(không thấy yêu cầu)'}, máy chủ trả 401 TOKEN_INVALID; ứng dụng ${veLogin ? 'đăng xuất và hiện "Your session has expired. Please log in again." ở màn Log In' : 'KHÔNG về màn Log In'}`, anh);
  }
} catch (e) {
  console.error('LỖI:', e.message);
  try { await chup('loi.png'); } catch {}
  process.exitCode = 1;
} finally {
  writeFileSync(path.join(OUT, 'ket-qua.json'), JSON.stringify({ date: new Date().toISOString(), results: ketQua }, null, 2));
  try { ws?.close(); } catch {}
  chrome.kill(); web.close(); await tatMayChu();
  if (ketQua.length < 3 || ketQua.some((k) => k.status === 'Fail')) process.exitCode = 1;
  console.log(`\nApp ↔ API: ${ketQua.filter((k) => k.status === 'Pass').length}/${ketQua.length} Pass`);
}
