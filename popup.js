'use strict';

const background = chrome.extension.getBackgroundPage();
/** @type {HTMLFormElement} */
const form = document.getElementById('form');

form.account.ondblclick = () => form.account.readOnly = false;
background.getData('account', '').then(x => {
  if (x) {
    form.account.value = x;
    form.account.readOnly = true;
  } else {
    form.account.focus();
  }
});
background.getData('countlvl', 5).then(x => form.countlvl.value = x);
background.getData('notifylvl', 5).then(x => form.notifylvl.value = x);
background.getData('notifyts', true).then(x => form.notifyts.checked = x);
background.getData('tstime', '18:00').then(x => {
  form.tstime.value = x;
  background.updateTsTimeout();
});

form.countlvl.onchange = () => {
  const value = +form.countlvl.value;
  background.setData('countlvl', value);
  if (!value) {
    chrome.browserAction.setBadgeText({ text: '' });
  } else {
    background.sendData('bugCount');
  }
}

form.notifylvl.onchange = () => {
  const value = +form.notifylvl.value;
  background.setData('notifylvl', value);
}

form.notifyts.onchange = () => {
  const value = form.notifyts.checked;
  background.setData('notifyts', value);
}

form.tstime.onchange = () => {
  const value = form.tstime.value;
  background.setData('tstime', value);
}

setInterval(() => {
  /** @type {WebSocket} */
  const ws = background.ws;
  form.status.value = ws ? ws.readyState : -1;
}, 50);

background.sendData('bugCount');

form.onsubmit = event => {
  event.preventDefault();
  form.account.readOnly = true;
  background.setData('account', form.account.value)
    .then(() => background.reconnect());
}
