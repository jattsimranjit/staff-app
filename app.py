from flask import Flask, request, jsonify, session
from flask_cors import CORS
import requests
import datetime
import math
import os
from dotenv import load_dotenv
from functools import wraps

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "https://effective-palm-tree-69w959x7xqvp3ppg-3000.app.github.dev"}}, supports_credentials=True)
app.secret_key = os.getenv('SECRET_KEY', 'supersecretkey')

CLICKUP_TOKEN = os.getenv('CLICKUP_TOKEN', 'pk_132090641_NJ3Z7FO8C32Q1JK0Z61IJ5KXMF80DFQ0')
CLICKUP_LIST_ID = '901309228827'
HEADERS = {'Authorization': CLICKUP_TOKEN, 'Content-Type': 'application/json'}

SITES = {
    "Site 1": (49.186123, -122.852601, 100),
    "Site 2": (49.154694, -122.843826, 100),
    "Site 3": (37.7949, -122.4394, 100),
    "Site 4": (37.8049, -122.4494, 100),
    "Site 5": (37.8149, -122.4594, 100),
    "Site 6": (37.8249, -122.4694, 100),
}

USERS = {
    "1234567890": "password123",
    "0987654321": "staff456"
}

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'staff_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

def is_within_geofence(lat, lon, site):
    try:
        site_lat, site_lon, radius = SITES[site]
        distance = math.sqrt((float(lat) - site_lat)**2 + (float(lon) - site_lon)**2) * 111320
        print(f"Lat: {lat}, Lon: {lon}, Site: {site_lat}, {site_lon}, Distance: {distance}, Radius: {radius}")
        return distance <= radius
    except KeyError:
        print(f"Invalid site: {site}")
        return False

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json(silent=True)
    if not data or 'phone' not in data or 'password' not in data:
        return jsonify({'error': 'Phone and password required'}), 400
    
    phone = data['phone']
    password = data['password']
    
    if phone in USERS and USERS[phone] == password:
        session['staff_id'] = phone
        return jsonify({'message': 'Logged in successfully', 'staff_id': phone})
    return jsonify({'error': 'Invalid phone or password'}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('staff_id', None)
    return jsonify({'message': 'Logged out successfully'})

@app.route('/api/clock', methods=['POST'])
@login_required
def clock():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Invalid JSON payload'}), 400
    print(f"Received POST: {data}")

    try:
        action = data['action']
        staff_id = session['staff_id']
        site = data['site']
        lat = float(data['lat'])
        lon = float(data['lon'])
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()

        if action not in ['clock_in', 'clock_out', 'report']:
            return jsonify({'error': 'Invalid action'}), 400

        if not is_within_geofence(lat, lon, site):
            return jsonify({'error': 'You must be on-site to clock in/report'}), 403

        action_map = {'clock_in': 'In', 'clock_out': 'Out', 'report': 'Report'}
        action_verbs = {'clock_in': 'Clocked in', 'clock_out': 'Clocked out', 'report': 'Reported'}
        task_data = {'name': f'{staff_id} - {action_map[action]} - {now}', 'description': f'Site: {site}'}

        response = requests.post(
            f'https://api.clickup.com/api/v2/list/{CLICKUP_LIST_ID}/task',
            headers=HEADERS,
            json=task_data
        )
        print(f"ClickUp POST response: {response.status_code} - {response.text}")

        if response.status_code in [200, 201]:
            msg = f'{action_verbs[action]} successfully!'
            print(f"Sending message: {msg}")
            return jsonify({'message': msg})
        return jsonify({'error': f'ClickUp error: {response.status_code} - {response.text}'}), 500

    except KeyError as e:
        print(f"KeyError: {e}")
        return jsonify({'error': f'Missing field: {e}'}), 400
    except ValueError as e:
        print(f"ValueError: {e}")
        return jsonify({'error': 'Invalid location data'}), 400

@app.route('/api/hours', methods=['GET'])
@login_required
def hours():
    from_date = request.args.get('from')
    to_date = request.args.get('to')

    if not from_date or not to_date:
        return jsonify({'error': 'Please select a date range'}), 400

    try:
        start = datetime.datetime.strptime(from_date, '%Y-%m-%d').replace(tzinfo=datetime.timezone.utc)
        end = datetime.datetime.strptime(to_date, '%Y-%m-%d').replace(hour=23, minute=59, second=59, tzinfo=datetime.timezone.utc)
    except ValueError:
        return jsonify({'error': 'Invalid date format (use YYYY-MM-DD)'}), 400

    try:
        response = requests.get(f'https://api.clickup.com/api/v2/list/{CLICKUP_LIST_ID}/task', headers=HEADERS)
        response.raise_for_status()
        tasks = response.json()['tasks']
    except requests.RequestException as e:
        print(f"ClickUp GET error: {e}")
        return jsonify({'error': 'Failed to fetch tasks from ClickUp'}), 500

    events = []
    for task in tasks:
        name = task.get('name', '').strip()
        print(f"Processing task: {name}")
        if ' - In - ' in name or ' - Clock_in - ' in name:
            staff_id, _, time_str = name.split(' - ', 2)
            action = 'In'
        elif ' - Out - ' in name or ' - Clock_out - ' in name:
            staff_id, _, time_str = name.split(' - ', 2)
            action = 'Out'
        else:
            print(f"Skipping - no In/Out: {name}")
            continue
        try:
            time = datetime.datetime.fromisoformat(time_str)
            if time.tzinfo is None:
                time = time.replace(tzinfo=datetime.timezone.utc)
            print(f"Parsed {action} for {staff_id} at {time}")
        except ValueError:
            print(f"Skipping - bad timestamp: {time_str}")
            continue
        if time < start or time > end:
            print(f"Skipping - out of range: {time} not in {start} to {end}")
            continue
        events.append({'staff_id': staff_id, 'action': action, 'time': time})

    events.sort(key=lambda x: x['time'])
    print(f"Sorted events: {events}")

    hours = {}
    in_times = {}
    for event in events:
        staff_id = event['staff_id']
        action = event['action']
        time = event['time']
        if action == 'In':
            if staff_id not in in_times:
                in_times[staff_id] = []
            in_times[staff_id].append(time)
            print(f"Stored In for {staff_id}: {time}")
        elif action == 'Out' and staff_id in in_times and in_times[staff_id]:
            in_time = in_times[staff_id].pop(0)
            if time > in_time:
                date_str = time.date().isoformat()
                if staff_id not in hours:
                    hours[staff_id] = {}
                hours[staff_id][date_str] = (time - in_time).total_seconds() / 3600
                print(f"Paired {staff_id} on {date_str}: {hours[staff_id][date_str]}")

    total_hours = {staff_id: round(sum(hours[staff_id].values()), 2) for staff_id in hours}
    print(f"Final total hours: {total_hours}")
    return jsonify({'message': 'Hours calculated', 'hours': total_hours})

@app.route('/api/schedule', methods=['GET'])
@login_required
def schedule():
    staff_id = session['staff_id']
    today = datetime.datetime.now(datetime.timezone.utc).date()
    shifts = []
    # Mock data - replace with real schedule source later
    for i in range(14):
        date = today + datetime.timedelta(days=i)
        if i % 3 == 0:
            shifts.append({
                'site': 'Site 1',
                'date': date.isoformat(),
                'start': '09:00',
                'end': '17:00',
                'address': '123 Main St, Surrey, BC'
            })
        elif i % 3 == 1:
            shifts.append({
                'site': 'Site 2',
                'date': date.isoformat(),
                'start': '13:00',
                'end': '21:00',
                'address': '456 Oak Ave, Surrey, BC'
            })
    return jsonify({'shifts': shifts})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=True)