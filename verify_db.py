import sqlite3

# Connect to the database
conn = sqlite3.connect('staff_app.db')
cursor = conn.cursor()

# Query the users table
cursor.execute('SELECT * FROM users')
users = cursor.fetchall()

# Print the results
print("Users in the database:")
for user in users:
    print(user)

# Close the connection
conn.close()