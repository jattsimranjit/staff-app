import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = 'https://effective-palm-tree-69w959x7xqvp3ppg-5000.app.github.dev/api'; // Your Codespaces Flask URL

function App() {
  const [staffId, setStaffId] = useState('');
  const [site, setSite] = useState('Site 1');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [message, setMessage] = useState('');
  const [hours, setHours] = useState(null);

  const clockAction = async (action) => {
    if (!staffId) {
      setMessage('Please enter Staff ID');
      return;
    }
    navigator.geolocation.getCurrentPosition(async (position) => {
      console.log('Position:', position.coords.latitude, position.coords.longitude); // Debug
      try {
        const response = await axios.post(`${API_URL}/clock`, {
          action,
          staff_id: staffId,
          site,
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        setMessage(response.data.message);
      } catch (error) {
        console.error('Clock error:', error); // Debug
        setMessage(error.response?.data?.error || 'Clock in failed');
      }
    }, (err) => setMessage(`Location denied: ${err.message}`));
  };

  const viewHours = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.get(`${API_URL}/hours`, {
        params: { from: fromDate, to: toDate },
      });
      setHours(response.data.hours[staffId] || 0);
      setMessage('Hours fetched');
    } catch (error) {
      console.error('Hours error:', error);
      setMessage(error.response?.data?.error || 'Error');
    }
  };

  return (
    <div className="App">
      <h1>Staff App</h1>
      <div>
        <label>Staff ID: <input value={staffId} onChange={(e) => setStaffId(e.target.value)} /></label><br />
        <label>Site: 
          <select value={site} onChange={(e) => setSite(e.target.value)}>
            <option value="Site 1">Site 1</option>
            <option value="Site 2">Site 2</option>
            <option value="Site 3">Site 3</option>
            <option value="Site 4">Site 4</option>
            <option value="Site 5">Site 5</option>
            <option value="Site 6">Site 6</option>
          </select>
        </label><br />
        <button onClick={() => clockAction('clock_in')}>Clock In</button>
        <button onClick={() => clockAction('clock_out')}>Clock Out</button>
        <p>{message}</p>
      </div>
      <h2>View Hours</h2>
      <form onSubmit={viewHours}>
        <label>From: <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></label>
        <label>To: <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></label>
        <button type="submit">View Hours</button>
      </form>
      {hours !== null && <p>Total Hours: {hours.toFixed(2)} hours</p>}
    </div>
  );
}

export default App;