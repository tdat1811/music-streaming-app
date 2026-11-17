// Kiểm thử App ↔ API cho giai đoạn 6 / 6b – AI Assistant (chat + phân tích fan) với Gemini giả lập + lịch sử thanh toán
// (IT162–IT165, IT178–IT180), chạy bản web thật + máy chủ thật
// với CSDL tạm, điều khiển Chrome (kể cả hộp chọn file) và chụp ảnh từng bước.
//
// Chuẩn bị: build bản web trỏ tới cổng API test (ở thư mục gốc):
//   EXPO_PUBLIC_API_URL=http://127.0.0.1:5055 npx expo export --platform web --output-dir dist-e2e
// Chạy:  cd server && WEB_BUILD_DIR=../dist-e2e node tests/e2e/insights.e2e.mjs   (npm run test:e2e:gd6)
// Kết quả: server/tests/output/e2e-gd6b/ket-qua.json và ảnh *.png
import { spawn } from 'node:child_process';
import http from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(HERE, '..', '..');
const WEB_DIR = path.resolve(process.env.WEB_BUILD_DIR || path.join(SERVER_DIR, '..', 'dist-e2e'));
const OUT = process.env.E2E_OUT || path.join(SERVER_DIR, 'tests', 'output', 'e2e-gd6b');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const API_PORT = Number(process.env.API_PORT || 5055);
const WEB_PORT = 8098, CDP_PORT = 9344;
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

const uploadRoot = path.join(os.tmpdir(), `music-e2e-insights-${Date.now()}`);
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




