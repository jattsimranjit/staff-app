import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import './App.css';

const API_URL = 'https://symmetrical-waffle-pj9jwj5q56jj27vpx-5000.app.github.dev/api';

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
  const [staffList, setStaffList] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [newShift, setNewShift] = useState({ staff_id: '', site: '', date: '', start: '', end: '' });
  const [isFetching, setIsFetching] = useState(false);
  const [isScheduleHovered, setIsScheduleHovered] = useState(false);
  const [staff, setStaff] = useState([]);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  const sites = ['Site 1', 'Site 2'];

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

  const fetchSchedule = useCallback(async () => {
    setIsFetching(true);
    try {
      const response = await axios.get(`${API_URL}/schedule`);
      setShifts(response.data.shifts || []);
      if (role === 'manager') setStaffList(response.data.staff || []);
    } catch (error) {
      setMessage('Failed to fetch schedule');
      setShifts([]);
      if (role === 'manager') setStaffList([]);
    } finally {
      setIsFetching(false);
    }
  }, [role]);

  const fetchStaff = useCallback(async () => {
    if (role !== 'manager') return;
    try {
      const response = await axios.get(`${API_URL}/staff`);
      setStaff(response.data);
    } catch (error) {
      setMessage('Failed to fetch staff list');
      setStaff([]);
    }
  }, [role]);

  const handleShiftSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API_URL}/schedule`, newShift);
      setMessage('Shift assigned successfully');
      setNewShift({ staff_id: '', site: '', date: '', start: '', end: '' });
      fetchSchedule();
    } catch (error) {
      setMessage('Failed to assign shift');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    const staffData = Object.fromEntries(formData);
    try {
      await axios.post(`${API_URL}/staff`, staffData);
      setMessage('Staff added successfully');
      setShowAddStaff(false);
      fetchStaff();
      fetchSchedule(); // Refresh staff dropdown
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to add staff');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStaff = async (user_id) => {
    if (!confirm(`Delete ${user_id}?`)) return;
    try {
      await axios.delete(`${API_URL}/staff/${user_id}`);
      setMessage('Staff deleted successfully');
      fetchStaff();
      fetchSchedule(); // Refresh staff dropdown
    } catch (error) {
      setMessage('Failed to delete staff');
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      if (tab === 'schedule' || role === 'manager') fetchSchedule();
      if (tab === 'staff' && role === 'manager') fetchStaff();
    }
  }, [isLoggedIn, tab, role, fetchSchedule, fetchStaff]);

  const events = (shifts || [])
    .filter((shift) => shift.site === selectedSite)
    .map((shift) => ({
      title: `${shift.staff_id} (${shift.start} - ${shift.end})`,
      start: new Date(`${shift.date}T${shift.start}`),
      end: new Date(`${shift.date}T${shift.end}`),
      resource: shift.site,
    }));

  if (!isLoggedIn) {
    return (
      <div className="login-page">
        <div className="login-container">
          <h1>Staff Login</h1>
          <form onSubmit={handleLogin}>
            <label>
              Phone
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g., 1234567890" />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
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

  if (showAddStaff) {
    return (
      <div className="app-container">
        <div className="sidebar">
          <h2>Manager Portal</h2>
          <ul>
            <li onClick={() => setTab('home')}><svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>Home</li>
            <li onClick={() => setTab('schedule')}><svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>Schedule</li>
            <li className="active" onClick={() => setTab('staff')}><svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>Staff</li>
            <li onClick={handleLogout}><svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>Logout</li>
          </ul>
          <div className="sidebar-logo"><img src="/fortis-logo.png" alt="Fortis Security Logo" /></div>
        </div>
        <div className="main-content">
          <div className="tab-content">
            <h1>Add New Staff</h1>
            <form onSubmit={handleAddStaff}>
              <label>User ID <input type="text" name="user_id" required /></label>
              <label>Name <input type="text" name="name" required /></label>
              <label>Email <input type="email" name="email" required /></label>
              <label>Phone <input type="tel" name="phone" required /></label>
              <label>Password <input type="password" name="password" required /></label>
              <label>Address <input type="text" name="address" /></label>
              <label>Date of Birth <input type="date" name="dob" /></label>
              <label>S.I.N <input type="text" name="sin" /></label>
              <label>Security License <input type="text" name="security_license" /></label>
              <label>Emergency Contact Name <input type="text" name="emergency_contact_name" /></label>
              <label>Emergency Contact Number <input type="tel" name="emergency_contact_number" /></label>
              <label>Note <textarea name="note" rows="3"></textarea></label>
              <div className="button-group">
                <button className="blue" type="submit" disabled={loading}>{loading ? 'Adding...' : 'Add Staff'}</button>
                <button className="grayed" type="button" onClick={() => setShowAddStaff(false)}>Cancel</button>
              </div>
            </form>
            {message && <p className="message">{message}</p>}
          </div>
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
          <li className={tab === 'schedule' ? 'active' : ''} onMouseEnter={() => setIsScheduleHovered(true)} onMouseLeave={() => setIsScheduleHovered(false)}>
            <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Schedule
            {isScheduleHovered && (
              <ul className="submenu">
                {sites.map((site) => (
                  <li key={site} onClick={() => { setTab('schedule'); setSelectedSite(site); setIsScheduleHovered(false); }}>
                    {site}
                  </li>
                ))}
              </ul>
            )}
          </li>
          {role === 'manager' && (
            <li className={tab === 'staff' ? 'active' : ''} onClick={() => setTab('staff')}>
              <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              Staff
            </li>
          )}
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
        <div className="sidebar-logo"><img src="/fortis-logo.png" alt="Fortis Security Logo" /></div>
      </div>
      <div className="main-content">
        {tab === 'home' && (
          <div className="tab-content">
            <h1>Welcome {userId}</h1>
            <p className="staff-id">ID: {userId} ({role})</p>
            {role !== 'manager' && (
              <div className="button-group">
                <button className={isClockedIn ? 'grayed' : 'blue'} onClick={() => clockAction('clock_in')} disabled={loading || isClockedIn}>
                  {loading && !isClockedIn ? 'Loading...' : 'Clock In'}
                </button>
                <button className={isClockedIn ? 'blue' : 'grayed'} onClick={() => clockAction('clock_out')} disabled={loading || !isClockedIn}>
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
            {!selectedSite ? (
              <p>Select a site from the sidebar to view its schedule.</p>
            ) : (
              <div className="calendar-section">
                <h2>{selectedSite} Schedule</h2>
                {isFetching ? (
                  <p>Loading schedule...</p>
                ) : (
                  <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
                    initialView="timeGridWeek"
                    events={events}
                    eventDidMount={(info) => {
                      info.el.style.background = info.event.extendedProps.resource === 'Site 1'
                        ? 'linear-gradient(135deg, #3498db, #2980b9)'
                        : 'linear-gradient(135deg, #e74c3c, #c0392b)';
                      info.el.style.border = 'none';
                      info.el.style.borderRadius = '10px';
                      info.el.style.color = 'white';
                      info.el.style.padding = '5px 10px';
                      info.el.style.fontSize = '14px';
                      info.el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                    }}
                    headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' }}
                    contentHeight="auto"
                    scrollTime="08:00:00"
                    slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
                    eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
                  />
                )}
                <form onSubmit={handleShiftSubmit} className="shift-form">
                  <label>
                    Staff
                    <select value={newShift.staff_id} onChange={(e) => setNewShift({ ...newShift, staff_id: e.target.value, site: selectedSite })}>
                      <option value="">Select Staff</option>
                      {staffList.map((s) => (
                        <option key={s.user_id} value={s.user_id}>{s.name} ({s.user_id})</option>
                      ))}
                    </select>
                  </label>
                  <label>Date <input type="date" value={newShift.date} onChange={(e) => setNewShift({ ...newShift, date: e.target.value })} /></label>
                  <label>Start Time <input type="time" value={newShift.start} onChange={(e) => setNewShift({ ...newShift, start: e.target.value })} /></label>
                  <label>End Time <input type="time" value={newShift.end} onChange={(e) => setNewShift({ ...newShift, end: e.target.value })} /></label>
                  <button className="blue" type="submit" disabled={loading}>{loading ? 'Assigning...' : 'Assign Shift'}</button>
                </form>
              </div>
            )}
            {message && <p className="message">{message}</p>}
          </div>
        )}
        {tab === 'schedule' && role !== 'manager' && (
          <div className="tab-content">
            <h1>Your Schedule</h1>
            {isFetching ? (
              <p>Loading schedule...</p>
            ) : (
              <div className="shift-list">
                {shifts.map((shift, index) => (
                  <div key={index} className={`shift-row ${shift.site === 'Site 1' ? 'site1' : 'site2'}`}>
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
            )}
          </div>
        )}
        {tab === 'staff' && role === 'manager' && (
          <div className="tab-content">
            <h1>Staff List</h1>
            <button className="blue" onClick={() => setShowAddStaff(true)}>Add New Staff</button>
            <div className="staff-list">
              {staff.map((s) => (
                <div key={s.user_id} className="staff-row">
                  <span onClick={() => setSelectedStaff(s)} style={{ cursor: 'pointer' }}>{s.name} ({s.user_id})</span>
                  <button className="delete-btn" onClick={() => handleDeleteStaff(s.user_id)}>Delete</button>
                </div>
              ))}
            </div>
            {selectedStaff && (
              <div className="staff-details">
                <h2>{selectedStaff.name} ({selectedStaff.user_id})</h2>
                <p>Email: {selectedStaff.email}</p>
                <p>Phone: {selectedStaff.phone}</p>
                <p>Address: {selectedStaff.address || 'N/A'}</p>
                <p>D.O.B: {selectedStaff.dob || 'N/A'}</p>
                <p>S.I.N: {selectedStaff.sin || 'N/A'}</p>
                <p>Security License: {selectedStaff.security_license || 'N/A'}</p>
                <p>Emergency Contact: {selectedStaff.emergency_contact_name || 'N/A'} ({selectedStaff.emergency_contact_number || 'N/A'})</p>
                <p>Note: {selectedStaff.note || 'N/A'}</p>
                <button className="grayed" onClick={() => setSelectedStaff(null)}>Close</button>
              </div>
            )}
            {message && <p className="message">{message}</p>}
          </div>
        )}
        {tab === 'hours' && role !== 'manager' && (
          <div className="tab-content">
            <h1>Your Hours</h1>
            {/* Hours tab omitted */}
          </div>
        )}
      </div>
      <footer className="app-footer">Fortis Security Staff App</footer>
    </div>
  );
}

export default App;