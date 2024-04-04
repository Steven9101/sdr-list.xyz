from flask import Flask, jsonify, request
from datetime import datetime, timedelta
from threading import Thread
import sqlite3
import time
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Initialize the SQLite database
DATABASE_FILE = 'websdrs.db'

def get_db_connection():
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS websdrs (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            bandwidth INTEGER,
            users INTEGER,
            antenna TEXT,
            center_frequency INTEGER,
            last_update TIMESTAMP,
            ip TEXT,
            port INTEGER,
            grid_locator TEXT,
            hostname TEXT
        )
    ''')
    conn.commit()
    conn.close()

init_db()


# Function to remove inactive WebSDRs
def remove_inactive_websdrs():
    while True:
        conn = get_db_connection()
        current_time = datetime.now()
        threshold_time = current_time - timedelta(seconds=60)
        conn.execute('''
            DELETE FROM websdrs
            WHERE last_update < ?
        ''', (threshold_time,))
        conn.commit()
        conn.close()
        # Check every 10 seconds
        time.sleep(10)





@app.route('/update_websdr', methods=['POST'])
def update_websdr():
    websdr_data = request.get_json()
    # Extract the hostname from the request payload
    hostname = websdr_data.get('hostname', '')  # Default to an empty string if not provided
    conn = get_db_connection()
    conn.execute('''
        INSERT INTO websdrs (id, name, bandwidth, users, antenna, center_frequency, last_update, ip, port, grid_locator, hostname)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name=excluded.name,
            bandwidth=excluded.bandwidth,
            users=excluded.users,
            antenna=excluded.antenna,
            center_frequency=excluded.center_frequency,
            last_update=excluded.last_update,
            ip=excluded.ip,
            port=excluded.port,
            grid_locator=excluded.grid_locator,
            hostname=excluded.hostname
    ''', (
        websdr_data['id'],
        websdr_data['name'],
        websdr_data['bandwidth'],
        websdr_data['users'],
        websdr_data['antenna'],
        websdr_data['center_frequency'],
        datetime.now(),
        request.headers.get('X-Real-IP', request.remote_addr),
        websdr_data['port'],
        websdr_data['grid_locator'],
        hostname  # Pass the hostname to the query
    ))
    conn.commit()
    conn.close()
    return jsonify({'message': 'WebSDR data updated successfully'}), 201



@app.route('/get_websdrs', methods=['GET'])
def get_websdrs():
    conn = get_db_connection()
    websdrs = conn.execute('SELECT * FROM websdrs').fetchall()
    conn.close()
    return jsonify([dict(row) for row in websdrs])

if __name__ == '__main__':
    # Run the Flask application on port 5000
    app.run(host='0.0.0.0', debug=False, port=5000)
