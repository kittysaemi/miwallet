const PARTIALS = [
  ['screen-root', './screens/setup.html', true],
  ['screen-root', './screens/home.html', true],
  ['screen-root', './screens/add.html', true],
  ['screen-root', './screens/search.html', true],
  ['screen-root', './screens/stat.html', true],
  ['screen-root', './screens/manage.html', true],
  ['component-root', './components/bottom-nav.html', true],
  ['component-root', './components/modals.html', true],
];

async function loadPartial(targetId, url, append = false) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  const target = document.getElementById(targetId);
  const html = new TextDecoder('utf-8').decode(await response.arrayBuffer());
  if (append) {
    target.insertAdjacentHTML('beforeend', html);
  } else {
    target.innerHTML = html;
  }
}

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const separator = url.includes('?') ? '&' : '?';
    script.src = `${url}${separator}v=${Date.now()}`;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${url}`));
    document.body.appendChild(script);
  });
}

async function boot() {
  try {
    for (const [targetId, url, append] of PARTIALS) {
      await loadPartial(targetId, url, append);
    }
    await loadScript('./assets/js/app.js');
  } catch (error) {
    document.getElementById('app').innerHTML =
      '<div class="empty-state"><p>화면을 불러오지 못했습니다. 로컬 서버에서 다시 실행해 주세요.</p></div>';
    console.error(error);
  }
}

boot();