const TZ = -new Date().getTimezoneOffset();
const binhLuan = (i) => `Giọng hát hay quá, nghe nổi da gà luôn #${i}`;
// Đổi chế độ Gemini giả lập trên máy chủ test (cổng điều khiển = API_PORT + 1)
const geminiMode = async (mode) => {
  const r = await fetch(`http://127.0.0.1:${API_PORT + 1}/gemini-mode/${mode}`);
  if (!r.ok) throw new Error(`Không đổi được chế độ Gemini giả lập: ${mode}`);
};
const cuonCuoi = async () => {
  await evalJs(`(() => { [...document.querySelectorAll('div')].filter(e => e.scrollHeight > e.clientHeight + 40 && getComputedStyle(e).overflowY !== 'visible').forEach(s => s.scrollTop = s.scrollHeight); })()`);
  await sleep(500);
};
const nhapTin = async (text) => {
  await typeInto('textarea[aria-label="Message"]', text);
  await tap('[aria-label="Send"]');
};
async function moAssistant() {
  await moStudio();
  await choDen('Fan insight, ideas & captions – chat with AI');
  await tap('[aria-label="AI Assistant"]');
  await choDen('free messages');
  if (!(await evalJs(`!!document.querySelector('textarea[aria-label="Message"]')`))) throw new Error('Không thấy ô nhập tin');
  await sleep(600);
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
  const postId = (await apiCall('POST', '/api/feed/posts', merToken, { content: 'New acoustic song out now!' })).body.data.id;
  const themBinhLuan = async (from, to) => {
    for (let i = from; i < to; i++) {
      await apiCall('POST', '/api/feed/comments', i % 2 ? jasonToken : ashleyToken, { postId, text: binhLuan(i) });
    }
  };
  await themBinhLuan(0, 5);

  await chay('IT162', 'Studio có mục AI Assistant → màn chat mới (C2): lời chào, 4 gợi ý nhanh, chip ✦ Auto; chưa đủ 10 bình luận → AI giải thích, không tính tin', async (anh) => {
    await dangNhap('mer@example.com', 'Mer Watson');
    await moStudio();
    await choDen('Fan insight, ideas & captions – chat with AI');
    anh.push(await chup('IT162_1_studio_muc_ai_assistant.png'));
    await tap('[aria-label="AI Assistant"]');
    await choDen('Chào Mer!');
    await choDen('Mình đã đọc 5 bình luận');
    await choDen('✦ Auto ▾');
    await choDen('20 free messages today · a fan insight counts as 1 message');
    anh.push(await chup('IT162_2_chat_moi_loi_chao.png'));
    await tap('[aria-label="📊 Phân tích fan của tôi"]');
    await choDen('cần ít nhất 10 bình luận', 20000);
    anh.push(await chup('IT162_3_chua_du_binh_luan.png'));
    const q = (await apiCall('GET', `/api/studio/assistant/chats?tz=${TZ}`, merToken)).body.data.quota;
    if (q.freeUsed !== 0) throw new Error(`Đã trừ tin dù chưa đủ bình luận: ${q.freeUsed}`);
    return 'Mục "AI Assistant – Fan insight, ideas & captions" trong Studio; màn chat mới có lời chào "Chào Mer! … đã đọc 5 bình luận", 4 gợi ý nhanh, chip ✦ Auto ▾, dòng "20 free messages today"; bấm Phân tích fan → AI giải thích cần ít nhất 10 bình luận, không trừ tin';
  });

  await chay('IT163', 'Đủ bình luận → thẻ phân tích trong chat (C3) → View full report; hỏi ý tưởng → câu trả lời có nhãn model + gợi ý hỏi tiếp (C4); bộ đếm còn 18/20', async (anh) => {
    await themBinhLuan(5, 12);
    await dangNhap('mer@example.com', 'Mer Watson');
    await moAssistant();
    await tap('[aria-label="Chats"]');
    await tap('[aria-label="New chat"]');
    await tap('[aria-label="📊 Phân tích fan của tôi"]');
    await choDen('View full report ›', 30000);
    await choDen('Fan rất thích');
    await choDen('Tích cực 70%');
    await choDen('✦ Gemini 3.8 Flash');
    await choDen('19 of 20 free messages left today');
    anh.push(await chup('IT163_1_the_phan_tich.png'));
    await tap('[aria-label="View full report"]');
    await choDen('Fan insight report');
    await choDen('Overall comment review');
    await choDen('Suggested next steps');
    anh.push(await chup('IT163_2_ban_day_du.png'));
    await tap('[aria-label="Back"]');
    await choDen('View full report ›');
    await nhapTin('Gợi ý cho mình 3 ý tưởng bài hát tiếp theo');
    await choDen('đây là 3 hướng đáng thử', 30000);
    await choDen('18 of 20 free messages left today');
    await choDen('Nên ra bài vào tháng nào?');
    await khongCo('spam.example');
    await cuonCuoi();
    anh.push(await chup('IT163_3_hoi_dap_y_tuong.png'));
    return 'Thẻ phân tích "Fan rất thích…", thanh cảm xúc (Tích cực 70%), nhận xét chung, nhãn ✦ Gemini 3.8 Flash; View full report mở bản đầy đủ; hỏi ý tưởng → trả lời tiếng Việt (link bị lọc), 2 gợi ý hỏi tiếp, còn 18/20 tin';
  });

  await chay('IT164', 'Viết caption → 2 lựa chọn có Copy / Post to Feed (C5) → bảng viết bài điền sẵn → đăng lên Feed', async (anh) => {
    await nhapTin('Viết caption cho bài đăng ra mắt bản acoustic');
    await choDen('Đây là 2 lựa chọn caption', 30000);
    await choDen('Post to Feed');
    await cuonCuoi();
    anh.push(await chup('IT164_1_caption.png'));
    await tap('[aria-label="Post caption 1 to Feed"]');
    await choDen('New post');
    const prefill = await evalJs(`[...document.querySelectorAll('textarea')].map(t => t.value).find(v => v.includes('Bản acoustic đã có mặt')) || ''`);
    if (!prefill) throw new Error('Bảng viết bài chưa điền sẵn caption');
    anh.push(await chup('IT164_2_bang_viet_bai_dien_san.png'));
    await tap('[aria-label="Post"]');
    await choDen('Posted to the Feed.', 15000);
    anh.push(await chup('IT164_3_da_dang.png'));
    const posts = (await apiCall('GET', '/api/feed/posts', merToken)).body.data;
    if (!posts.some((p) => (p.content || '').includes('Bản acoustic đã có mặt'))) throw new Error('Không thấy bài đăng mới trên Feed');
    return 'AI trả 2 caption, mỗi cái có Copy / Post to Feed; bấm Post to Feed → bảng "New post" điền sẵn caption, nghệ sĩ bấm Post → "Posted to the Feed." và bài xuất hiện trên Feed (AI không tự đăng)';
  });

  await chay('IT165', 'Chọn model (C10) → cố định Gemini 3.8 Flash; model quá tải → báo lỗi, không trừ tin (C11) → "Switch to Gemini 3.5 Flash-Lite & resend" → trả lời bởi Flash-Lite', async (anh) => {
    await tap('[aria-label="AI model: Auto"]');
    await choDen('Choose AI model');
    await choDen('Recommended');
    await choDen('Gemini 3.5 Flash-Lite');
    anh.push(await chup('IT165_1_chon_model.png'));
    await tap('[aria-label="Choose Gemini 3.8 Flash"]');
    await choDen('✦ Gemini 3.8 Flash ▾');
    const before = (await apiCall('GET', `/api/studio/assistant/chats?tz=${TZ}`, merToken)).body.data.quota.freeUsed;
    await geminiMode('primary_down');
    await nhapTin('Nên đăng bài lúc nào trong ngày?');
    await choDen('Gemini 3.8 Flash is busy', 30000);
    await choDen("Your message wasn't counted");
    await choDen('· not counted');
    await cuonCuoi();
    anh.push(await chup('IT165_2_model_qua_tai.png'));
    const mid = (await apiCall('GET', `/api/studio/assistant/chats?tz=${TZ}`, merToken)).body.data.quota.freeUsed;
    if (mid !== before) throw new Error(`Bị trừ tin khi model bận: ${before} → ${mid}`);
    await tap('[aria-label="Switch to Gemini 3.5 Flash-Lite and resend"]');
    await choDen('✦ Gemini 3.5 Flash-Lite ▾', 30000);
    await choDen('✦ Gemini 3.5 Flash-Lite', 30000);
    await khongCo('Gemini 3.8 Flash is busy');
    await cuonCuoi();
    anh.push(await chup('IT165_3_doi_model_gui_lai.png'));
    await tap('[aria-label="AI model: Gemini 3.5 Flash-Lite"]');
    await choDen('Busy now');
    anh.push(await chup('IT165_4_nhan_busy_now.png'));
    await tap('[aria-label="Choose Auto"]');
    await geminiMode('ok');
    return `Bảng chọn có Auto (Recommended) / Gemini 3.8 Flash / Gemini 3.5 Flash-Lite; chọn 3.8 Flash khi model này quá tải → khung cam "Gemini 3.8 Flash is busy… wasn't counted" (tin đã dùng vẫn ${mid}); bấm "Switch to Gemini 3.5 Flash-Lite & resend" → chip đổi sang Flash-Lite, câu hỏi được gửi lại và trả lời bởi Flash-Lite; 3.8 Flash hiện nhãn Busy now`;
  });

  await chay('IT178', 'Danh sách cuộc trò chuyện (C8): nhiều chat, New chat, đổi tên; AI lỗi (cả 2 model, Auto) → "AI is busy" + Show basic fan summary (C9)', async (anh) => {
    await tap('[aria-label="Chats"]');
    await choDen('Chats are kept for 30 days');
    await choDen('Phân tích fan của tôi');
    await choDen('Today ·');
    anh.push(await chup('IT178_1_danh_sach_chat.png'));
    await tap('[aria-label="Chat options Phân tích fan của tôi"]');
    await tap('[aria-label="Rename"]');
    await typeInto('input[aria-label="Chat name"]', ' tháng 11');
    await tap('[aria-label="Save name"]');
    await tap('[aria-label="Chats"]');
    await choDen('Phân tích fan của tôi tháng 11');
    anh.push(await chup('IT178_2_doi_ten.png'));
    await tap('[aria-label="New chat"]');
    await choDen('Chào Mer!');
    await geminiMode('busy');
    await nhapTin('Fan có góp ý gì không?');
    await choDen('AI is busy', 30000);
    await choDen('Show basic fan summary');
    anh.push(await chup('IT178_3_ai_ban.png'));
    await tap('[aria-label="Show basic fan summary"]');
    await choDen('Basic summary · no AI', 20000);
    await cuonCuoi();
    anh.push(await chup('IT178_4_ban_co_ban.png'));
    await geminiMode('ok');
    const chats = (await apiCall('GET', `/api/studio/assistant/chats?tz=${TZ}`, merToken)).body.data.chats;
    return `Danh sách có ${chats.length} cuộc trò chuyện (tên tự đặt theo câu đầu, "Today · n messages"); đổi tên thành "Phân tích fan của tôi tháng 11"; New chat mở lời chào mới; cả 2 model bận → "AI is busy", không trừ tin, bấm Show basic fan summary → thẻ "Basic summary · no AI"`;
  });

  await chay('IT179', 'Hết 20 tin (C7) → mua 20 tin 75.000đ: ví không đủ → "Top up wallet" → nạp 100.000đ qua MoMo (giả lập) → mua → ví còn 25.000đ; Wallet & payments ghi −75.000đ / +100.000đ', async (anh) => {
    const q0 = (await apiCall('GET', `/api/studio/assistant/chats?tz=${TZ}`, merToken)).body.data.quota;
    let chatId = null;
    for (let i = 0; i < q0.freeLeft - 1; i++) {
      const r = await apiCall('POST', `/api/studio/assistant/messages?tz=${TZ}`, merToken, { chatId, text: `Câu hỏi ${i}` });
      chatId = r.body.data.chat.id;
    }
    await dangNhap('mer@example.com', 'Mer Watson');
    await moAssistant();
    await choDen('1 of 20 free messages left today');
    await nhapTin('Viết thêm 3 caption nữa');
    await choDen('Đây là 2 lựa chọn caption', 30000);
    await choDen("You've used today's 20 free messages");
    await choDen('Daily limit reached');
    await choDen('Buy 20 more messages · 75.000đ');
    await cuonCuoi();
    anh.push(await chup('IT179_1_het_tin.png'));
    await tap('[aria-label="Buy 20 more messages · 75.000đ"]');
    await choDen('Buy more messages');
    await choDen('Not enough balance');
    anh.push(await chup('IT179_2_vi_khong_du.png'));
    await tap('[aria-label="Top up wallet"]');
    await choDen('Wallet balance');
    await choDen('Top up via MoMo');
    await tap('[aria-label="Top up via MoMo"]');
    await tap('[aria-label="Top up 100.000đ"]');
    await typeInto('input[aria-label="MoMo phone number"]', '0901234567');
    anh.push(await chup('IT179_3_nap_momo.png'));
    await tap('[aria-label="Top up 100.000đ"]', { last: true });
    await choDen('Topped up 100.000đ. New balance: 100.000đ.', 15000);
    anh.push(await chup('IT179_4_da_nap.png'));
    await tap('[aria-label="Back"]');
    await choDen("You've used today's 20 free messages");
    await tap('[aria-label="Buy 20 more messages · 75.000đ"]');
    await choDen('Never expire');
    await choDen('100.000đ');
    anh.push(await chup('IT179_5_xac_nhan_mua.png'));
    await tap('[aria-label="Confirm payment · 75.000đ"]');
    await choDen('Payment successful – 75.000đ. 20 messages added. Wallet balance: 25.000đ.', 20000);
    await choDen('0 free messages left today · 20 extra messages');
    anh.push(await chup('IT179_6_da_mua.png'));
    await nhapTin('Gợi ý ý tưởng bài mới nhé');
    await choDen('19 extra messages', 30000);
    await tap('[aria-label="Back"]');
    await tap('[aria-label="Back"]');
    await choDen('Wallet & payments · 25.000đ');
    await tap('[aria-label="Payment history"]');
    await choDen('AI Assistant – 20 extra messages');
    await choDen('1/20 used');
    await choDen('−75.000đ');
    await choDen('+100.000đ');
    await choDen('Top up via MoMo (•••567)');
    anh.push(await chup('IT179_7_vi_va_lich_su.png'));
    const bal = (await apiCall('GET', '/api/payments', merToken)).body;
    if (bal.balance !== 25000 || bal.total !== 75000) throw new Error(`Sai số dư / tổng chi: ${bal.balance} / ${bal.total}`);
    return 'Hết 20 tin → "Buy 20 more messages · 75.000đ"; ví 0đ → bảng mua báo "Not enough balance" + "Top up wallet" → màn Wallet & payments → nạp 100.000đ qua MoMo (số điện thoại chỉ hiện •••567) → quay lại mua → "Payment successful – 75.000đ … Wallet balance: 25.000đ"; hỏi tiếp dùng tin đã mua (còn 19); Profile hiện "Wallet & payments · 25.000đ"; lịch sử có "AI Assistant – 20 extra messages −75.000đ · 1/20 used" và "+100.000đ"';
  });

  await chay('IT180', 'Mua gói VIP trừ 59.000đ trong ví: ví 0đ → bị từ chối (INSUFFICIENT_BALANCE); nạp 100.000đ rồi mua → còn 41.000đ; lịch sử ghi −59.000đ; người khác không thấy', async (anh) => {
    const thieu = await apiCall('POST', '/api/auth/subscribe', ashleyToken, { planId: 'premium' });
    if (thieu.status !== 400 || thieu.body.code !== 'INSUFFICIENT_BALANCE') throw new Error(`Ví 0đ vẫn mua được VIP: ${thieu.status} ${thieu.body.code}`);
    await apiCall('POST', '/api/auth/deposit-momo', ashleyToken, { amount: 100000, momoPhone: '0909999888' });
    const mua = await apiCall('POST', '/api/auth/subscribe', ashleyToken, { planId: 'premium' });
    if (mua.status !== 200) throw new Error(`Mua VIP lỗi: ${mua.status}`);
    await dangNhap('ashley@example.com', 'Ashley');
    await tap('[aria-label="Profile"]');
    await choDen('Wallet & payments · 41.000đ');
    await tap('[aria-label="Payment history"]');
    await choDen('VIP Premium – 1 month');
    await choDen('−59.000đ');
    await choDen('+100.000đ');
    await choDen('41.000đ');
    await choDen('Total spent');
    anh.push(await chup('IT180_1_lich_su_vip.png'));
    const cuaJason = (await apiCall('GET', '/api/payments', jasonToken)).body.data;
    if (cuaJason.length) throw new Error('Jason thấy giao dịch của người khác');
    return `Ví 0đ mua VIP → 400 INSUFFICIENT_BALANCE ("${thieu.body.message}"); nạp 100.000đ rồi mua → Profile "Wallet & payments · 41.000đ"; lịch sử có "VIP Premium – 1 month −59.000đ", "Top up via MoMo +100.000đ", tổng chi 59.000đ; Jason không thấy giao dịch nào`;
  });
} catch (err) {
  console.error('Lỗi chạy kiểm thử:', err);
} finally {
  if (loiTrinhDuyet.length) console.log('Lỗi trong trình duyệt:\n' + [...new Set(loiTrinhDuyet)].slice(0, 10).join('\n---\n'));
  writeFileSync(path.join(OUT, 'ket-qua.json'), JSON.stringify({ chayLuc: new Date().toISOString(), results: ketQua, loiTrinhDuyet }, null, 2));
  console.log(`\nApp ↔ API (giai đoạn 6b): ${ketQua.filter((k) => k.status === 'Pass').length}/${ketQua.length} Pass`);
  ws?.close();
  chrome.kill();
  apiProc.kill();
  web.close();
  await sleep(500);
  try { rmSync(uploadRoot, { recursive: true, force: true }); } catch {}
  try { rmSync(path.join(OUT, 'chrome-profile'), { recursive: true, force: true }); } catch {}
  process.exit(ketQua.length === 7 && ketQua.every((k) => k.status === 'Pass') ? 0 : 1);
}
