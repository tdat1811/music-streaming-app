// Kiểm thử App ↔ API cho giai đoạn 5 – Admin nâng cao: báo cáo, vi phạm, khoá tài khoản (IT146–IT151), chạy bản web thật + máy chủ thật
// với CSDL tạm, điều khiển Chrome (kể cả hộp chọn file) và chụp ảnh từng bước.
//
// Chuẩn bị: build bản web trỏ tới cổng API test (ở thư mục gốc):
//   EXPO_PUBLIC_API_URL=http://127.0.0.1:5055 npx expo export --platform web --output-dir dist-e2e
// Chạy:  cd server && WEB_BUILD_DIR=../dist-e2e node tests/e2e/moderation.e2e.mjs
// Kết quả: server/tests/output/e2e-gd5/ket-qua.json và ảnh *.png
import { spawn } from 'node:child_process';
import http from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(HERE, '..', '..');
const WEB_DIR = path.resolve(process.env.WEB_BUILD_DIR || path.join(SERVER_DIR, '..', 'dist-e2e'));
const OUT = process.env.E2E_OUT || path.join(SERVER_DIR, 'tests', 'output', 'e2e-gd5');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const API_PORT = Number(process.env.API_PORT || 5055);
const WEB_PORT = 8097, CDP_PORT = 9343;
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

const uploadRoot = path.join(os.tmpdir(), `music-e2e-moderation-${Date.now()}`);
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




const POST_TEXT = 'Hello from Mer – new acoustic session tonight!';
const spam = (i) => `Spam comment ${i} buy followers bit.ly/x${i}`;

