import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = 'https://effective-palm-tree-69w959x7xqvp3ppg-5000.app.github.dev/api';

// Configure Axios to include cookies
axios.defaults.withCredentials = true;

function App() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [staffId, setStaffId] = useState('');
  const [site, setSite] = useState('Site 1');
  const [message, setMessage] = useState('');
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/login`, { phone, password });
      setStaffId(response.data.staff_id);
      setIsLoggedIn(true);
      setMessage('Logged in successfully');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}/logout`);
      setIsLoggedIn(false);
      setStaffId('');
      setIsClockedIn(false);
      setMessage('Logged out successfully');
    } catch (error) {
      setMessage('Logout failed');
    }
  };

  const clockAction = async (action) => {
    setLoading(true);
    setMessage('');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        console.log('Position:', position.coords.latitude, position.coords.longitude);
        try {
          const response = await axios.post(`${API_URL}/clock`, {
            action,
            staff_id: staffId,
            site,
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
          setMessage(response.data.message);
          if (action === 'clock_in') setIsClockedIn(true);
          if (action === 'clock_out') setIsClockedIn(false);
        } catch (error) {
          console.error(`${action} error:`, error);
          setMessage(error.response?.data?.error || `${action} failed`);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setMessage(`Location denied: ${err.message}`);
        setLoading(false);
      }
    );
  };

  if (!isLoggedIn) {
    return (
      <div className="App">
        <h1>Staff Login</h1>
        <form onSubmit={handleLogin}>
          <label>
            Phone:{' '}
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g., 1234567890"
            />
          </label>
          <br />
          <label>
            Password:{' '}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <br />
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        {message && <p className="message">{message}</p>}
      </div>
    );
  }

  return (
    <div className="App">
      <h1>Staff Clock</h1>
      <p>Staff ID: {staffId}</p>
      <div className="clock-section">
        <label>
          Site:{' '}
          <select value={site} onChange={(e) => setSite(e.target.value)}>
            <option value="Site 1">Site 1</option>
            <option value="Site 2">Site 2</option>
            <option value="Site 3">Site 3</option>
            <option value="Site 4">Site 4</option>
            <option value="Site 5">Site 5</option>
            <option value="Site 6">Site 6</option>
          </select>
        </label>
        <br />
        <button
          className={isClockedIn ? 'grayed' : 'blue'}
          onClick={() => clockAction('clock_in')}
          disabled={loading || isClockedIn}
        >
          {loading && !isClockedIn ? 'Loading...' : 'Clock In'}
        </button>
        <button
          className={isClockedIn ? 'blue' : 'grayed'}
          onClick={() => clockAction('clock_out')}
          disabled={loading || !isClockedIn}
        >
          {loading && isClockedIn ? 'Loading...' : 'Clock Out'}
        </button>
        <br />
        <button onClick={handleLogout}>Logout</button>
        {message && <p className="message">{message}</p>}
      </div>
    </div>
  );
}

export default App;