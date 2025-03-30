import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = 'https://effective-palm-tree-69w959x7xqvp3ppg-5000.app.github.dev/api';
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
  const [tab, setTab] = useState('home');
  const [shifts, setShifts] = useState([]);
  const [selectedShift, setSelectedShift] = useState(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [hours, setHours] = useState(null);

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

  const fetchSchedule = async () => {
    try {
      const response = await axios.get(`${API_URL}/schedule`);
      setShifts(response.data.shifts);
    } catch (error) {
      console.error('Schedule error:', error);
      setMessage('Failed to fetch schedule');
    }
  };

  const viewHours = async (e) => {
    e.preventDefault();
    if (!fromDate || !toDate) {
      setMessage('Please select date range');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/hours`, {
        params: { from: fromDate, to: toDate },
      });
      setHours(response.data.hours[staffId] || 0);
      setMessage('Hours fetched successfully');
    } catch (error) {
      console.error('Hours error:', error);
      setMessage(error.response?.data?.error || 'Failed to fetch hours');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn && tab === 'schedule') fetchSchedule();
  }, [isLoggedIn, tab]);

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
            <button type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          {message && <p className="message">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="sidebar">
        <h2>Staff Portal</h2>
        <ul>
          <li className={tab === 'home' ? 'active' : ''} onClick={() => setTab('home')}>
            Home
          </li>
          <li className={tab === 'schedule' ? 'active' : ''} onClick={() => setTab('schedule')}>
            Schedule
          </li>
          <li className={tab === 'hours' ? 'active' : ''} onClick={() => setTab('hours')}>
            Hours
          </li>
          <li onClick={handleLogout}>Logout</li>
        </ul>
      </div>
      <div className="main-content">
        {tab === 'home' && (
          <div className="tab-content">
            <h1>Clock In/Out</h1>
            <p>Staff ID: {staffId}</p>
            <label>
              Site
              <select value={site} onChange={(e) => setSite(e.target.value)}>
                <option value="Site 1">Site 1</option>
                <option value="Site 2">Site 2</option>
                <option value="Site 3">Site 3</option>
                <option value="Site 4">Site 4</option>
                <option value="Site 5">Site 5</option>
                <option value="Site 6">Site 6</option>
              </select>
            </label>
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
            {message && <p className="message">{message}</p>}
          </div>
        )}
        {tab === 'schedule' && (
          <div className="tab-content">
            <h1>Your Schedule</h1>
            <div className="shift-list">
              {shifts.map((shift, index) => (
                <div
                  key={index}
                  className={`shift-row ${shift.site === 'Site 1' ? 'site1' : 'site2'}`}
                  onClick={() => setSelectedShift(shift)}
                >
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
                  <p><strong>Address:</strong> {selectedShift.address}</p>
                  <button onClick={() => setSelectedShift(null)}>Close</button>
                </div>
              </div>
            )}
          </div>
        )}
        {tab === 'hours' && (
          <div className="tab-content">
            <h1>Your Hours</h1>
            <form onSubmit={viewHours}>
              <label>
                From
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </label>
              <label>
                To
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </label>
              <button type="submit" disabled={loading}>
                {loading ? 'Loading...' : 'View Hours'}
              </button>
            </form>
            {hours !== null && (
              <p className="hours-display">Total Hours: {hours.toFixed(2)} hours</p>
            )}
            {message && <p className="message">{message}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;