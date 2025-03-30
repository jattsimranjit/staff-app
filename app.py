from flask import Flask, request, jsonify, session
from flask_cors import CORS
import json
import os

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'  # Replace with a secure key (e.g., 'supersecret123')
CORS(app, supports_credentials=True)

# File paths in the root directory
STAFF_DATA_FILE = 'staff_data.json'
SCHEDULE_FILE = 'schedule_data.json'

def load_staff_data():
    if os.path.exists(STAFF_DATA_FILE):
        with open(STAFF_DATA_FILE, 'r') as f:
            return json.load(f)
    return {"staff": []}

def load_schedule_data():
    if os.path.exists(SCHEDULE_FILE):
        with open(SCHEDULE_FILE, 'r') as f:
            return json.load(f)
    # If file doesn't exist, return empty shifts structure
    return {"shifts": []}

def save_schedule_data(data):
    with open(SCHEDULE_FILE, 'w') as f:
        json.dump(data, f, indent=2)

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    phone = data.get('phone')
    password = data.get('password')
    staff_data = load_staff_data()

    for user in staff_data['staff']:
        if user['phone'] == phone and user['password'] == password:
            session['user_id'] = user['user_id']
            session['role'] = user['role']
            return jsonify({"user_id": user['user_id'], "role": user['role']}), 200
    return jsonify({"error": "Invalid credentials"}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    session.pop('role', None)
    return jsonify({"message": "Logged out"}), 200

@app.route('/api/clock', methods=['POST'])
def clock():
    if 'user_id' not in session or session['role'] != 'staff':
        return jsonify({"error": "Not authorized"}), 401
    data = request.get_json()
    action = data.get('action')
    lat = data.get('lat')
    lon = data.get('lon')
    user_id = session['user_id']
    return jsonify({"message": f"{action} successful for {user_id} at ({lat}, {lon})"}), 200

@app.route('/api/schedule', methods=['GET'])
def get_schedule():
    if 'user_id' not in session:
        return jsonify({"error": "Not logged in"}), 401
    user_id = session['user_id']
    role = session['role']
    schedule_data = load_schedule_data()

    if role == 'manager':
        return jsonify({"shifts": schedule_data["shifts"]}), 200
    else:  # staff
        user_shifts = [shift for shift in schedule_data["shifts"] if shift['staff_id'] == user_id]
        return jsonify({"shifts": user_shifts}), 200

@app.route('/api/schedule', methods=['POST'])
def set_schedule():
    if 'user_id' not in session or session['role'] != 'manager':
        return jsonify({"error": "Not authorized"}), 401
    data = request.get_json()
    schedule_data = load_schedule_data()
    schedule_data["shifts"].append(data)
    save_schedule_data(schedule_data)
    return jsonify({"message": "Shift assigned successfully"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)