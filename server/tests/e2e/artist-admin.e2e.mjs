// Kiểm thử App ↔ API cho giai đoạn 1 + khu Admin riêng (IT73–IT78): đăng ký nghệ sĩ và Admin duyệt / từ chối,
// chạy bản web thật + máy chủ thật với CSDL tạm, điều khiển Chrome và chụp ảnh từng bước.
//
// Chuẩn bị: build bản web trỏ tới cổng API test, ví dụ (ở thư mục gốc):
//   EXPO_PUBLIC_API_URL=http://127.0.0.1:5055 npx expo export --platform web --output-dir dist-e2e
// Chạy:  cd server && WEB_BUILD_DIR=../dist-e2e node tests/e2e/artist-admin.e2e.mjs
// Kết quả: server/tests/output/e2e-gd1/ket-qua.json và ảnh *.png
import { spawn } from 'node:child_process';
import http from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(HERE, '..', '..');
const WEB_DIR = path.resolve(process.env.WEB_BUILD_DIR || path.join(SERVER_DIR, '..', 'dist-e2e'));
const OUT = process.env.E2E_OUT || path.join(SERVER_DIR, 'tests', 'output', 'e2e-gd1');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const API_PORT = Number(process.env.API_PORT || 5055);
const WEB_PORT = 8093, CDP_PORT = 9338;
const API = `http://127.0.0.1:${API_PORT}`;
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ketQua = [];

if (!existsSync(path.join(WEB_DIR, 'index.html'))) {
  console.error(`Chưa có bản web ở ${WEB_DIR}. Xem hướng dẫn ở đầu file.`);
  process.exit(1);
}

// ---------------- phục vụ bản web
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.json': 'application/json', '.ico': 'image/x-icon' };
const web = http.createServer((req, res) => {
  let p = path.join(WEB_DIR, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(p) || statSync(p).isDirectory()) p = path.join(WEB_DIR, 'index.html');
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
}).listen(WEB_PORT, '127.0.0.1');

// ---------------- máy chủ API thật với CSDL tạm (không bao giờ dùng Atlas)
const uploadRoot = path.join(os.tmpdir(), `music-e2e-upload-${Date.now()}`);
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
  `--user-data-dir=${path.join(OUT, 'chrome-profile')}`, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
let ws, seq = 0; const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.value;
const pageText = () => evalJs('document.body.innerText');

