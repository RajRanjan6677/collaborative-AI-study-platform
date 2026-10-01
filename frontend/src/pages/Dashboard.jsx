import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [rooms, setRooms] = useState([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [inviteToken, setInviteToken] = useState('');

  const fetchRooms = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/rooms/my-rooms', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRooms(data);
      }
    } catch (error) {
      console.error('Failed to fetch rooms', error);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const createRoom = async () => {
    if (!newRoomName) return alert('Room name required');
    try {
      const response = await fetch('http://localhost:5000/api/rooms/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ name: newRoomName, topic: 'General' })
      });
      if (response.ok) {
        setNewRoomName('');
        fetchRooms();
      } else {
        const data = await response.json();
        alert(data.message);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const joinRoom = async () => {
    if (!inviteToken) return alert('Invite token required');
    try {
      const response = await fetch('http://localhost:5000/api/rooms/join', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ inviteToken })
      });
      if (response.ok) {
        setInviteToken('');
        fetchRooms();
      } else {
        const data = await response.json();
        alert(data.message);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="container">
      <div className="dashboard-header">
        <h1>Welcome, {user.username || 'User'}</h1>
        <button onClick={handleLogout} className="btn btn-danger">
          Logout
        </button>
      </div>
      
      <div className="dashboard-grid">
        <div className="panel">
          <h2 className="panel-title">Your Rooms</h2>
          {rooms.length === 0 ? (
            <p className="panel-text">You haven't joined any rooms yet.</p>
          ) : (
            <ul style={{marginBottom: '1.5rem', listStyle: 'none'}}>
              {rooms.map(room => (
                <li key={room.id} style={{padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)'}}>
                  <Link to={`/room/${room.id}`} style={{color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold'}}>
                    {room.name}
                  </Link>
                  <span style={{color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '0.5rem'}}>
                    ({room.room_role})
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex-row">
            <input 
              type="text" 
              placeholder="New room name..." 
              className="form-input"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
            />
            <button onClick={createRoom} className="btn btn-primary" style={{width: 'auto', whiteSpace: 'nowrap'}}>
              Create Room
            </button>
          </div>
        </div>
        
        <div className="panel">
          <h2 className="panel-title">Join a Room</h2>
          <p className="panel-text">Enter an invite token to join an existing study room.</p>
          <div className="flex-row">
            <input 
              type="text" 
              placeholder="Enter invite token..." 
              className="form-input"
              value={inviteToken}
              onChange={(e) => setInviteToken(e.target.value)}
            />
            <button onClick={joinRoom} className="btn btn-primary" style={{width: 'auto'}}>Join</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
