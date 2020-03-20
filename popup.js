'use strict';

const background = chrome.extension.getBackgroundPage();
/** @type {HTMLFormElement} */
const form = document.getElementById('form');

background.getData('account').then(x => form.account.value = x);
background.getData('notify').then(x => form.notify.checked = !!x);

form.notify.onchange = () => {
  background.setData('notify', form.notify.checked);
  if (!form.notify.checked) {
    chrome.browserAction.setBadgeText({ text: '' });
  }
}

setInterval(() => {
  /** @type {WebSocket} */
  const ws = background.ws;
  form.status.value = ws ? ws.readyState : -1;
}, 50)

form.onsubmit = event => {
  event.preventDefault();
  background.setData('account', form.account.value)
    .then(() => background.reconnect());
}