async function moAdminTab(label) {
  await tap(`[aria-label^="Admin tab ${label}"]`);
  await sleep(800);
}
async function moManage(segment) {
  await moAdminTab('Manage');
  await tap(`[aria-label="Manage ${segment}"]`);
  await sleep(900);
}
const binhLuanCon = async (postId) => (await apiCall('GET', `/api/feed/comments/${postId}`)).body.data.map((c) => c.text);

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
  const adminToken = await apiLogin('admin@example.com');
  // Mer đăng 1 bài, Jason bình luận 4 lần (để thử đủ 4 lần vi phạm)
  const postId = (await apiCall('POST', '/api/feed/posts', merToken, { content: POST_TEXT })).body.data.id;
  const commentIds = [];
  for (let i = 1; i <= 4; i++) {
    commentIds.push((await apiCall('POST', '/api/feed/comments', jasonToken, { postId, text: spam(i) })).body.data.id);
  }

  await chay('IT146', 'Người nghe báo cáo bình luận và bài đăng trên Feed (L1)', async (anh) => {
    await dangNhap('ashley@example.com', 'Ashley');
    await tap('div', { text: 'Feed', last: true });
    await choDen(POST_TEXT);
    await tap('[aria-label="Comments"]');
    await choDen(spam(1));
    anh.push(await chup('IT146_1_nut_report_binh_luan.png'));
    await tap('[aria-label="Report comment by Jason Smith"]');
    await choDen('Report this comment');
    await tap('[aria-label="Spam or misleading"]');
    anh.push(await chup('IT146_2_chon_ly_do.png'));
    await tap('[aria-label="Send report"]');
    await choDen('Report sent');
    anh.push(await chup('IT146_3_da_gui.png'));
    await tap('[aria-label="Done"]');
    await tap('[aria-label="Close comments"]');
    await choDen(POST_TEXT);
    await tap('[aria-label="Post options"]');
    await choDen('Report post');
    anh.push(await chup('IT146_4_menu_report_post.png'));
    await tap('[aria-label="Report post"]');
    await choDen('Report this post');
    await tap('[aria-label="Other"]');
    await tap('[aria-label="Send report"]');
    await choDen('Report sent');
    const lai = await apiCall('POST', '/api/reports', await apiLogin('ashley@example.com'), { targetType: 'comment', targetId: commentIds[0], reason: 'spam' });
    if (lai.status !== 409) throw new Error(`Báo cáo lại phải bị chặn, nhận ${lai.status}`);
    return 'Báo cáo bình luận (Spam) và bài đăng (Other) thành công, hiện "Report sent"; báo cáo lại cùng nội dung bị chặn (409)';
  });

  await chay('IT147', 'Admin: Dashboard có báo cáo → mở chi tiết → gỡ bình luận (1 vi phạm)', async (anh) => {
    await dangNhap('admin@example.com', 'Admin Team');
    await choDen('Open reports');
    await choDen('Reports to review');
    anh.push(await chup('IT147_1_dashboard.png'));
    await tap('[aria-label^="Review report Spam comment 1"]');
    await choDen('Violations so far');
    await choDen('Ashley Scott · Spam or misleading');
    anh.push(await chup('IT147_2_chi_tiet_bao_cao.png'));
    await tap('[aria-label="Remove comment"]');
    await choDen('Remove this comment?');
    await tap('[aria-label="Spam or misleading"]');
    anh.push(await chup('IT147_3_chon_quy_dinh.png'));
    await tap('[aria-label="Remove"]');
    await choDen('This comment was removed.');
    anh.push(await chup('IT147_4_da_go.png'));
    if ((await binhLuanCon(postId)).includes(spam(1))) throw new Error('Bình luận vẫn còn trên Feed');
    const tb = (await apiCall('GET', '/api/notifications', jasonToken)).body.data.find((n) => n.type === 'content_removed');
    if (!tb || tb.violationCount !== 1) throw new Error('Jason không nhận thông báo vi phạm 1/3');
    return 'Dashboard hiện ô Open reports và mục Reports to review; gỡ bình luận → biến mất khỏi Feed; Jason nhận thông báo vi phạm 1/3';
  });

  await chay('IT148', 'Chủ bình luận thấy thông báo vi phạm (L4)', async (anh) => {
    await dangNhap('jason@example.com', 'Jason Smith');
    await tap('[aria-label^="Notifications"]');
    await choDen('Your comment was removed');
    await choDen('Violation 1 of 3.');
    anh.push(await chup('IT148_1_thong_bao_vi_pham.png'));
    return 'Thông báo "Your comment was removed because it violates our community standards (Spam or misleading)" kèm "Violation 1 of 3."';
  });

  await chay('IT149', 'Lần vi phạm thứ 4 → cảnh báo trước, khoá vĩnh viễn, không đăng nhập được; Revoke → mở lại', async (anh) => {
    // Gỡ thêm 2 bình luận qua API (Jason lên 3/3), Ashley báo cáo bình luận thứ 4
    for (const id of commentIds.slice(1, 3)) await apiCall('POST', `/api/admin/manage/content/comment/${id}/remove`, adminToken, { rule: 'spam' });
    await apiCall('POST', '/api/reports', await apiLogin('ashley@example.com'), { targetType: 'comment', targetId: commentIds[3], reason: 'spam' });
    await dangNhap('admin@example.com', 'Admin Team');
    await moManage('reports');
    await choDen(spam(4));
    anh.push(await chup('IT149_1_tab_manage_reports.png'));
    // Đổi qua lại giữa các loại (trước đây Reports → Users / Artists làm trắng màn hình)
    await tap('[aria-label="Manage users"]');
    await choDen('Has violations');
    await choDen('Jason Smith');
    await tap('[aria-label="Manage reports"]');
    await choDen(spam(4));
    await tap('[aria-label="Manage artists"]');
    await choDen('Not verified');
    await choDen('Mer Watson');
    await tap('[aria-label="Manage reports"]');
    await choDen(spam(4));
    await tap(`[aria-label^="Open report ${spam(4)}"]`);
    await choDen('will be locked permanently');
    anh.push(await chup('IT149_2_canh_bao_khoa.png'));
    await tap('[aria-label="Remove comment & lock account"]');
    await tap('[aria-label="Spam or misleading"]');
    await tap('[aria-label="Remove & lock account"]');
    await choDen('locked permanently');
    // Jason không đăng nhập được
    await moApp();
    await tap('div', { text: 'I already have an account' });
    await typeInto('input', 'jason@example.com');
    await evalJs(`document.querySelectorAll('input')[1].focus()`);
    await send('Input.insertText', { text: '123456' });
    await tap('div', { text: 'Log in' });
    await choDen('permanently locked');
    anh.push(await chup('IT149_3_khong_dang_nhap_duoc.png'));
    // Admin xem tài khoản: khoá vĩnh viễn, không có Unlock; Revoke 1 lần → mở lại
    await dangNhap('admin@example.com', 'Admin Team');
    await moManage('users');
    await tap('[aria-label="Filter Has violations"]');
    await choDen('Jason Smith');
    anh.push(await chup('IT149_4_loc_co_vi_pham.png'));
    await tap('[aria-label="Open user Jason Smith"]');
    await choDen('Permanently locked');
    await khongCo('Unlock account');
    anh.push(await chup('IT149_5_khoa_vinh_vien.png'));
    await tap('[aria-label="Revoke violation 1"]');
    await choDen('Revoke this violation?');
    await tap('[aria-label="Revoke"]');
    await choDen('3 / 3');
    anh.push(await chup('IT149_6_sau_revoke.png'));
    const login = await apiCall('POST', '/api/auth/login', null, { email: 'jason@example.com', password: '123456' });
    if (login.status !== 200) throw new Error(`Sau khi revoke, Jason đăng nhập vẫn lỗi ${login.status}`);
    return 'Màn báo cáo cảnh báo "will be locked permanently", nút đổi thành "Remove comment & lock account"; Jason đăng nhập thấy "permanently locked"; chi tiết tài khoản không có Unlock; Revoke 1 lần → còn 3/3, đăng nhập lại được';
  });

  await chay('IT150', 'Ẩn trang nghệ sĩ và tắt tick xanh (R2); nghệ sĩ thấy băng đỏ trong Studio', async (anh) => {
    await dangNhap('admin@example.com', 'Admin Team');
    await moManage('artists');
    await choDen('Mer Watson');
    anh.push(await chup('IT150_1_tab_manage_artists.png'));
    await tap('[aria-label="Open artist Mer Watson"]');
    await choDen('Verified badge');
    anh.push(await chup('IT150_2_chi_tiet_nghe_si.png'));
    await tap('[aria-label="Verified badge"]');
    await sleep(800);
    await tap('[aria-label="Hide artist page"]');
    await choDen("Hide Mer Watson's page?");
    await tap('[aria-label="Copyright infringement"]');
    await tap('[aria-label="Hide artist page"]', { last: true });
    await choDen('This page is hidden by a moderator');
    anh.push(await chup('IT150_3_da_an_trang.png'));
    const trang = await apiCall('GET', '/api/artists/a_mer');
    const nghe = (await apiCall('GET', '/api/artists')).body.data.find((a) => a.id === 'a_mer');
    await dangNhap('mer@example.com', 'Mer Watson');
    await tap('[aria-label="Profile"]');
    await choDen('Personal information');
    await tap('[aria-label="Artist Studio"]');
    await choDen('Your artist page is hidden by a moderator');
    anh.push(await chup('IT150_4_studio_bi_an.png'));
    // Người nghe: tìm không thấy, mở trang báo không có (kể cả dữ liệu có sẵn trên máy)
    await dangNhap('ashley@example.com', 'Ashley');
    await typeInto('input[placeholder="What you want to listen to"]', 'mer watson');
    await sleep(2500);
    await khongCo('Mer Watson');
    anh.push(await chup('IT150_5_nguoi_nghe_tim_khong_thay.png'));
    await apiCall('POST', '/api/admin/manage/artists/a_mer/unhide', adminToken);
    // Tick xanh đã tắt: người nghe mở trang Mer Watson không thấy tick; Admin bật lại thì có tick
    const coTick = () => evalJs(`!!document.querySelector('[aria-label="Verified artist"]')`);
    await dangNhap('ashley@example.com', 'Ashley');
    await typeInto('input[placeholder="What you want to listen to"]', 'mer watson');
    await choDen('Mer Watson');
    await tap('div', { text: 'Mer Watson', last: true });
    await choDen('Popular');
    await sleep(1200);
    const tickKhiTat = await coTick();
    anh.push(await chup('IT150_6_trang_nghe_si_khong_tick.png'));
    await apiCall('POST', '/api/admin/manage/artists/a_mer/verified', adminToken, { verified: true });
    await tap('[aria-label="Back"]');
    await sleep(800);
    await typeInto('input[placeholder="What you want to listen to"]', 'mer watson', { clear: true });
    await choDen('Mer Watson');
    await tap('div', { text: 'Mer Watson', last: true });
    await choDen('Popular');
    await sleep(1200);
    const tickKhiBat = await coTick();
    if (tickKhiTat || !tickKhiBat) throw new Error(`Tick xanh sai: khi tắt = ${tickKhiTat}, khi bật = ${tickKhiBat}`);
    if (trang.status !== 404) throw new Error(`Trang nghệ sĩ vẫn mở được (${trang.status})`);
    return `Tắt tick xanh và ẩn trang thành công; người nghe mở trang: ${trang.status}, isVerified trong danh sách: ${nghe ? nghe.isVerified : 'không còn trong danh sách'}; Studio của Mer hiện băng đỏ và lý do; người nghe mở trang: không có tick khi tắt, có tick khi bật lại`;
  });

  await chay('IT151', 'Khoá tay / mở khoá tài khoản (U5) và đổi role Listener → Admin (U3)', async (anh) => {
    await dangNhap('admin@example.com', 'Admin Team');
    await moManage('users');
    await typeInto('input[aria-label="Search users"]', 'kevin');
    await choDen('Kevin Brown');
    await tap('[aria-label="Open user Kevin Brown"]');
    await tap('[aria-label="Lock account"]');
    await choDen('Lock Kevin Brown?');
    await tap('[aria-label="Scam or fraud"]');
    await typeInto('textarea[aria-label="Moderator note"]', 'Asking fans for bank transfers');
    anh.push(await chup('IT151_1_khoa_tay.png'));
    await tap('[aria-label="Lock account"]', { last: true });
    await choDen('Unlock account');
    await choDen('Locked by Admin Team');
    anh.push(await chup('IT151_2_dang_khoa_tay.png'));
    const khiKhoa = await apiCall('POST', '/api/auth/login', null, { email: 'kevin@example.com', password: '123456' });
    await tap('[aria-label="Unlock account"]');
    await choDen('Account unlocked.');
    const sauMo = await apiCall('POST', '/api/auth/login', null, { email: 'kevin@example.com', password: '123456' });
    await tap('[aria-label="Back"]');
    await typeInto('input[aria-label="Search users"]', 'ashley', { clear: true });
    await choDen('Ashley Scott');
    await tap('[aria-label="Open user Ashley Scott"]');
    await tap('[aria-label="Change role"]');
    await choDen('Make admin');
    anh.push(await chup('IT151_3_doi_role.png'));
    await tap('[aria-label="Make admin"]');
    await choDen('Role updated.');
    await dangNhap('ashley@example.com', 'MusicStream Admin');
    await choDen('Dashboard');
    anh.push(await chup('IT151_4_ashley_vao_khu_admin.png'));
    if (khiKhoa.status !== 403 || sauMo.status !== 200) throw new Error(`Đăng nhập Kevin: khi khoá ${khiKhoa.status}, sau mở ${sauMo.status}`);
    return 'Khoá tay Kevin (Scam or fraud + ghi chú) → không đăng nhập được (403), có nút Unlock → mở lại đăng nhập được; Ashley được đổi lên Admin → đăng nhập vào thẳng khu Admin';
  });
} catch (err) {
  console.error('Lỗi chạy kiểm thử:', err);
} finally {
  if (loiTrinhDuyet.length) console.log('Lỗi trong trình duyệt:\n' + [...new Set(loiTrinhDuyet)].slice(0, 10).join('\n---\n'));
  writeFileSync(path.join(OUT, 'ket-qua.json'), JSON.stringify({ chayLuc: new Date().toISOString(), results: ketQua, loiTrinhDuyet }, null, 2));
  console.log(`\nApp ↔ API (giai đoạn 5): ${ketQua.filter((k) => k.status === 'Pass').length}/${ketQua.length} Pass`);
  ws?.close();
  chrome.kill();
  apiProc.kill();
  web.close();
  await sleep(500);
  try { rmSync(uploadRoot, { recursive: true, force: true }); } catch {}
  try { rmSync(path.join(OUT, 'chrome-profile'), { recursive: true, force: true }); } catch {}
  process.exit(ketQua.length === 6 && ketQua.every((k) => k.status === 'Pass') ? 0 : 1);
}
