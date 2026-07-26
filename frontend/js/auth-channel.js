(function () {
  'use strict';

  const CHANNEL_NAME = 'ticketverse_auth';

  if (!window.BroadcastChannel) {
    window._authChannel = null;
    return;
  }

  const channel = new BroadcastChannel(CHANNEL_NAME);

    channel.onmessage = function (event) {
    const msg = event.data;

    if (!msg || msg.type !== 'LOGOUT') return;

    const myUserId = sessionStorage.getItem('userId');

    if (myUserId && myUserId === String(msg.userId)) {
      sessionStorage.clear();
      window.location.replace('/');
    }
  };

  window._authChannel = channel;
})();
