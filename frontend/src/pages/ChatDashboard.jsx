import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import KanbanBoard from '../components/KanbanBoard';
import ResourcesList from '../components/ResourcesList';
import PeerReview from '../components/PeerReview';
import Flashcards from '../components/Flashcards';

const ChatDashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');
  const [socket, setSocket] = useState(null);

  const [activeTab, setActiveTab] = useState('rooms');
  const [roomTab, setRoomTab] = useState('chat');

  const [rooms, setRooms] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const [activeRoomId, setActiveRoomId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const [showNotifications, setShowNotifications] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteTargetContact, setInviteTargetContact] = useState(null);
  const [inviteSelectedRoom, setInviteSelectedRoom] = useState('');
  const [inviteSelectedRole, setInviteSelectedRole] = useState('member');

  const [showMembersModal, setShowMembersModal] = useState(false);
  const [roomMembers, setRoomMembers] = useState([]);

  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const typingTimeoutRef = useRef(null);

  const fetchData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [roomsRes, contactsRes, notifsRes] = await Promise.all([
        fetch('http://localhost:5000/api/rooms/my-rooms', { headers }),
        fetch('http://localhost:5000/api/contacts', { headers }),
        fetch('http://localhost:5000/api/notifications', { headers })
      ]);
      if (roomsRes.ok) setRooms(await roomsRes.json());
      if (contactsRes.ok) setContacts(await contactsRes.json());
      if (notifsRes.ok) setNotifications(await notifsRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('register_user', { userId: user.id, username: user.username });
    });
    newSocket.on('new_notification', (notif) => {
      setNotifications(prev => [notif, ...prev]);
      fetchData();
    });
    newSocket.on('receive_message', (data) => {
      if (data.roomId === activeRoomId) {
        setMessages(prev => [...prev, data]);
      }
    });
    newSocket.on('room_list_updated', () => fetchData());
    newSocket.on('contact_list_updated', () => fetchData());
    newSocket.on('room_users', (usersArray) => setOnlineUsers(usersArray));
    newSocket.on('user_typing', ({ username, isTyping }) => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        if (isTyping) next.add(username);
        else next.delete(username);
        return next;
      });
    });

    return () => newSocket.disconnect();
  }, [user.id, user.username, token, activeRoomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (activeRoomId && socket) {
      setRoomTab('chat');
      socket.emit('join_room', { roomId: activeRoomId, username: user.username });
      fetch(`http://localhost:5000/api/rooms/${activeRoomId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setMessages(data))
        .catch(console.error);
    }
  }, [activeRoomId, socket, token, user.username]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    try {
      const res = await fetch(`http://localhost:5000/api/contacts/search?q=${searchQuery}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setSearchResults(await res.json());
    } catch (err) { console.error(err); }
  };

  const addContact    = async (contactId) => {
    try {
      const res = await fetch('http://localhost:5000/api/contacts/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ contactId })
      });
      if (res.ok) { alert('Contact request sent'); fetchData(); }
      else alert((await res.json()).message);
    } catch (err) { console.error(err); }
  };

  const acceptContact = async (contactId) => {
    try {
      const res = await fetch('http://localhost:5000/api/contacts/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ contactId })
      });
      if (res.ok) fetchData();
    } catch (err) { console.error(err); }
  };

  const removeContact = async (contactId) => {
    try {
      const res = await fetch('http://localhost:5000/api/contacts/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ contactId })
      });
      if (res.ok) fetchData();
    } catch (err) { console.error(err); }
  };

  const createRoom = async () => {
    if (!newRoomName) return;
    try {
      const res = await fetch('http://localhost:5000/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newRoomName, topic: 'General' })
      });
      if (res.ok) { setNewRoomName(''); fetchData(); }
    } catch (err) { console.error(err); }
  };

  const inviteToRoom = async () => {
    if (!inviteSelectedRoom || !inviteTargetContact) return;
    try {
      const res = await fetch('http://localhost:5000/api/rooms/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ roomId: inviteSelectedRoom, contactId: inviteTargetContact.id, roomRole: inviteSelectedRole })
      });
      if (res.ok) { alert('User invited'); setShowInviteModal(false); }
      else alert((await res.json()).message);
    } catch (err) { console.error(err); }
  };

  const openInviteModal = (contact) => {
    setInviteTargetContact(contact);
    setInviteSelectedRoom(rooms.length > 0 ? rooms[0].id : '');
    setInviteSelectedRole('member');
    setShowInviteModal(true);
  };

  const leaveRoom = async () => {
    if (!activeRoomId) return;
    try {
      const res = await fetch('http://localhost:5000/api/rooms/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ roomId: activeRoomId })
      });
      if (res.ok) { setActiveRoomId(null); fetchData(); }
    } catch (err) { console.error(err); }
  };

  const openMembersModal = async () => {
    if (!activeRoomId) return;
    try {
      const res = await fetch(`http://localhost:5000/api/rooms/${activeRoomId}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) { setRoomMembers(await res.json()); setShowMembersModal(true); }
    } catch (err) { console.error(err); }
  };

  const changeMemberRole = async (memberId, newRole) => {
    try {
      const res = await fetch(`http://localhost:5000/api/rooms/${activeRoomId}/members/${memberId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) { openMembersModal(); fetchData(); }
      else alert((await res.json()).message);
    } catch (err) { console.error(err); }
  };

  const deleteRoom = async () => {
    if (!activeRoomId) return;
    if (!window.confirm('Are you sure you want to delete this room? This is permanent.')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/rooms/${activeRoomId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) { setActiveRoomId(null); fetchData(); }
      else alert((await res.json()).message);
    } catch (err) { console.error(err); }
  };

  const markNotificationsRead = async () => {
    try {
      await fetch('http://localhost:5000/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({})
      });
      setShowNotifications(false);
      fetchData();
    } catch (e) { console.error(e); }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeRoomId || !socket) return;
    socket.emit('send_message', { roomId: activeRoomId, message: newMessage, userId: user.username });
    setMessages(prev => [...prev, { roomId: activeRoomId, message: newMessage, userId: user.username }]);
    const sentMessage = newMessage;
    setNewMessage('');

    if (sentMessage.startsWith('@AI ') || sentMessage.startsWith('/ask ')) {
      const prompt = sentMessage.replace(/^(@AI|\/ask)\s*/i, '');
      setTypingUsers(prev => { const s = new Set(prev); s.add('AI Assistant'); return s; });
      try {
        const res = await fetch(`http://localhost:5000/api/rooms/${activeRoomId}/ai/ask`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ prompt })
        });
        const data = await res.json();
        if (res.ok) {
          socket.emit('send_message', { roomId: activeRoomId, message: data.answer, userId: 'AI Assistant' });
          setMessages(prev => [...prev, { roomId: activeRoomId, message: data.answer, userId: 'AI Assistant' }]);
        } else {
          setMessages(prev => [...prev, { roomId: activeRoomId, message: `⚠️ ${data.message || 'Error communicating with AI.'}`, userId: 'System' }]);
        }
      } catch (err) {
        setMessages(prev => [...prev, { roomId: activeRoomId, message: `⚠️ Network error communicating with AI.`, userId: 'System' }]);
      } finally {
        setTypingUsers(prev => { const s = new Set(prev); s.delete('AI Assistant'); return s; });
      }
    }
    socket.emit('typing', { roomId: activeRoomId, username: user.username, isTyping: false });
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (socket && activeRoomId) {
      socket.emit('typing', { roomId: activeRoomId, username: user.username, isTyping: true });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { roomId: activeRoomId, username: user.username, isTyping: false });
      }, 2000);
    }
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMessageIndex(index);
      setTimeout(() => setCopiedMessageIndex(null), 2000);
    });
  };

  const unreadNotifs = notifications.filter(n => !n.is_read).length;
  const activeRoom   = rooms.find(r => r.id === activeRoomId);
  const initials     = (name) => name ? name.charAt(0).toUpperCase() : '?';

  return (
    <div className="chat-dashboard">

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside className={`chat-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="chat-sidebar-header">
          <div className="sidebar-user-info">
            <div className="sidebar-avatar">{initials(user.username)}</div>
            <span className="sidebar-username">{user.username}</span>
          </div>
          <div className="sidebar-header-actions">
            <button
              id="notif-btn"
              className="icon-btn"
              title="Notifications"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              🔔
              {unreadNotifs > 0 && <span className="notif-badge">{unreadNotifs}</span>}
            </button>
            <button
              id="logout-btn"
              className="icon-btn"
              title="Log out"
              onClick={() => { localStorage.clear(); navigate('/login'); }}
            >
              ↩
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="chat-sidebar-tabs">
          {['rooms', 'contacts', 'search'].map(tab => (
            <button
              key={tab}
              className={`chat-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'rooms' ? '🏠 Rooms' : tab === 'contacts' ? '👥 Contacts' : '🔍 Search'}
            </button>
          ))}
        </div>

        {/* ── Rooms Tab ────────────────────────────────────── */}
        {activeTab === 'rooms' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div className="sidebar-create-room">
              <div className="flex-row">
                <input
                  type="text"
                  className="form-input"
                  placeholder="New room name…"
                  value={newRoomName}
                  onChange={e => setNewRoomName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createRoom()}
                  style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
                />
                <button
                  className="btn btn-primary"
                  style={{ width: 'auto', padding: '0 0.9rem', fontSize: '1.2rem' }}
                  onClick={createRoom}
                  title="Create room"
                >
                  +
                </button>
              </div>
            </div>

            <ul className="chat-list">
              {rooms.length === 0 && (
                <li style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                  No rooms yet. Create one above!
                </li>
              )}
              {rooms.map(r => (
                <li
                  key={r.id}
                  className={`chat-list-item ${activeRoomId === r.id ? 'active' : ''}`}
                  onClick={() => { setActiveRoomId(r.id); setIsSidebarOpen(false); }}
                >
                  <span className="room-name">{r.name}</span>
                  <span className={`room-role-badge ${r.room_role === 'admin' ? 'role-admin' : 'role-member'}`}>
                    {r.room_role}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Contacts Tab ──────────────────────────────────── */}
        {activeTab === 'contacts' && (
          <ul className="chat-list">
            {contacts.length === 0 && (
              <li style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                No contacts yet. Search for users!
              </li>
            )}
            {contacts.map(c => {
              const otherUserId = c.user_id === user.id ? c.contact_id : c.user_id;
              const isPendingMe = c.status === 'pending' && c.contact_id === user.id;
              return (
                <li key={c.id || otherUserId} className="contact-item">
                  <div className="sidebar-user-info">
                    <div className="contact-avatar">{initials(c.username)}</div>
                    <div className="contact-info">
                      <strong>{c.username}</strong>
                      <div className={`contact-status ${c.status === 'accepted' ? 'status-accepted' : 'status-pending'}`}>
                        {c.status}
                      </div>
                    </div>
                  </div>
                  <div className="contact-actions">
                    {isPendingMe && (
                      <button className="btn btn-primary btn-xs" onClick={() => acceptContact(c.user_id)}>
                        Accept
                      </button>
                    )}
                    {c.status === 'accepted' && (
                      <>
                        <button className="btn btn-primary btn-xs" onClick={() => openInviteModal({ id: otherUserId, username: c.username })}>
                          Invite
                        </button>
                        <button className="btn btn-danger btn-xs" onClick={() => removeContact(otherUserId)}>
                          ✕
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* ── Search Tab ────────────────────────────────────── */}
        {activeTab === 'search' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <form onSubmit={handleSearch} style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border)' }}>
              <div className="flex-row">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search users…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
                />
                <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '0 0.85rem' }}>
                  🔍
                </button>
              </div>
            </form>
            <ul className="chat-list">
              {searchResults.map(su => (
                <li key={su.id} className="contact-item">
                  <div className="sidebar-user-info">
                    <div className="contact-avatar">{initials(su.username)}</div>
                    <strong style={{ fontSize: '0.88rem' }}>{su.username}</strong>
                  </div>
                  <button className="btn btn-primary btn-xs" onClick={() => addContact(su.id)}>
                    + Add
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      {/* ── Main Area ────────────────────────────────────────────── */}
      <main className="chat-main">
        {activeRoomId ? (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              <div className="chat-header-left">
                <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>☰</button>
                <div>
                  <div className="chat-room-name"># {activeRoom?.name}</div>
                  <div className="chat-online-status">
                    {onlineUsers.length} online
                    {onlineUsers.length > 0 && ` · ${onlineUsers.slice(0, 3).join(', ')}${onlineUsers.length > 3 ? '…' : ''}`}
                  </div>
                </div>
              </div>

              <div className="chat-header-actions">
                {['chat', 'tasks', 'resources', 'reviews', 'flashcards'].map(tab => (
                  <button
                    key={tab}
                    className={`room-tab-btn ${roomTab === tab ? 'active' : ''}`}
                    onClick={() => setRoomTab(tab)}
                  >
                    {tab === 'chat' ? '💬 Chat'
                      : tab === 'tasks' ? '📋 Tasks'
                      : tab === 'resources' ? '📎 Resources'
                      : tab === 'reviews' ? '🔍 Reviews'
                      : '✨ Flashcards'}
                  </button>
                ))}

                <button className="room-tab-btn" style={{ color: 'var(--text-secondary)' }} onClick={openMembersModal}>
                  👥 Members
                </button>

                {(activeRoom?.room_role === 'admin' || user.role === 'superadmin') && (
                  <button className="room-tab-btn danger" onClick={deleteRoom}>
                    🗑 Delete
                  </button>
                )}

                <button className="room-tab-btn danger" onClick={leaveRoom}>
                  Leave
                </button>
              </div>
            </div>

            {/* Chat Tab */}
            {roomTab === 'chat' && (
              <>
                <div className="chat-messages">
                  {messages.map((m, i) => {
                    if (m.system) {
                      return <div key={i} className="system-message">{m.message}</div>;
                    }
                    const isMe = m.userId === user.username;
                    const isAI = m.userId === 'AI Assistant';
                    return (
                      <div key={i} className={`message-wrapper ${isMe ? 'mine' : 'theirs'}`}>
                        {!isMe && (
                          <div className={`message-sender ${isAI ? 'ai-sender' : ''}`}>
                            {isAI ? '✨ AI Assistant' : m.userId}
                          </div>
                        )}
                        <div className={`message-bubble ${isMe ? 'message-mine' : isAI ? 'message-ai' : 'message-theirs'}`}>
                          {m.message}
                        </div>
                        <button className="message-copy-btn" onClick={() => copyToClipboard(m.message, i)}>
                          {copiedMessageIndex === i ? '✓ Copied!' : 'Copy'}
                        </button>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {typingUsers.size > 0 && (
                  <div className="typing-indicator">
                    <span style={{ letterSpacing: '0.15em', color: 'var(--accent-light)' }}>●●●</span>
                    {Array.from(typingUsers).join(', ')} {typingUsers.size > 1 ? 'are' : 'is'} typing…
                  </div>
                )}

                <form className="chat-input-area" onSubmit={sendMessage}>
                  <input
                    id="chat-input"
                    type="text"
                    className="chat-input"
                    placeholder="Type a message… (use @AI or /ask for AI assistance)"
                    value={newMessage}
                    onChange={handleTyping}
                    autoComplete="off"
                  />
                  <button type="submit" className="send-btn">Send ↑</button>
                </form>
              </>
            )}

            {roomTab === 'tasks'     && <KanbanBoard   roomId={activeRoomId} token={token} />}
            {roomTab === 'resources' && <ResourcesList roomId={activeRoomId} token={token} />}
            {roomTab === 'reviews'   && <PeerReview    roomId={activeRoomId} token={token} />}
            {roomTab === 'flashcards'&& <Flashcards    roomId={activeRoomId} token={token} />}
          </>
        ) : (
          /* Empty state */
          <div className="empty-state">
            <button className="mobile-menu-btn" style={{ marginBottom: '0.5rem' }} onClick={() => setIsSidebarOpen(true)}>
              ☰ Open Sidebar
            </button>
            <div className="empty-state-icon">💬</div>
            <p>Select a room from the sidebar to start collaborating with your peers.</p>
          </div>
        )}
      </main>

      {/* ── Notifications Dropdown ────────────────────────────────── */}
      {showNotifications && (
        <div className="dropdown-menu">
          <div className="dropdown-header">
            <strong>Notifications</strong>
            <button
              onClick={markNotificationsRead}
              style={{ background: 'none', border: 'none', color: 'var(--accent-light)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit', fontWeight: 600 }}
            >
              Mark all read
            </button>
          </div>
          {notifications.length === 0 && (
            <div className="dropdown-item" style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
              No notifications
            </div>
          )}
          {notifications.map(n => (
            <div key={n.id} className={`dropdown-item ${!n.is_read ? 'notif-unread' : ''}`}>
              <div style={{ fontSize: '0.875rem' }}>{n.message}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                {new Date(n.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Invite Modal ──────────────────────────────────────────── */}
      {showInviteModal && inviteTargetContact && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Invite {inviteTargetContact.username} to a Room</h3>
            <div className="form-group">
              <label className="form-label">Select Room</label>
              <select className="form-input" value={inviteSelectedRoom} onChange={e => setInviteSelectedRoom(e.target.value)}>
                <option value="">— Choose a room —</option>
                {rooms.filter(r => r.room_role === 'admin' || r.room_role === 'superadmin').map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Role in Room</label>
              <select className="form-input" value={inviteSelectedRole} onChange={e => setInviteSelectedRole(e.target.value)}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button className="btn btn-primary" onClick={inviteToRoom}>Send Invite</button>
              <button className="btn" onClick={() => setShowInviteModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Room Members Modal ────────────────────────────────────── */}
      {showMembersModal && (
        <div className="modal-overlay" onClick={() => setShowMembersModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Room Members</h3>
            <ul className="member-list">
              {roomMembers.map(m => (
                <li key={m.id} className="member-item">
                  <div className="sidebar-user-info">
                    <div className="contact-avatar">{initials(m.username)}</div>
                    <div>
                      <span className="member-name">{m.username}</span>
                      {m.id === user.id && <span className="you-tag">(you)</span>}
                    </div>
                  </div>
                  {(activeRoom?.room_role === 'admin') && m.id !== user.id ? (
                    <select
                      className="role-select"
                      value={m.room_role}
                      onChange={e => changeMemberRole(m.id, e.target.value)}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span className={`role-tag ${m.room_role === 'admin' ? 'role-tag-admin' : 'role-tag-member'}`}>
                      {m.room_role}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn" style={{ width: 'auto', padding: '0.45rem 1rem' }} onClick={() => setShowMembersModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatDashboard;
