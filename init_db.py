import sqlite3
import os

def init_db():
    db_path = 'staff_app.db'
    if os.path.exists(db_path):
        os.remove(db_path)  # Reset database
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE users (
            user_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE,
            phone TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('Security Officer', 'Supervisor', 'Manager')),
            address TEXT,
            dob TEXT,
            sin TEXT UNIQUE,
            security_license TEXT UNIQUE,
            emergency_contact_name TEXT,
            emergency_contact_number TEXT,
            note TEXT,
            sites TEXT
        )
    ''')

    cursor.execute('''
        CREATE TABLE shifts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            staff_id TEXT,
            site TEXT,
            date TEXT,
            start TEXT,
            end TEXT,
            FOREIGN KEY (staff_id) REFERENCES users (user_id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE sites (
            name TEXT PRIMARY KEY,
            address TEXT NOT NULL,
            contact_name TEXT NOT NULL,
            contact_phone TEXT NOT NULL,
            rate REAL NOT NULL,
            note TEXT
        )
    ''')

    cursor.execute('INSERT INTO users (user_id, name, email, phone, password, role, sites) VALUES (?, ?, ?, ?, ?, ?, ?)',
                   ('manager1', 'Manager One', 'manager1@example.com', '9999999999', 'manager123', 'Manager', 'Site 1,Site 2'))

    cursor.execute('INSERT INTO sites (name, address, contact_name, contact_phone, rate, note) VALUES (?, ?, ?, ?, ?, ?)',
                   ('Site 1', '123 Main St', 'Alice Smith', '555-1234', 25.50, 'Primary location'))
    cursor.execute('INSERT INTO sites (name, address, contact_name, contact_phone, rate, note) VALUES (?, ?, ?, ?, ?, ?)',
                   ('Site 2', '456 Oak Ave', 'Bob Johnson', '555-5678', 28.00, 'Secondary location'))

    conn.commit()
    conn.close()
    print(f"Database at {os.path.abspath(db_path)} reset and initialized successfully.")

if __name__ == '__main__':
    init_db()