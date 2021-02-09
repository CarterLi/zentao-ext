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

function sendData(str) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(str);
}

chrome.notifications.onClicked.addListener(id => {
  id = parseInt(id);
  if (id) {
    open(`https://zentao.eoitek.net/index.php?m=bug&f=view&id=${id}`);
  } else {
    open(`https://ts.eoitek.net`);
  }
  try { chrome.notifications.clear(id); } catch {}
});

const allowed_actions = {
  edited: '编辑',
  assigned: '指派',
  opened: '创建',
}

const dtFormat = Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
});

function reconnect() {
  if (ws) {
    ws.close();
    ws = null;
  }
  chrome.browserAction.setIcon({ path: 'disabled.png' });

  getData('account', '').then(account => {
    if (!account) return;

    ws = new WebSocket('wss://zentao.eoitek.net:5000/ws/' + encodeURIComponent(account));
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
      const data = JSON.parse(ev.data);
      if (data.bugCount) {
        getData('countlvl', 5).then(value => {
          if (!value) return;
          let count = 0;
          for (let i=1; i<=value; ++i) count += data.bugCount[i] || 0;
          chrome.browserAction.setBadgeText({ text: count + '' });
        });
      }
      if (data.timesheetInfo) {
        getData('notifyts', true).then(value => {
          if (!value) return;
          const info = data.timesheetInfo;
          if (info.total < 8) {
            const today = new Date().setHours(0, 0, 0, 0);
            chrome.notifications.create(`ts_${info.date}`, {
              type: 'basic',
              iconUrl: 'icon.png',
              title: info.date === today ? '已经到填Timesheet的时间了！' : '你可能漏填了Timesheet，请尽快填写！',
              message: `日期 ${dtFormat.format(info.date)}，总共填写时间 ${info.total} 小时`,
              requireInteraction: true,
            });
          }
        });
      }
      if (data.actor) {
        getData('notifylvl', 5).then(value => {
          if (data.severity > value) return;
          chrome.notifications.create(`${data.id}_${Date.now()}`, {
            type: 'basic',
            iconUrl: 'icon.png',
            title: `${data.actor}给你${allowed_actions[data.action]}了 ${data.severity} 级BUG`,
            message: `#${data.id}: ${data.title} @ ${data.product}`,
            requireInteraction: true,
          });
        });
      }
    });
  });
}

function retry() {
  if (!ws || ws.readyState === ws.CLOSED) {
    reconnect();
  } else {
    sendData('bugCount');
  }
}

let timeoutHandle;

function updateTsTimeout() {
  clearTimeout(timeoutHandle);
  getData('tstime', '18:00').then(value => {
    const now = Date.now();
    const target = new Date().setHours(...value.split(':').map(x => +x), 0, 0);
    if (now < target) {
      timeoutHandle = setTimeout(() => sendData('timesheetInfo'), target - now);
    }
  });
}

window.ononline = retry;
setInterval(retry, 60 * 1000)
updateTsTimeout();
reconnect();
