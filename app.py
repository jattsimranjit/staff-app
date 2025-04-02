from flask import Flask, request, jsonify, session
from flask_cors import CORS
import sqlite3
from functools import wraps

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'  # Replace with a secure key in production
CORS(app, supports_credentials=True)

def get_db_connection():
    conn = sqlite3.connect('staff_app.db')
    conn.row_factory = sqlite3.Row  # Return rows as dictionaries
    return conn

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Not logged in'}), 401
        return f(*args, **kwargs)
    return decorated_function

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    phone = data.get('phone')
    password = data.get('password')
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE phone = ? AND password = ?', (phone, password))
    user = cursor.fetchone()
    conn.close()
    if user:
        session['user_id'] = user['user_id']
        session['role'] = user['role']
        return jsonify({'user_id': user['user_id'], 'role': user['role']})
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/logout', methods=['POST'])
@login_required
def logout():
    session.pop('user_id', None)
    session.pop('role', None)
    return jsonify({'message': 'Logged out successfully'})

@app.route('/api/schedule', methods=['GET'])
@login_required
def get_schedule():
    user_role = session.get('role')
    conn = get_db_connection()
    cursor = conn.cursor()
    if user_role == 'Manager':
        cursor.execute('SELECT * FROM shifts')
        shifts = cursor.fetchall()
        cursor.execute('SELECT user_id, name, sites FROM users WHERE role != "Manager"')
        staff = cursor.fetchall()
        cursor.execute('SELECT * FROM sites')
        sites = cursor.fetchall()
        conn.close()
        return jsonify({
            'shifts': [{'staff_id': s['staff_id'], 'site': s['site'], 'date': s['date'], 'start': s['start'], 'end': s['end']} for s in shifts],
            'staff': [{'user_id': s['user_id'], 'name': s['name'], 'sites': s['sites'] if s['sites'] else ''} for s in staff],
            'sites': [dict(s) for s in sites]
        })
    else:
        cursor.execute('SELECT * FROM shifts WHERE staff_id = ?', (session['user_id'],))
        shifts = cursor.fetchall()
        conn.close()
        return jsonify({'shifts': [{'staff_id': s['staff_id'], 'site': s['site'], 'date': s['date'], 'start': s['start'], 'end': s['end']} for s in shifts]})

@app.route('/api/schedule', methods=['POST'])
@login_required
def add_shift():
    if session.get('role') != 'Manager':
        return jsonify({'error': 'Unauthorized'}), 403
    data = request.get_json()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('INSERT INTO shifts (staff_id, site, date, start, end) VALUES (?, ?, ?, ?, ?)',
                   (data['staff_id'], data['site'], data['date'], data['start'], data['end']))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Shift added successfully'})

@app.route('/api/staff', methods=['GET'])
@login_required
def get_staff():
    if session.get('role') != 'Manager':
        return jsonify({'error': 'Unauthorized'}), 403
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE role != "Manager"')
    staff = cursor.fetchall()
    conn.close()
    return jsonify([dict(s) for s in staff])

@app.route('/api/staff', methods=['POST'])
@login_required
def add_staff():
    if session.get('role') != 'Manager':
        return jsonify({'error': 'Unauthorized'}), 403
    data = request.get_json()
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO users (user_id, name, email, phone, password, role, address, dob, sin, security_license, emergency_contact_name, emergency_contact_number, note, sites)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (data['user_id'], data['name'], data['email'], data['phone'], data['password'], data['role'],
              data.get('address'), data.get('dob'), data.get('sin'), data.get('security_license'),
              data.get('emergency_contact_name'), data.get('emergency_contact_number'), data.get('note'), data.get('sites')))
        conn.commit()
        return jsonify({'message': 'Staff added successfully'})
    except sqlite3.IntegrityError as e:
        error_msg = str(e)
        if 'UNIQUE constraint failed' in error_msg:
            field = error_msg.split('.')[-1]
            return jsonify({'error': f'Duplicate {field} already exists'}), 400
        elif 'CHECK constraint failed' in error_msg:
            return jsonify({'error': f'Invalid role value: {data["role"]}'}), 400
        else:
            return jsonify({'error': f'Database error: {error_msg}'}), 400
    finally:
        conn.close()

