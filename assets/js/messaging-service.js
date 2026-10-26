/* Messaging client for the Messages Google Sheet endpoint. */
(function () {
  'use strict';

  const MAX_LENGTH = 4000;
  const actions = {
    list: 'messages',
    send: 'sendMessage',
    reply: 'replyMessage',
    read: 'markMessageRead',
    delete: 'deleteMessage'
  };
  const LOCAL_MESSAGES_KEY = 'elispoudelMessages';

  function currentUser() {
    return sessionStorage.getItem('loggedInUser') || localStorage.getItem('loggedInUser') || '';
  }

  function validateText(value, label) {
    const text = String(value || '').trim();
    if (!text) throw new Error(`${label} cannot be empty.`);
    if (text.length > MAX_LENGTH) throw new Error(`${label} is too long.`);
    return text;
  }

  function readLocalMessages() {
    try {
      const messages = JSON.parse(localStorage.getItem(LOCAL_MESSAGES_KEY) || '[]');
      return Array.isArray(messages) ? messages.map((item) => ({
        ...item,
        replies: Array.isArray(item.replies)
          ? item.replies
          : item.reply
            ? [{ message: item.reply, timestamp: item.lastUpdated || item.timestamp }]
            : []
      })) : [];
    } catch (error) {
      return [];
    }
  }

  function writeLocalMessages(messages) {
    localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify(messages));
    window.dispatchEvent(new CustomEvent('messagesUpdated', { detail: messages }));
  }

  function localList() {
    const username = currentUser().toLowerCase();
    const role = sessionStorage.getItem('userRole') || localStorage.getItem('userRole') || 'student';
    return readLocalMessages()
      .filter((item) => role === 'admin' || String(item.sender).toLowerCase() === username || String(item.receiver).toLowerCase() === username)
      .sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp));
  }

  function service() {
    const drive = window.DriveService || (typeof DriveService !== 'undefined' ? DriveService : null);
    const config = typeof DRIVE_CONFIG !== 'undefined' ? DRIVE_CONFIG : window.DRIVE_CONFIG;
    if (!drive || !config?.webAppUrl) {
      throw new Error('Messaging service is not configured.');
    }
    return { drive, config };
  }

  async function request(action, payload) {
    const { drive, config } = service();
    const url = `${config.webAppUrl}?action=${encodeURIComponent(action)}`;
    return drive.gasPostJson(url, { ...payload, requester: currentUser() });
  }

  window.MessagingService = {
    maxLength: MAX_LENGTH,
    currentUser,
    async list() {
      try {
        const { drive, config } = service();
        const role = sessionStorage.getItem('userRole') || localStorage.getItem('userRole') || 'student';
        const result = await drive.gasGetJson(`${config.webAppUrl}?action=${actions.list}&username=${encodeURIComponent(currentUser())}&role=${encodeURIComponent(role)}`);
        return Array.isArray(result) ? result : result.messages || [];
      } catch (error) {
        console.warn('Using local message history:', error.message);
      }
      return localList();
    },
    async send(subject, message) {
      const normalizedSubject = String(subject || '').trim() || 'Message to Admin';
      try {
        return await request(actions.send, {
          sender: validateText(currentUser(), 'Username'),
          receiver: 'admin',
          subject: normalizedSubject.slice(0, 120),
          message: validateText(message, 'Message')
        });
      } catch (error) {
        console.warn('Using local message send fallback:', error.message);
      }
      const now = new Date().toISOString();
      const item = {
        messageId: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sender: validateText(currentUser(), 'Username'),
        senderName: sessionStorage.getItem('studentDisplayName') || localStorage.getItem('studentDisplayName') || currentUser(),
        receiver: 'admin',
        subject: normalizedSubject.slice(0, 120),
        message: validateText(message, 'Message'),
        reply: '',
        replies: [],
        studentRead: true,
        status: 'Unread',
        timestamp: now,
        lastUpdated: now
      };
      writeLocalMessages([...readLocalMessages(), item]);
      return { success: true, message: item };
    },
    async reply(messageId, message) {
      const id = validateText(messageId, 'Message ID');
      try {
        return await request(actions.reply, { messageId: id, reply: validateText(message, 'Reply') });
      } catch (error) {
        console.warn('Using local reply fallback:', error.message);
      }
      const messages = readLocalMessages();
      const item = messages.find((entry) => entry.messageId === id);
      if (!item) throw new Error('Message not found.');
      const replyMessage = validateText(message, 'Reply');
      const replyItem = { message: replyMessage, timestamp: new Date().toISOString() };
      item.replies = Array.isArray(item.replies) ? item.replies : [];
      item.replies.push(replyItem);
      item.reply = replyMessage;
      item.studentRead = false;
      item.status = 'Replied';
      item.lastUpdated = replyItem.timestamp;
      writeLocalMessages(messages);
      return { success: true };
    },
    async markRead(messageId) {
      const id = validateText(messageId, 'Message ID');
      try {
        return await request(actions.read, { messageId: id });
      } catch (error) {
        console.warn('Using local read fallback:', error.message);
      }
      const messages = readLocalMessages();
      const item = messages.find((entry) => entry.messageId === id);
      if (!item) throw new Error('Message not found.');
      item.status = 'Read';
      item.lastUpdated = new Date().toISOString();
      writeLocalMessages(messages);
      return { success: true };
    },
    async markStudentRead() {
      try {
        const messages = await this.list();
        await Promise.all(messages.filter((item) => String(item.status).toLowerCase() === 'replied').map((item) => this.markRead(item.messageId)));
      } catch (error) {
        console.warn('Using local student read fallback:', error.message);
      }
      const username = currentUser().toLowerCase();
      const messages = readLocalMessages();
      let changed = false;
      messages.forEach((item) => {
        if (String(item.sender).toLowerCase() === username && item.studentRead === false) {
          item.studentRead = true;
          changed = true;
        }
      });
      if (changed) writeLocalMessages(messages);
      return { success: true };
    },
    async remove(messageId) {
      const id = validateText(messageId, 'Message ID');
      writeLocalMessages(readLocalMessages().filter((entry) => entry.messageId !== id));
      return { success: true };
    }
  };
})();