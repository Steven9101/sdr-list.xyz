from flask import Flask, jsonify, request
from datetime import datetime, timedelta
from threading import Thread
import sqlite3
import time
from flask_cors import CORS
import logging
import re

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

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
            max_users INTEGER DEFAULT 100,
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

def normalize_hostname(hostname):
    # Remove http:// or https:// if present
    hostname = re.sub(r'^https?://', '', hostname)
    # Remove trailing slash if present
    hostname = hostname.rstrip('/')
    return hostname

@app.route('/update_websdr', methods=['POST'])
def update_websdr():
    websdr_data = request.get_json()
    

    if not websdr_data:
        error_msg = 'No JSON data provided'
        logger.error(f"Error in update_websdr: {error_msg}")
        return jsonify({'error': error_msg}), 400

    required_fields = ['id', 'name', 'bandwidth', 'users', 'antenna', 'center_frequency', 'port', 'grid_locator']
    missing_fields = [field for field in required_fields if field not in websdr_data]
    
    if missing_fields:
        error_msg = f'Missing required fields: {", ".join(missing_fields)}'
        logger.error(f"Error in update_websdr: {error_msg}")
        return jsonify({'error': error_msg}), 400

    hostname = websdr_data.get('hostname', '')
    if hostname:
        hostname = normalize_hostname(hostname)

    # Get max_users from the data, default to 100 if not provided
    max_users = websdr_data.get('max_users', 100)

    conn = get_db_connection()
    try:
        conn.execute('''
            INSERT INTO websdrs (id, name, bandwidth, users, max_users, antenna, center_frequency, last_update, ip, port, grid_locator, hostname)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name=excluded.name,
                bandwidth=excluded.bandwidth,
                users=excluded.users,
                max_users=excluded.max_users,
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
            max_users,
            websdr_data['antenna'],
            websdr_data['center_frequency'],
            datetime.now(),
            request.headers.get('X-Real-IP', request.remote_addr),
            websdr_data['port'],
            websdr_data['grid_locator'],
            hostname
        ))
        conn.commit()
        return jsonify({'message': 'WebSDR data updated successfully'}), 201
    except sqlite3.Error as e:
        error_msg = f'Database error: {str(e)}'
        logger.error(f"Error in update_websdr: {error_msg}")
        return jsonify({'error': error_msg}), 500
    except Exception as e:
        error_msg = f'Unexpected error: {str(e)}'
        logger.error(f"Error in update_websdr: {error_msg}")
        return jsonify({'error': error_msg}), 500
    finally:
        conn.close()

@app.route('/get_websdrs', methods=['GET'])
def get_websdrs():
    conn = get_db_connection()
    websdrs = conn.execute('''
        SELECT id, name, bandwidth, users, ip, max_users, antenna, center_frequency, grid_locator, 
               CASE 
                   WHEN hostname != '' THEN 'http://' || hostname || ':' || port
                   ELSE 'http://' || ip || ':' || port
               END AS url
        FROM websdrs
    ''').fetchall()
    conn.close()

    result = []
    for row in websdrs:
        websdr = {
            'id': row['id'],
            'name': row['name'],
            'bandwidth': row['bandwidth'],
            'ip': row['ip'],
            'users': row['users'],
            'max_users': row['max_users'],
            'antenna': row['antenna'],
            'center_frequency': row['center_frequency'],
            'grid_locator': row['grid_locator'],
            'url': row['url']
        }
        result.append(websdr)

    return jsonify(result)

if __name__ == '__main__':
    try:
        # Run the Flask application on port 5000
        app.run(host='0.0.0.0', debug=False, port=5000)
    except Exception as e:
        logger.error(f"Error starting the Flask application: {str(e)}")
