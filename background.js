'use strict';

/** @type {WebSocket} */
var ws;

function getData(key) {
  return new Promise(resolve => {
    chrome.storage.sync.get({
      [key]: null,
    }, value => resolve(value[key]));
  })
}

function setData(key, value) {
  return new Promise(resolve => {
    chrome.storage.sync.set({
      [key]: value,
    }, resolve);
  });
}

function reconnect() {
  if (ws) ws.close();

  getData('account').then(account => {
    if (!account) return;

    ws = new WebSocket('ws://zentao.eoitek.net:5000/ws/' + encodeURIComponent(account));
    Object.entries({
      // open: '打开',
      error: '错误',
      close: '关闭'
    }).forEach(([value, text]) => {
      ws.addEventListener(value, () => {
        getData('notify').then(x => {
          if (!x) return;
          chrome.browserAction.setBadgeBackgroundColor({ color: [0xFF, 0, 0, 0xFF] });
          chrome.browserAction.setBadgeText({ text });
        })
      });
    });
    ws.addEventListener('message', ev => {
      const bug = JSON.parse(ev.data);
      getData('notify').then(x => {
        if (!x) return;
        chrome.browserAction.setBadgeBackgroundColor({ color: [0x42, 0x85, 0xF4, 0xFF] });
        chrome.browserAction.setBadgeText({ text: bug.bugCount + '' });
      })
      if (!bug.actor) return;
      const no = new Notification(`${bug.actor}给你${bug.action === 'opened' ? '创建' : '指派'}了 ${bug.severity} 级BUG`, {
        body: `#${bug.id}: ${bug.title}\n@ ${bug.product}`,
        icon: 'icon.png',
        lang: 'zh',
        requireInteraction: true,
      });
      no.addEventListener('click', ev => {
        open(`https://zentao.eoitek.net/index.php?m=bug&f=view&id=${bug.id}`);
        no.close();
      })
    });
  });
}

reconnect();
