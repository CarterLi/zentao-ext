'use strict';

/** @type {WebSocket} */
var ws;

function getData(key, defaultVal = null) {
  return new Promise(resolve => {
    chrome.storage.sync.get({
      [key]: defaultVal,
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

function refreshBugCount() {
  if (ws) ws.send('bugCount');
}

chrome.notifications.onClicked.addListener(id => {
  open(`https://zentao.eoitek.net/index.php?m=bug&f=view&id=${parseInt(id)}`);
  chrome.notifications.clear(id);
});

function reconnect() {
  if (ws) {
    ws.close();
    ws = null;
  }
  chrome.browserAction.setIcon({ path: 'disabled.png' });

  getData('account', '').then(account => {
    if (!account) return;

    ws = new WebSocket('ws://zentao.eoitek.net:5000/ws/' + encodeURIComponent(account));
    ws.addEventListener('open', () => {
      chrome.browserAction.setIcon({ path: 'enabled.png' });
    });

    const cleanUp = () => {
      chrome.browserAction.setIcon({ path: 'disabled.png' });
      chrome.browserAction.setBadgeText({ text: '' });
    };
    ws.addEventListener('error', cleanUp);
    ws.addEventListener('close', cleanUp);
    ws.addEventListener('message', ev => {
      const bug = JSON.parse(ev.data);
      getData('countlvl', 5).then(value => {
        if (!value) return;
        let count = 0;
        for (let i=1; i<=value; ++i) count += bug.bugCount[i] || 0;
        chrome.browserAction.setBadgeText({ text: count + '' });
      })
      if (!bug.actor) return;
      getData('notifylvl', 5).then(value => {
        if (bug.severity > value) return;
        chrome.notifications.create(`${bug.id}_${Date.now()}`, {
          type: 'basic',
          iconUrl: 'icon.png',
          title: `${bug.actor}给你${bug.action === 'opened' ? '创建' : '指派'}了 ${bug.severity} 级BUG`,
          message: `#${bug.id}: ${bug.title} @ ${bug.product}`,
          requireInteraction: true,
        });
      });
    });
  });
}

window.ononline = reconnect;
reconnect();
