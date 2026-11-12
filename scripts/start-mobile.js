// Chạy Expo cho điện thoại thật (Expo Go) với đúng IP Wi-Fi hiện tại của máy tính.
// Dùng: npm run mobile
// - Bỏ qua card mạng ảo (VMware, VirtualBox, Hyper-V...) và IP cũ còn sót trong terminal.
// - Kiểm tra server API (cổng 5000) trước khi chạy để biết điện thoại có gọi được không.
const os = require('os');
const http = require('http');
const { spawn } = require('child_process');

const VIRTUAL = /vmware|virtualbox|vbox|hyper-v|vethernet|wsl|docker|loopback|bluetooth|tailscale|zerotier|hamachi|vpn/i;

const pickLanIp = () => {
  const candidates = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    if (VIRTUAL.test(name)) continue;
    for (const a of addrs || []) {
      if (a.family !== 'IPv4' || a.internal || a.address.startsWith('169.254.')) continue;
      // Ưu tiên Wi-Fi, sau đó tới Ethernet
      const score = /wi-?fi|wlan|wireless/i.test(name) ? 0 : /ethernet|eth|en\d/i.test(name) ? 1 : 2;
      candidates.push({ name, address: a.address, score });
    }
  }
  candidates.sort((x, y) => x.score - y.score);
  return candidates[0];
};

const check = (url) =>
  new Promise((resolve) => {
    const req = http.get(url, { timeout: 3000 }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });

(async () => {
  const lan = pickLanIp();
  if (!lan) {
    console.error('❌ Không tìm thấy mạng Wi-Fi/LAN. Hãy kết nối Wi-Fi (cùng mạng với điện thoại) rồi chạy lại.');
    process.exit(1);
  }
  console.log(`📶 Mạng: ${lan.name}  →  IP máy tính: ${lan.address}`);

  if (process.env.EXPO_PUBLIC_API_URL) {
    console.log(`🌐 App sẽ gọi API: ${process.env.EXPO_PUBLIC_API_URL} (từ EXPO_PUBLIC_API_URL)`);
  } else {
    const ok = await check(`http://${lan.address}:5000/api/health`);
    console.log(
      ok
        ? `✅ Server API chạy tại http://${lan.address}:5000`
        : '⚠️  Chưa gọi được server ở cổng 5000. Hãy mở terminal khác: cd server && npm run dev\n' +
            '   (Nếu không có server, app vẫn mở được nhưng dùng dữ liệu mẫu và không phát được nhạc.)'
    );
  }
  console.log(`📱 Trên điện thoại (cùng Wi-Fi), mở Safari vào http://${lan.address}:5000/api/health để kiểm tra kết nối.`);
  console.log('   Nếu không vào được: Wi-Fi đang chặn thiết bị kết nối với nhau → dùng Personal Hotspot của điện thoại.\n');

  const env = { ...process.env, REACT_NATIVE_PACKAGER_HOSTNAME: lan.address };
  const child = spawn('npx', ['expo', 'start', '-c', ...process.argv.slice(2)], {
    stdio: 'inherit',
    env,
    shell: true,
  });
  child.on('exit', (code) => process.exit(code ?? 0));
})();
