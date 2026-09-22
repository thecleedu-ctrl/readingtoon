/* 더클영어 리딩툰 — 오프라인 지원
 *
 * 교재 한 벌이 10MB 를 넘는다. 설치할 때 전부 받아 두면 학생이 몇 분을 기다려야
 * 하므로, 껍데기(목록·아이콘)만 미리 받고 교재는 «한 번 열어 본 것»만 담아 둔다.
 * 그다음부터는 지하철에서도 열린다.
 */
const SHELL = 'rt-shell-v1';
const BOOKS = 'rt-books-v2';   // v2 — 컷마다 원어민 음성이 들어가 교재 파일이 바뀌었다. 옛 저장분을 버린다.

const SHELL_FILES = [
  './',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL)
      .then((c) => c.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())        // 한 파일이 없어도 설치는 막지 않는다
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== SHELL && k !== BOOKS).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // 목록 화면 — 새 교재가 늘어나므로 網을 먼저 보고, 끊겨 있으면 담아 둔 것을 준다
  const isShell = url.pathname === '/' || url.pathname.endsWith('/index.html') && url.pathname === '/index.html';
  if (isShell) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put('./', copy));
          return res;
        })
        .catch(() => caches.match('./').then((r) => r || caches.match(req)))
    );
    return;
  }

  // 교재 — 한 번 받은 것은 그대로 쓴다 (내용이 바뀌지 않는 파일이다)
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(BOOKS).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
