import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = 'https://effective-palm-tree-69w959x7xqvp3ppg-5000.app.github.dev/api';
axios.defaults.withCredentials = true;

function App() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('');
  const [message, setMessage] = useState('');
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('home');
  const [shifts, setShifts] = useState([]);
  const [selectedShift, setSelectedShift] = useState(null);
  const [newShift, setNewShift] = useState({ staff_id: '', site: '', date: '', start: '', end: '' });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/login`, { phone, password });
      setUserId(response.data.user_id);
      setRole(response.data.role);
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
      setUserId('');
      setRole('');
      setTab('home');
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
        try {
          const response = await axios.post(`${API_URL}/clock`, {
            action,
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
          setMessage(response.data.message);
          if (action === 'clock_in') setIsClockedIn(true);
          if (action === 'clock_out') setIsClockedIn(false);
        } catch (error) {
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

  const fetchSchedule = async () => {
    try {
      const response = await axios.get(`${API_URL}/schedule`);
      setShifts(response.data.shifts);
    } catch (error) {
      setMessage('Failed to fetch schedule');
    }
  };

  const handleShiftSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API_URL}/schedule`, newShift);
      setMessage('Shift assigned successfully');
      setNewShift({ staff_id: '', site: '', date: '', start: '', end: '' });
      fetchSchedule(); // Refresh schedule
    } catch (error) {
      setMessage('Failed to assign shift');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn && (tab === 'schedule' || role === 'manager')) fetchSchedule();
  }, [isLoggedIn, tab, role]);

  if (!isLoggedIn) {
    return (
      <div className="login-page">
        <div className="login-container">
          <h1>Staff Login</h1>
          <form onSubmit={handleLogin}>
            <label>
              Phone
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g., 1234567890"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <div className="login-button-container">
              <button className="blue" type="submit" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </div>
          </form>
          {message && <p className="message">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="sidebar">
        <h2>{role === 'manager' ? 'Manager Portal' : 'Staff Portal'}</h2>
        <ul>
          <li className={tab === 'home' ? 'active' : ''} onClick={() => setTab('home')}>
            <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            Home
          </li>
          <li className={tab === 'schedule' ? 'active' : ''} onClick={() => setTab('schedule')}>
            <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Schedule
          </li>
          {role !== 'manager' && (
            <li className={tab === 'hours' ? 'active' : ''} onClick={() => setTab('hours')}>
              <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              Hours
            </li>
          )}
          <li onClick={handleLogout}>
            <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Logout
          </li>
        </ul>
        <div className="sidebar-logo">
          <img src="/fortis-logo.png" alt="Fortis Security Logo" />
        </div>
      </div>
      <div className="main-content">
        {tab === 'home' && (
          <div className="tab-content">
            <h1>Welcome {userId}</h1>
            <p className="staff-id">ID: {userId} ({role})</p>
            {role !== 'manager' && (
              <div className="button-group">
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
              </div>
            )}
            {message && <p className="message">{message}</p>}
          </div>
        )}
        {tab === 'schedule' && role === 'manager' && (
          <div className="tab-content">
            <h1>Manage Schedule</h1>
            <form onSubmit={handleShiftSubmit} className="hours-form">
              <div className="date-inputs">
                <label>
                  Staff ID
                  <select
                    value={newShift.staff_id}
                    onChange={(e) => setNewShift({ ...newShift, staff_id: e.target.value })}
                  >
                    <option value="">Select Staff</option>
                    <option value="S001">S001</option>
                    <option value="S002">S002</option>
                    <option value="S003">S003</option>
                  </select>
                </label>
                <label>
                  Site
                  <select
                    value={newShift.site}
                    onChange={(e) => setNewShift({ ...newShift, site: e.target.value })}
                  >
                    <option value="">Select Site</option>
                    <option value="Site 1">Site 1</option>
                    <option value="Site 2">Site 2</option>
                  </select>
                </label>
              </div>
              <div className="date-inputs">
                <label>
                  Date
                  <input
                    type="date"
                    value={newShift.date}
                    onChange={(e) => setNewShift({ ...newShift, date: e.target.value })}
                  />
                </label>
                <label>
                  Start Time
                  <input
                    type="time"
                    value={newShift.start}
                    onChange={(e) => setNewShift({ ...newShift, start: e.target.value })}
                  />
                </label>
                <label>
                  End Time
                  <input
                    type="time"
                    value={newShift.end}
                    onChange={(e) => setNewShift({ ...newShift, end: e.target.value })}
                  />
                </label>
              </div>
              <div className="hours-button-container">
                <button className="blue" type="submit" disabled={loading}>
                  {loading ? 'Assigning...' : 'Assign Shift'}
                </button>
              </div>
            </form>
            <div className="shift-list">
              {shifts.map((shift, index) => (
                <div key={index} className={`shift-row ${shift.site === 'Site 1' ? 'site1' : 'site2'}`}>
                  <svg className="shift-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <span>{shift.staff_id}</span>
                  <span>{shift.site}</span>
                  <span>{shift.date}</span>
                  <span>{`${shift.start} - ${shift.end}`}</span>
                </div>
              ))}
            </div>
            {message && <p className="message">{message}</p>}
          </div>
        )}
        {tab === 'schedule' && role !== 'manager' && (
          <div className="tab-content">
            <h1>Your Schedule</h1>
            <div className="shift-list">
              {shifts.map((shift, index) => (
                <div
                  key={index}
                  className={`shift-row ${shift.site === 'Site 1' ? 'site1' : 'site2'}`}
                  onClick={() => setSelectedShift(shift)}
                >
                  <svg className="shift-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <span>{shift.site}</span>
                  <span>{shift.date}</span>
                  <span>{`${shift.start} - ${shift.end}`}</span>
                </div>
              ))}
            </div>
            {selectedShift && (
              <div className="modal">
                <div className="modal-content">
                  <h2>Shift Details</h2>
                  <p><strong>Site:</strong> {selectedShift.site}</p>
                  <p><strong>Date:</strong> {selectedShift.date}</p>
                  <p><strong>Time:</strong> {selectedShift.start} - {selectedShift.end}</p>
                  <button onClick={() => setSelectedShift(null)}>Close</button>
                </div>
              </div>
            )}
          </div>
        )}
        {tab === 'hours' && role !== 'manager' && (
          <div className="tab-content">
            <h1>Your Hours</h1>
            {/* Hours tab unchanged for brevity */}
          </div>
        )}
      </div>
      <footer className="app-footer">Fortis Security Staff App</footer>
    </div>
  );
}

export default App;