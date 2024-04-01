# gunicorn_config.py
import os
from threading import Thread
from main import remove_inactive_websdrs

def post_fork(server, worker):
    print("Starting cleanup thread in worker: %s" % worker.pid)
    Thread(target=remove_inactive_websdrs, daemon=True).start()
