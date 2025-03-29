import os
from flask import Flask, request, render_template, jsonify
import requests
import datetime
import math

app = Flask(__name__)
CLICKUP_TOKEN = 'pk_132090641_NJ3Z7FO8C32Q1JK0Z61IJ5KXMF80DFQ0'
CLICKUP_LIST_ID = '901309228827'
HEADERS = {'Authorization': CLICKUP_TOKEN, 'Content-Type': 'application/json'}

SITES = {
    "Site 1": (49.134606, -122.843653, 100),
    "Site 2": (37.7849, -122.4294, 100),
    "Site 3": (37.7949, -122.4394, 100),
    "Site 4": (37.8049, -122.4494, 100),
    "Site 5": (37.8149, -122.4594, 100),
    "Site 6": (37.8249, -122.4694, 100),
}

def is_within_geofence(lat, lon, site):
    site_lat, site_lon, radius = SITES[site]
    distance = math.sqrt((lat - site_lat)**2 + (lon - site_lon)**2) * 111320
    return distance <= radius

@app.route('/', methods=['GET', 'POST'])
def home():
    if request.method == 'POST':
        print("Form data received:", request.form)
        try:
            action = request.form['action']
            staff_id = request.form['staff_id']
            site = request.form['site']
            lat = float(request.form['lat'])
            lon = float(request.form['lon'])
            now = datetime.datetime.now(datetime.timezone.utc).isoformat()

            if not is_within_geofence(lat, lon, site):
                return jsonify({'error': 'You must be on-site to clock in/report'}), 403

            action_map = {'clock_in': 'In', 'clock_out': 'Out', 'report': 'Report'}
            task_data = {'name': f'{staff_id} - {action_map[action]} - {now}', 'description': f'Site: {site}'}
            response = requests.post(
                f'https://api.clickup.com/api/v2/list/{CLICKUP_LIST_ID}/task',
                headers=HEADERS,
                json=task_data
            )
            print(f"ClickUp POST response: {response.status_code} - {response.text}")
            if response.status_code in [200, 201]:
                return jsonify({'message': f'{action.replace("_", " ").capitalize()}ed successfully!'})
            else:
                return jsonify({'error': f'Failed to log to ClickUp: {response.status_code} - {response.text}'}), 500
        except KeyError as e:
            return jsonify({'error': f'Missing field: {e}'}), 400
        except ValueError as e:
            return jsonify({'error': 'Invalid location data'}), 400
    return render_template('index.html', sites=SITES.keys())

@app.route('/hours', methods=['GET'])
def hours():
    from_date = request.args.get('from')
    to_date = request.args.get('to')
    
    if not from_date or not to_date:
        return jsonify({'error': 'Please select a date range'}), 400
    
    try:
        start = datetime.datetime.strptime(from_date, '%Y-%m-%d').replace(tzinfo=datetime.timezone.utc)
        end = datetime.datetime.strptime(to_date, '%Y-%m-%d').replace(hour=23, minute=59, second=59, tzinfo=datetime.timezone.utc)
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400

    print(f"Date range: {start} to {end}")
    tasks = requests.get(f'https://api.clickup.com/api/v2/list/{CLICKUP_LIST_ID}/task', headers=HEADERS).json()['tasks']
    print("Raw tasks from ClickUp:", tasks)
    
    events = []
    for task in tasks:
        name = task.get('name', '').strip()
        print("Processing task:", name)
        if ' - In - ' in name or ' - Clock_in - ' in name:
            staff_id, _, time_str = name.split(' - ', 2)
            action = 'In'
        elif ' - Out - ' in name or ' - Clock_out - ' in name:
            staff_id, _, time_str = name.split(' - ', 2)
            action = 'Out'
        else:
            print("Skipping - no In/Out:", name)
            continue
        try:
            time = datetime.datetime.fromisoformat(time_str)
            if time.tzinfo is None:
                time = time.replace(tzinfo=datetime.timezone.utc)
            print(f"Parsed {action} for {staff_id} at {time}")
        except ValueError:
            print("Skipping - bad timestamp:", time_str)
            continue
        if time < start or time > end:
            print(f"Skipping - out of range: {time} not in {start} to {end}")
            continue
        events.append({'staff_id': staff_id, 'action': action, 'time': time})

    events.sort(key=lambda x: x['time'])
    print("Sorted events:", events)

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
                print(f"Paired {staff_id} on {date_str}: {hours[staff_id][date_str]} hours")

    total_hours = {}
    for staff_id in hours:
        total_hours[staff_id] = sum(hours[staff_id].values())
        print(f"Total for {staff_id}: {total_hours[staff_id]} hours")

    print("Final total hours:", total_hours)
    return jsonify({'message': 'Hours calculated', 'hours': total_hours})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=True)