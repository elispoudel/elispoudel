(function () {
  'use strict';
  const esc = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const date = (value) => value ? new Date(value).toLocaleString([], { dateStyle:'medium', timeStyle:'short' }) : '';
  const status = (message) => String(message.status || (message.reply ? 'Replied' : 'Unread')).toLowerCase();
  const badge = (count) => document.querySelectorAll('[data-ep-message-badge]').forEach((node) => { node.textContent = count; node.classList.toggle('visible', count > 0); });

  function build(root, role) {
    if (role === 'student') {
      root.innerHTML = `<div class="ep-student-message-layout"><nav class="ep-student-message-nav" aria-label="Message folders"><button type="button" class="active" data-ep-student-tab="chats"><i class="uil uil-comments-alt"></i><span>Chats</span><span class="ep-message-badge" data-ep-message-badge></span></button></nav><section class="ep-student-message-content" data-ep-student-content></section></div>`;
      const content = root.querySelector('[data-ep-student-content]');
      let activeTab = 'chats';
      let studentMessages = [];
      const renderStudentHistory = () => {
        const body = content.querySelector('[data-ep-student-body]');
        if (!body) return;
        const messages = studentMessages.slice().sort((left, right) => new Date(left.timestamp) - new Date(right.timestamp));
        body.innerHTML = messages.length ? messages.map((item) => { const replies = Array.isArray(item.replies) ? item.replies : item.reply ? [{ message: item.reply, timestamp: item.lastUpdated || item.timestamp }] : []; return `<div class="ep-student-chat-message student"><span>${esc(item.message)}</span><small>${date(item.timestamp)}</small></div>${replies.map((reply) => `<div class="ep-student-chat-admin-row"><img class="ep-student-chat-admin-logo" src="../assets/images/favicon/icons.png" alt="Admin"><div class="ep-student-chat-message admin"><span>${esc(reply.message)}</span><small>${date(reply.timestamp)}</small></div></div>`).join('')}`; }).join('') : `<div class="ep-student-chat-welcome"><div class="ep-student-chat-welcome-avatar"><i class="uil uil-shield-check"></i></div><strong>${activeTab === 'all' ? 'All messages' : 'Chats'}</strong><span>${activeTab === 'all' ? 'Complete conversation history.' : 'To Admin. Start a new conversation below.'}</span></div>`;
        body.scrollTop = body.scrollHeight;
      };
      const renderStudentContent = () => {
        const isGroup = activeTab === 'group';
        const heading = isGroup ? 'Group messages' : activeTab === 'all' ? 'All messages' : 'Chats';
        const intro = isGroup ? 'No group conversations yet.' : activeTab === 'all' ? 'Complete conversation history' : 'To Admin';
        content.innerHTML = isGroup ? `<div class="ep-student-chat-empty"><i class="uil uil-users-alt"></i><strong>No group messages</strong><p>Group conversations will appear here.</p></div>` : `<div class="ep-student-chat-body" data-ep-student-body></div><form class="ep-message-compose ep-student-chat-composer" data-ep-student-form><div class="ep-student-chat-input-row"><textarea id="epStudentMessage" maxlength="${MessagingService.maxLength}" required placeholder="Message..." aria-label="Message"></textarea><button class="ep-message-action primary" type="submit" aria-label="Send message"><i class="uil uil-message"></i></button></div><div class="ep-message-status" data-ep-student-status aria-live="polite"></div></form>`;
        renderStudentHistory();
      };
      const updateCounts = async () => {
        try {
          const messages = await MessagingService.list();
          studentMessages = messages;
          const unreadReplies = messages.reduce((count, item) => count + (item.studentRead === false || String(item.status).toLowerCase() === 'replied' ? (Array.isArray(item.replies) ? item.replies.length : item.reply ? 1 : 0) : 0), 0);
          badge(unreadReplies);
          renderStudentHistory();
        } catch (error) {
          renderStudentContent();
        }
      };
      renderStudentContent();
      root.addEventListener('click', (event) => {
        const tab = event.target.closest('[data-ep-student-tab]');
        if (!tab) return;
        activeTab = tab.dataset.epStudentTab;
        root.querySelectorAll('[data-ep-student-tab]').forEach((item) => item.classList.toggle('active', item === tab));
        renderStudentContent();
      });
      root.addEventListener('submit', async (event) => {
        if (!event.target.matches('[data-ep-student-form]')) return;
        event.preventDefault();
        const form = event.target;
        const statusNode = form.querySelector('[data-ep-student-status]');
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        statusNode.textContent = 'Sending...';
        try {
          await MessagingService.send('', form.querySelector('textarea').value);
          form.reset();
          statusNode.textContent = 'Message sent to Admin.';
          await updateCounts();
        } catch (error) {
          statusNode.textContent = error.message;
        } finally {
          submitButton.disabled = false;
        }
      });
      window.addEventListener('messagesUpdated', updateCounts);
      window.addEventListener('storage', (event) => { if (event.key === 'elispoudelMessages') updateCounts(); });
      updateCounts();
      setInterval(updateCounts, 30000);
      return updateCounts;
    }
    root.innerHTML = `<div class="ep-message-shell"><div class="ep-message-toolbar"><div class="ep-message-tabs"><button type="button" class="active" data-ep-tab="inbox"><i class="uil uil-inbox"></i> Inbox <span class="ep-message-badge" data-ep-message-badge></span></button>${role === 'student' ? '<button type="button" data-ep-tab="sent"><i class="uil uil-message"></i> Sent</button>' : '<button type="button" data-ep-tab="unread"><i class="uil uil-envelope-alt"></i> Unread</button>'}</div>${role === 'student' ? '<button type="button" class="ep-message-action primary" data-ep-compose><i class="uil uil-pen"></i> New message</button>' : ''}<label class="ep-message-search"><i class="uil uil-search"></i><input type="search" data-ep-search placeholder="${role === 'admin' ? 'Search Fullname' : 'Search username or subject'}" aria-label="${role === 'admin' ? 'Search Fullname' : 'Search messages'}"></label></div><div class="ep-message-layout"><div class="ep-message-list" data-ep-list><div class="ep-message-empty">Loading messages...</div></div><div class="ep-message-thread" data-ep-thread><div class="ep-message-empty"><div><i class="uil uil-comments-alt" style="font-size:2.5rem"></i><p>Select a conversation to read it.</p></div></div></div></div></div>`;
    const state = { all: [], tab: 'inbox', selected: null };
    const list = root.querySelector('[data-ep-list]');
    const thread = root.querySelector('[data-ep-thread]');
    const getVisible = () => state.all.filter((item) => state.tab === 'unread' ? status(item) === 'unread' : state.tab === 'sent' ? String(item.sender).toLowerCase() === String(MessagingService.currentUser()).toLowerCase() : role === 'admin' ? true : Boolean(item.reply) || String(item.receiver).toLowerCase() === String(MessagingService.currentUser()).toLowerCase());
    const renderList = () => { const query = root.querySelector('[data-ep-search]').value.trim().toLowerCase(); let items = getVisible(); if (role === 'admin') { const grouped = new Map(); items.forEach((item) => { const key = String(item.sender).toLowerCase(); if (!grouped.has(key)) grouped.set(key, item); }); items = Array.from(grouped.values()); } items = items.filter((item) => !query || `${item.sender} ${item.receiver} ${item.subject} ${item.message} ${item.senderName || item.displayName || item.fullName || ''}`.toLowerCase().includes(query)); list.innerHTML = items.length ? items.map((item) => { const identity = role === 'admin' ? `<strong class="ep-message-full-name">${esc(item.senderName || item.displayName || item.fullName || item.sender)}</strong><span class="ep-message-username">Username: @${esc(item.sender)}</span>` : `<strong>${esc(item.subject)}</strong><span>${esc(item.message)}</span><span>${date(item.timestamp)} · ${esc(status(item))}</span>`; return `<button type="button" class="ep-message-row ${status(item)==='unread'?'unread':''} ${state.selected===item.messageId?'active':''}" data-ep-id="${esc(item.messageId)}">${identity}</button>`; }).join('') : '<div class="ep-message-empty"><p>No conversations here.</p></div>'; };
    const renderThread = (item) => { if (!item) { thread.innerHTML = '<div class="ep-message-empty"><p>Select a conversation to read it.</p></div>'; return; } const isStudent = String(item.sender).toLowerCase() === String(MessagingService.currentUser()).toLowerCase(); const conversation = role === 'admin' ? state.all.filter((entry) => String(entry.sender).toLowerCase() === String(item.sender).toLowerCase()).sort((left, right) => new Date(left.timestamp) - new Date(right.timestamp)) : [item]; const latest = conversation[conversation.length - 1] || item; const studentName = item.senderName || item.displayName || item.fullName || item.sender; const messagesHtml = conversation.map((entry) => { const replies = Array.isArray(entry.replies) ? entry.replies : entry.reply ? [{ message: entry.reply, timestamp: entry.lastUpdated || entry.timestamp }] : []; const entryName = entry.senderName || entry.displayName || entry.fullName || studentName; return `<div class="ep-admin-chat-row"><div class="ep-admin-student-icon"><i class="uil uil-user"></i></div><div class="ep-message-bubble student"><strong>${esc(entryName)}</strong><br>${esc(entry.message)}<small>${date(entry.timestamp)}</small></div></div>${replies.map((reply) => `<div class="ep-message-bubble admin">${esc(reply.message)}<small>${date(reply.timestamp)}</small></div>`).join('')}`; }).join(''); thread.innerHTML = `<div class="ep-message-thread-header"><h3>${esc(studentName)}</h3><div class="ep-message-meta">${conversation.length} message${conversation.length === 1 ? '' : 's'} · ${date(latest.timestamp)}</div></div><div class="ep-message-thread-body">${messagesHtml}</div>${role === 'admin' || isStudent ? `<form class="ep-message-compose ep-student-chat-composer" data-ep-form>${role === 'admin' ? `<div class="ep-student-chat-input-row"><textarea maxlength="${MessagingService.maxLength}" required placeholder="Write a reply..." aria-label="Reply"></textarea><button class="ep-message-action primary" type="submit" aria-label="Send reply"><i class="uil uil-message"></i></button></div>` : ''}<div class="ep-message-status" data-ep-status></div></form>` : ''}`; };
    const load = async () => { try { state.all = await MessagingService.list(); const unread = state.all.filter((item) => status(item)==='unread' && (role==='admin' || String(item.receiver).toLowerCase()===String(MessagingService.currentUser()).toLowerCase())).length; badge(unread); renderList(); if (state.selected) renderThread(state.all.find((item) => item.messageId === state.selected)); } catch (error) { list.innerHTML = `<div class="ep-message-empty"><p>${esc(error.message)}</p></div>`; } };
    const markConversationRead = async (item) => { const conversation = role === 'admin' ? state.all.filter((entry) => String(entry.sender).toLowerCase() === String(item.sender).toLowerCase()) : [item]; await Promise.all(conversation.filter((entry) => status(entry) === 'unread').map((entry) => MessagingService.markRead(entry.messageId))); conversation.forEach((entry) => { if (status(entry) === 'unread') entry.status = 'Read'; }); };
    root.addEventListener('click', async (event) => { const tab = event.target.closest('[data-ep-tab]'); if (tab) { state.tab=tab.dataset.epTab; root.querySelectorAll('[data-ep-tab]').forEach((node)=>node.classList.toggle('active',node===tab)); renderList(); return; } const row = event.target.closest('[data-ep-id]'); if (row) { state.selected=row.dataset.epId; const item=state.all.find((entry)=>entry.messageId===state.selected); renderThread(item); renderList(); if (item && status(item)==='unread') { await markConversationRead(item); badge(state.all.filter((entry)=>status(entry)==='unread').length); renderList(); } } if (event.target.closest('[data-ep-compose]')) { state.selected=null; renderThread({ messageId:'', subject:'New message', sender:MessagingService.currentUser(), message:'', timestamp:'' }); } });
    root.addEventListener('input', (event) => { if (event.target.matches('[data-ep-search]')) renderList(); });
    root.addEventListener('submit', async (event) => { if (!event.target.matches('[data-ep-form]')) return; event.preventDefault(); const form=event.target; const statusNode=form.querySelector('[data-ep-status]'); try { if (!state.selected) { const subject=form.querySelector('input')?.value; const message=form.querySelector('textarea')?.value; await MessagingService.send(subject, message); } else { await MessagingService.reply(state.selected, form.querySelector('textarea').value); } statusNode.textContent='Sending...'; await load(); } catch (error) { statusNode.textContent=error.message; } });
    window.addEventListener('messagesUpdated', load);
    window.addEventListener('storage', (event) => { if (event.key === 'elispoudelMessages') load(); });
    load(); setInterval(load, 30000); return load;
  }

  window.initMessaging = function (root, role) { if (root && window.MessagingService) return build(root, role); return null; };
})();