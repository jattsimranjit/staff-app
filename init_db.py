import sqlite3

def init_db():
    conn = sqlite3.connect('staff_app.db')
    cursor = conn.cursor()

    # Create users table with all required fields
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE,
            phone TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('manager', 'staff')),
            address TEXT,
            dob TEXT,  -- Date of Birth (e.g., 'YYYY-MM-DD')
            sin TEXT UNIQUE,  -- Social Insurance Number
            security_license TEXT UNIQUE,
            emergency_contact_name TEXT,
            emergency_contact_number TEXT,
            note TEXT
        )
    ''')

    # Create shifts table (already exists, but ensure compatibility)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS shifts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            staff_id TEXT,
            site TEXT,
            date TEXT,
            start TEXT,
            end TEXT,
            FOREIGN KEY (staff_id) REFERENCES users (user_id)
        )
    ''')

    # Insert initial manager (if not already present)
    cursor.execute('''
        INSERT OR IGNORE INTO users (user_id, name, email, phone, password, role)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', ('manager1', 'Manager One', 'manager1@example.com', '9999999999', 'manager123', 'manager'))

    conn.commit()
    conn.close()
    print("Database initialized successfully.")

if __name__ == '__main__':
    init_db()