import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';

const Room = () => {
  const { roomId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const socketRef = useRef(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Connect to socket
    socketRef.current = io('http://localhost:5000');

    // Join room
    socketRef.current.emit('join_room', roomId);

    // Listen for incoming messages
    socketRef.current.on('receive_message', (data) => {
      setMessages((prev) => [...prev, data]);
    });

    // Listen for presence
    socketRef.current.on('user_joined', (data) => {
      setOnlineUsers((prev) => [...prev, data.userId]);
      setMessages((prev) => [...prev, { system: true, message: `User joined the room` }]);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageData = {
      roomId,
      message: newMessage,
      userId: user.username || 'User',
      timestamp: new Date().toISOString()
    };

    // Broadcast message
    socketRef.current.emit('send_message', messageData);
    
    // Add to local state
    setMessages((prev) => [...prev, messageData]);
    setNewMessage('');
  };

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '1rem' }}>
      <div className="dashboard-header" style={{ marginBottom: '1rem' }}>
        <h2>Room {roomId}</h2>
        <Link to="/dashboard" className="btn btn-danger">Leave Room</Link>
      </div>

      <div style={{ display: 'flex', flex: 1, gap: '1rem', overflow: 'hidden' }}>
        {/* Chat Section */}
        <div className="panel" style={{ flex: 3, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', paddingRight: '1rem' }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{ marginBottom: '1rem', textAlign: msg.system ? 'center' : (msg.userId === user.username ? 'right' : 'left') }}>
                {msg.system ? (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{msg.message}</span>
                ) : (
                  <div style={{ 
                    display: 'inline-block', 
                    padding: '0.75rem 1rem', 
                    borderRadius: '8px', 
                    backgroundColor: msg.userId === user.username ? 'var(--primary)' : 'var(--bg-dark)',
                    border: msg.userId !== user.username ? '1px solid var(--border-color)' : 'none'
                  }}>
                    <strong style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.25rem', color: msg.userId === user.username ? '#e0e7ff' : 'var(--text-muted)' }}>
                      {msg.userId}
                    </strong>
                    {msg.message}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          <form onSubmit={sendMessage} className="flex-row">
            <input 
              type="text" 
              placeholder="Type a message... (Use @AI to ask the assistant)" 
              className="form-input"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" style={{width: 'auto'}}>Send</button>
          </form>
        </div>

        {/* Presence Section */}
        <div className="panel" style={{ flex: 1 }}>
          <h3 className="panel-title">Online ({onlineUsers.length + 1})</h3>
          <ul style={{ listStyle: 'none' }}>
            <li style={{ padding: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)' }}></div>
              {user.username} (You)
            </li>
            {onlineUsers.map((u, i) => (
              <li key={i} style={{ padding: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)' }}></div>
                Anonymous User
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Room;
