import fs from 'node:fs/promises';

const debugPort = 9223;
const appOrigin = 'http://127.0.0.1:5187';
const desktopShot = 'C:/Users/tysch/Documents/AI Interview Trainer/artifacts/trainer-desktop.png';
const mobileShot = 'C:/Users/tysch/Documents/AI Interview Trainer/artifacts/trainer-mobile.png';
await fs.mkdir('C:/Users/tysch/Documents/AI Interview Trainer/artifacts', { recursive: true });

async function waitFor(fn, timeout = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const value = await fn();
    if (value) return value;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Timed out waiting for browser state');
}

const targets = await waitFor(async () => {
  try {
    const response = await fetch(`http://127.0.0.1:${debugPort}/json`);
    const data = await response.json();
    return data.find(target => target.type === 'page' && target.url.startsWith(appOrigin)) ? data : null;
  } catch { return null; }
});
const target = targets.find(item => item.type === 'page' && item.url.startsWith(appOrigin));
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });

let id = 0;
const pending = new Map();
const consoleErrors = [];
const externalRequests = [];
const failedRequests = [];
ws.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    message.error ? reject(new Error(message.error.message)) : resolve(message.result);
  }
  if (message.method === 'Runtime.exceptionThrown') consoleErrors.push(message.params.exceptionDetails.text);
  if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') consoleErrors.push(message.params.entry.text);
  if (message.method === 'Network.requestWillBeSent') {
    const url = message.params.request.url;
    if (url.startsWith('http') && !url.startsWith(appOrigin)) externalRequests.push(url);
  }
  if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) {
    failedRequests.push(`${message.params.response.status} ${message.params.response.url}`);
  }
});
function send(method, params = {}) {
  const callId = ++id;
  ws.send(JSON.stringify({ id: callId, method, params }));
  return new Promise((resolve, reject) => pending.set(callId, { resolve, reject }));
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}
async function screenshot(path) {
  await evaluate("window.scrollTo(0,0); document.querySelectorAll('*').forEach(e=>{if(e.scrollTop)e.scrollTop=0})");
  const result = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
  await fs.writeFile(path, Buffer.from(result.data, 'base64'));
}

await Promise.all([send('Page.enable'), send('Runtime.enable'), send('Network.enable'), send('Log.enable')]);
await waitFor(() => evaluate("document.querySelector('#environment-badge')?.textContent.includes('API ready')"));
await evaluate("localStorage.clear()");
await send('Page.reload', { ignoreCache: true });
await waitFor(() => evaluate("document.querySelector('#environment-badge')?.textContent.includes('API ready')"));

const initial = await evaluate(`(() => ({
  title: document.title,
  stages: document.querySelectorAll('.stage-button').length,
  unlocked: [...document.querySelectorAll('.stage-button')].filter(b => !b.disabled).length,
  overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
}))()`);
if (initial.title !== 'Interview Flight Deck' || initial.stages !== 5 || initial.unlocked !== 1 || initial.overflow !== 0) throw new Error(`Initial assertions failed: ${JSON.stringify(initial)}`);

await evaluate("document.querySelector('#start-button').click(); document.querySelector('#confirm-start').click()");
await waitFor(() => evaluate("document.documentElement.dataset.sessionStatus === 'running'"));
await evaluate(`(() => {
  document.querySelectorAll('#requirements input').forEach(input => { input.checked = true; input.dispatchEvent(new Event('change', { bubbles: true })); });
})()`);
await waitFor(() => evaluate("!document.querySelector('#reveal-button').disabled"));
await evaluate("document.querySelector('#reveal-button').click(); document.querySelector('[data-tab=\"api\"]').click(); document.querySelector('#send-request').click()");
await waitFor(() => evaluate("document.querySelector('#response-status').textContent.startsWith('200')"));
const desktop = await evaluate(`(() => ({
  stage: document.querySelector('#stage-title').textContent,
  apiStatus: document.querySelector('#response-status').textContent,
  apiBody: document.querySelector('#response-body').textContent,
  overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
}))()`);
if (desktop.stage !== 'Bug fix' || !desktop.apiBody.includes('"total": 46') || desktop.overflow !== 0) throw new Error(`Desktop flow failed: ${JSON.stringify(desktop)}`);
await screenshot(desktopShot);

await send('Emulation.setDeviceMetricsOverride', { width: 320, height: 760, deviceScaleFactor: 1, mobile: true });
await send('Page.reload', { ignoreCache: true });
await waitFor(() => evaluate("document.querySelector('#environment-badge')?.textContent.includes('API ready')"));
const mobile = await evaluate(`(() => {
  const visibleButtons = [...document.querySelectorAll('button')].filter(b => {
    const s = getComputedStyle(b); const r = b.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0 && r.top < innerHeight;
  }).map(b => ({ text: b.textContent.trim().slice(0,25), width: Math.round(b.getBoundingClientRect().width), height: Math.round(b.getBoundingClientRect().height) }));
  return {
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    title: document.querySelector('#stage-title')?.textContent,
    visibleButtons,
    timerVisible: document.querySelector('#timer').getBoundingClientRect().width > 0
  };
})()`);
const undersized = mobile.visibleButtons.filter(button => button.height < 44 || button.width < 44);
if (mobile.overflow !== 0 || !mobile.timerVisible || undersized.length) throw new Error(`Mobile assertions failed: ${JSON.stringify({ mobile, undersized })}`);
await screenshot(mobileShot);

if (consoleErrors.length) throw new Error(`Browser errors: ${consoleErrors.join(' | ')}; failed requests: ${failedRequests.join(', ')}`);
if (externalRequests.length) throw new Error(`Unexpected external requests: ${externalRequests.join(', ')}`);

console.log(JSON.stringify({ initial, desktop, mobile: { overflow: mobile.overflow, title: mobile.title, buttonCount: mobile.visibleButtons.length }, screenshots: [desktopShot, mobileShot] }, null, 2));
ws.close();
