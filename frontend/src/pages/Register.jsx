import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, role }),
      });
      const data = await response.json();
      if (response.ok) {
        alert('Registration successful! Please login.');
        navigate('/login');
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Registration error', error);
      alert('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-panel">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">📚</div>
          <span className="auth-logo-text">StudyRoom</span>
        </div>

        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Join thousands of students learning together</p>

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-username">Username</label>
            <input
              id="reg-username"
              type="text"
              className="form-input"
              placeholder="Your display name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email address</label>
            <input
              id="reg-email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              type="password"
              className="form-input"
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-role">Account type</label>
            <select
              id="reg-role"
              className="form-input"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="student">🎓 Student — Join study rooms</option>
              <option value="admin">🛠️ Admin — Create &amp; manage rooms</option>
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ marginBottom: '1.25rem', marginTop: '0.25rem' }}
            disabled={loading}
          >
            {loading ? 'Creating account…' : 'Get Started →'}
          </button>

          <div className="auth-link-row">
            <span>Already have an account?</span>
            <Link to="/login">Sign in</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