// Tìm phần tử đang hiện theo selector (và chữ hiển thị nếu có); last = lấy phần tử cuối (VD nút trong bảng nổi)
const findJs = (sel, text, last) => `(() => {
  let els = [...document.querySelectorAll(${JSON.stringify(sel)})];
  ${text != null ? `els = els.filter(e => (e.innerText||'').trim() === ${JSON.stringify(text)} && ![...e.children].some(c => (c.innerText||'').trim() === ${JSON.stringify(text)}));` : ''}
  els = els.filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  return els[${last ? 'els.length - 1' : '0'}] || null;
})()`;
async function tap(sel, { text = null, last = false } = {}) {
  const ok = await evalJs(`(() => { const e = ${findJs(sel, text, last)}; if (!e) return false;
    (e.closest('[tabindex="0"]') || e).click(); return true; })()`);
  if (!ok) throw new Error(`Không bấm được ${sel} ${text ?? ''}`);
  await sleep(700);
}
// Gõ chữ vào ô nhập (tìm theo selector)
async function typeInto(sel, text) {
  const ok = await evalJs(`(() => { const e = ${findJs(sel, null, false)}; if (!e) return false; e.focus(); return true; })()`);
  if (!ok) throw new Error(`Không thấy ô nhập ${sel}`);
  await send('Input.insertText', { text });
  await sleep(400);
}
async function choDen(text, ms = 15000) {
  for (let t = 0; t < ms; t += 300) { if ((await pageText()).includes(text)) return true; await sleep(300); }
  throw new Error(`Không thấy "${text}" trên màn hình`);
}
async function choDenPhanTu(sel, ms = 15000) {
  for (let t = 0; t < ms; t += 300) { if (await evalJs(`!!document.querySelector(${JSON.stringify(sel)})`)) return true; await sleep(300); }
  throw new Error(`Không thấy phần tử ${sel}`);
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
// Mở lại app từ đầu (trạng thái đăng nhập nằm trong bộ nhớ nên tải lại trang = đăng xuất)
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
async function moProfile() {
  await tap('[aria-label="Profile"]');
  await choDen('Personal information');
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

try {
  await apiReady;
  let url;
  for (let i = 0; i < 40 && !url; i++) {
    try { url = (await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()).find((t) => t.type === 'page')?.webSocketDebuggerUrl; } catch {}
    if (!url) await sleep(250);
  }
  ws = new WebSocket(url);
  await new Promise((r) => (ws.onopen = r));
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.rej(new Error(d.error.message)) : p.res(d.result); } };
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 400, height: 860, deviceScaleFactor: 2, mobile: true });

  await chay('IT73', 'Người nghe gửi yêu cầu làm nghệ sĩ (form 2 bước) → màn chờ duyệt, Profile hiện thẻ "pending"', async (anh) => {
    await dangNhap('ashley@example.com', 'Ashley Scott');
    await moProfile();
    await choDen('Are you an artist?');
    if ((await pageText()).includes('Admin console')) throw new Error('Profile người nghe vẫn có "Admin console"');
    anh.push(await chup('IT73_1_profile_nguoi_nghe.png'));
    await tap('[aria-label="Become an artist"]');
    await choDen('Stage name *');
    await tap('[aria-label="Continue"]');
    await choDen('Please enter your stage name.');
    anh.push(await chup('IT73_2_form_bao_loi.png'));
    await typeInto('input[aria-label="Stage name"]', 'Ashley S.');
    await tap('[aria-label="Pop"]');
    await tap('[aria-label="Ballad"]');
    await typeInto('textarea[aria-label="Short bio"]', 'Singer from Hà Nội writing honest songs about growing up.');
    await typeInto('input[aria-label="Social link 1"]', 'instagram.com/ashley.music');
    anh.push(await chup('IT73_3_form_da_dien.png'));
    await tap('[aria-label="Continue"]');
    await choDen('Review & submit');
    await tap('[role="checkbox"]');
    anh.push(await chup('IT73_4_xem_lai.png'));
    await tap('[aria-label="Submit request"]');
    await choDen('Request sent!');
    anh.push(await chup('IT73_5_dang_cho_duyet.png'));
    await tap('[aria-label="Back to profile"]');
    await choDen('Artist request pending');
    anh.push(await chup('IT73_6_profile_dang_cho.png'));
    const db = await apiCall('GET', '/api/artist-requests/me', await apiLogin('ashley@example.com'));
    if (db.body?.data?.status !== 'pending') throw new Error(`CSDL: status = ${db.body?.data?.status}`);
    return 'Gửi thành công; CSDL có yêu cầu "Ashley S." trạng thái pending; Profile hiện "Artist request pending"';
  });

  await chay('IT74', 'Admin đăng nhập → vào thẳng khu Admin (Dashboard) → mở yêu cầu → duyệt (bật tick xanh)', async (anh) => {
    await dangNhap('admin@example.com', 'Needs your review');
    // Khu Admin riêng: không có tab / màn nghe nhạc
    const text = await pageText();
    for (const t of ['Library', 'Feed', 'Suggestions for you']) if (text.includes(t)) throw new Error(`Khu Admin vẫn hiện "${t}" của app nghe nhạc`);
    anh.push(await chup('IT74_1_dashboard_admin.png'));
    await tap('[aria-label="Review Ashley S."]');
    await choDen('Applicant account');
    await choDen('Stage name available');
    anh.push(await chup('IT74_2_chi_tiet.png'));
    await tap('[aria-label="Approve"]');
    await choDen('This will:');
    await tap('[aria-label="Verified badge"]');
    anh.push(await chup('IT74_3_xac_nhan_duyet.png'));
    await tap('[aria-label="Approve"]', { last: true });
    await choDen('No requests waiting.');
    anh.push(await chup('IT74_4_dashboard_sau_khi_duyet.png'));
    await tap('[aria-label^="Admin tab Requests"]');
    await choDen('No pending requests.');
    anh.push(await chup('IT74_5_tab_requests.png'));
    const ashley = (await apiCall('GET', '/api/auth/profile/u_ashley', await apiLogin('ashley@example.com'))).body.data;
    if (ashley.role !== 'artist') throw new Error(`role = ${ashley.role}`);
    const artist = (await apiCall('GET', `/api/artists/${ashley.artistId}`)).body.data;
    return `Vào thẳng Dashboard, không có phần nghe nhạc; duyệt thành công; Ashley role = ${ashley.role}; trang "${artist.name}" (verified = ${artist.isVerified})`;
  });

  await chay('IT78', 'Tab Account của admin: lịch sử duyệt, đổi tên, đăng xuất về màn chào', async (anh) => {
    await dangNhap('admin@example.com', 'Needs your review');
    await tap('[aria-label^="Admin tab Account"]');
    await choDen('1 approved · 0 rejected');
    anh.push(await chup('IT78_1_tab_account.png'));
    await tap('[aria-label="My review history"]');
    await choDen('Ashley S.');
    anh.push(await chup('IT78_2_lich_su_duyet.png'));
    await tap('[aria-label="Back"]');
    await tap('[aria-label="Edit name & email"]');
    await choDen('Edit name & email');
    await evalJs(`(() => { const e = document.querySelectorAll('input')[0]; e.focus(); e.select(); })()`);
    await send('Input.insertText', { text: 'Admin Team 2' });
    await tap('[aria-label="Save"]');
    await choDen('Your account has been updated.');
    anh.push(await chup('IT78_3_sua_ten.png'));
    await tap('[aria-label="Back"]');
    await tap('[aria-label="Log out"]');
    await choDen('Log out?');
    await tap('[aria-label="Log out"]', { last: true });
    await choDen('I already have an account');
    anh.push(await chup('IT78_4_da_dang_xuat.png'));
    return 'Lịch sử duyệt hiện 1 yêu cầu đã duyệt; đổi tên thành công; Log out quay về màn chào';
  });

  await chay('IT75', 'Người nghe nhận thông báo được duyệt → màn kết quả → Profile có huy hiệu Artist', async (anh) => {
    await dangNhap('ashley@example.com', 'Ashley Scott');
    await choDenPhanTu('[aria-label="Notifications, 1 unread"]');
    await tap('[aria-label^="Notifications"]');
    await choDen("You're now an artist!");
    anh.push(await chup('IT75_1_thong_bao.png'));
    await tap('[aria-label^="Artist request approved"]');
    await choDen('Open Artist Studio');
    anh.push(await chup('IT75_2_ket_qua_duoc_duyet.png'));
    await tap('[aria-label="Open Artist Studio"]');
    await choDen('Upload a song');
    anh.push(await chup('IT75_3_artist_studio.png'));
    await dangNhap('ashley@example.com', 'Ashley Scott');
    await moProfile();
    await choDen('View my artist page');
    anh.push(await chup('IT75_4_profile_nghe_si.png'));
    return 'Thông báo hiện đúng; màn kết quả "You\'re now an artist!"; Profile hiện huy hiệu Artist + Artist Studio';
  });

  await chay('IT77', 'Nghệ sĩ mới được duyệt tìm thấy ở ô tìm kiếm (tab Search và Home), mở được trang nghệ sĩ', async (anh) => {
    await dangNhap('jason@example.com', 'Jason Smith');
    const SEL = 'input[placeholder="What you want to listen to"]';
    await typeInto(SEL, 'ashley s');
    await choDen('Ashley S.');
    anh.push(await chup('IT77_1_tim_tren_home.png'));
    await tap('div', { text: 'Search' });
    await typeInto(SEL, 'ashly');            // gõ sai 1 chữ vẫn tìm ra (tìm kiếm mờ)
    await choDen('Ashley S.');
    anh.push(await chup('IT77_2_tim_tren_tab_search.png'));
    await tap('div', { text: 'Ashley S.' });
    await choDen('Singer from Hà Nội');
    anh.push(await chup('IT77_3_trang_nghe_si.png'));
    return 'Tìm "ashley s" ở Home và "ashly" ở tab Search đều ra nghệ sĩ "Ashley S."; mở trang nghệ sĩ hiện đúng bio';
  });

  await chay('IT76','Admin từ chối kèm lý do → người dùng thấy lý do, sửa và gửi lại với dữ liệu điền sẵn', async (anh) => {
    const jason = await apiLogin('jason@example.com');
    const gui = await apiCall('POST', '/api/artist-requests', jason, {
      stageName: 'Jason Beats', genres: ['Rap'], bio: 'Producer and rapper from Sài Gòn.', socialLinks: [], agree: true,
    });
    if (gui.status !== 201) throw new Error(`Jason gửi yêu cầu: ${gui.status}`);
    await dangNhap('admin@example.com', 'Needs your review');
    await tap('[aria-label^="Admin tab Requests"]');
    await tap('[aria-label="Open request Jason Beats"]');
    await choDen('Applicant account');
    await tap('[aria-label="Reject"]');
    await choDen('Choose a reason');
    await tap('div', { text: 'Incomplete information' });
    await typeInto('textarea[aria-label="Note to the user"]', 'Your bio is too short. Please add a few lines about your style.');
    anh.push(await chup('IT76_1_tu_choi.png'));
    await tap('[aria-label="Reject request"]');
    await choDen('No pending requests.');
    await dangNhap('jason@example.com', 'Jason Smith');
    await moProfile();
    await choDen('Artist request needs changes');
    anh.push(await chup('IT76_2_profile_can_sua.png'));
    await tap('[aria-label="Artist request needs changes"]');
    await choDen('Reason from admin');
    await choDen('Your bio is too short');
    anh.push(await chup('IT76_3_ly_do.png'));
    await tap('[aria-label="Edit & resubmit"]');
    await choDen('Stage name *');
    const daDien = await evalJs(`document.querySelector('input[aria-label="Stage name"]').value`);
    anh.push(await chup('IT76_4_sua_gui_lai.png'));
    if (daDien !== 'Jason Beats') throw new Error(`Form chưa điền sẵn: "${daDien}"`);
    return 'Lý do "Incomplete information" + ghi chú hiện cho người dùng; form gửi lại điền sẵn "Jason Beats"';
  });
} catch (err) {
  console.error('Lỗi chạy kiểm thử:', err);
} finally {
  writeFileSync(path.join(OUT, 'ket-qua.json'), JSON.stringify({ chayLuc: new Date().toISOString(), results: ketQua }, null, 2));
  console.log(`\nApp ↔ API (giai đoạn 1): ${ketQua.filter((k) => k.status === 'Pass').length}/${ketQua.length} Pass`);
  ws?.close();
  chrome.kill();
  apiProc.kill();
  web.close();
  await sleep(500);
  try { rmSync(uploadRoot, { recursive: true, force: true }); } catch {}
  try { rmSync(path.join(OUT, 'chrome-profile'), { recursive: true, force: true }); } catch {}
  process.exit(ketQua.every((k) => k.status === 'Pass') && ketQua.length === 6 ? 0 : 1);
}
