import sqlite3
import os

def init_db():
    db_path = 'staff_app.db'
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row  # For dictionary-like rows
    cursor = conn.cursor()

    # Check if 'users' table exists and has the correct schema
    cursor.execute("PRAGMA table_info(users)")
    columns = [col['name'] for col in cursor.fetchall()]
    print(f"Current columns in 'users' table: {columns}")

    # If 'sites' is missing, try to add it
    if 'sites' not in columns:
        try:
            cursor.execute('ALTER TABLE users ADD COLUMN sites TEXT')
            print("Successfully added 'sites' column to users table.")
        except sqlite3.OperationalError as e:
            print(f"Failed to alter table: {e}. Recreating table instead.")
            # If ALTER fails, drop and recreate the table (data loss warning)
            cursor.execute('DROP TABLE IF EXISTS users')
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
            print("Recreated 'users' table with all columns.")

    # Ensure 'shifts' table exists
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

    # Insert default manager if not exists
    cursor.execute('INSERT OR IGNORE INTO users (user_id, name, email, phone, password, role, sites) VALUES (?, ?, ?, ?, ?, ?, ?)',
                   ('manager1', 'Manager One', 'manager1@example.com', '9999999999', 'manager123', 'Manager', 'Site 1,Site 2'))

    conn.commit()
    conn.close()
    print(f"Database at {os.path.abspath(db_path)} initialized successfully.")

if __name__ == '__main__':
    init_db()