@app.route('/api/staff/<user_id>', methods=['PUT'])
@login_required
def update_staff(user_id):
    if session.get('role') != 'Manager':
        return jsonify({'error': 'Unauthorized'}), 403
    data = request.get_json()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE users SET name = ?, email = ?, phone = ?, password = ?, role = ?, address = ?, dob = ?, sin = ?, 
        security_license = ?, emergency_contact_name = ?, emergency_contact_number = ?, note = ?, sites = ?
        WHERE user_id = ? AND role != "Manager"
    ''', (data['name'], data['email'], data['phone'], data['password'], data['role'], data.get('address'), 
          data.get('dob'), data.get('sin'), data.get('security_license'), data.get('emergency_contact_name'), 
          data.get('emergency_contact_number'), data.get('note'), data.get('sites'), user_id))
    if cursor.rowcount == 0:
        conn.close()
        return jsonify({'error': 'Staff not found'}), 404
    conn.commit()
    conn.close()
    return jsonify({'message': 'Staff updated successfully'})

@app.route('/api/staff/<user_id>', methods=['DELETE'])
@login_required
def delete_staff(user_id):
    if session.get('role') != 'Manager':
        return jsonify({'error': 'Unauthorized'}), 403
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM users WHERE user_id = ? AND role != "Manager"', (user_id,))
    if cursor.rowcount == 0:
        conn.close()
        return jsonify({'error': 'Staff not found'}), 404
    conn.commit()
    conn.close()
    return jsonify({'message': 'Staff deleted successfully'})

@app.route('/api/sites', methods=['GET'])
@login_required
def get_sites():
    if session.get('role') != 'Manager':
        return jsonify({'error': 'Unauthorized'}), 403
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM sites')
    sites = cursor.fetchall()
    cursor.execute('SELECT user_id, name, sites FROM users WHERE role != "Manager"')
    staff = cursor.fetchall()
    conn.close()
    return jsonify({
        'sites': [dict(s) for s in sites],
        'staff': [{'user_id': s['user_id'], 'name': s['name'], 'sites': s['sites'] if s['sites'] else ''} for s in staff]
    })

@app.route('/api/sites', methods=['POST'])
@login_required
def add_site():
    if session.get('role') != 'Manager':
        return jsonify({'error': 'Unauthorized'}), 403
    data = request.get_json()
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('INSERT INTO sites (name, address, contact_name, contact_phone, rate, note) VALUES (?, ?, ?, ?, ?, ?)',
                       (data['name'], data['address'], data['contact_name'], data['contact_phone'], data['rate'], data['note']))
        conn.commit()
        return jsonify({'message': 'Site added successfully'})
    except sqlite3.IntegrityError as e:
        error_msg = str(e)
        if 'UNIQUE constraint failed' in error_msg:
            field = error_msg.split('.')[-1]
            return jsonify({'error': f'Duplicate {field} already exists'}), 400
        else:
            return jsonify({'error': f'Database error: {error_msg}'}), 400
    finally:
        conn.close()

@app.route('/api/sites/<site_name>', methods=['DELETE'])
@login_required
def delete_site(site_name):
    if session.get('role') != 'Manager':
        return jsonify({'error': 'Unauthorized'}), 403
    conn = get_db_connection()
    cursor = conn.cursor()
    # Check if site is used in shifts
    cursor.execute('SELECT COUNT(*) FROM shifts WHERE site = ?', (site_name,))
    shift_count = cursor.fetchone()[0]
    if shift_count > 0:
        conn.close()
        return jsonify({'error': 'Cannot delete site with assigned shifts'}), 400
    cursor.execute('DELETE FROM sites WHERE name = ?', (site_name,))
    if cursor.rowcount == 0:
        conn.close()
        return jsonify({'error': 'Site not found'}), 404
    # Update staff sites by removing the deleted site
    cursor.execute('SELECT user_id, sites FROM users WHERE sites LIKE ?', (f'%{site_name}%',))
    staff_to_update = cursor.fetchall()
    for staff in staff_to_update:
        sites = staff['sites'].split(',')
        if site_name in sites:
            sites.remove(site_name)
            new_sites = ','.join(sites)
            cursor.execute('UPDATE users SET sites = ? WHERE user_id = ?', (new_sites, staff['user_id']))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Site deleted successfully'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)