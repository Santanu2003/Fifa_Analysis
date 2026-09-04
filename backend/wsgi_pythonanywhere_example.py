# Example wsgi.py content for PythonAnywhere's "Web" tab.
# PythonAnywhere gives you an auto-generated wsgi.py to edit — replace its
# contents with something like this (adjust the path to match where you
# cloned the repo, shown on the Web tab as your project's home directory).

import sys

# Add your project's backend directory to the path so `app.main` can be imported.
path = '/home/YOUR_USERNAME/Fifa_Analysis/backend'
if path not in sys.path:
    sys.path.insert(0, path)

from a2wsgi import ASGIMiddleware
from app.main import app as fastapi_app

# PythonAnywhere expects a WSGI callable named `application`.
application = ASGIMiddleware(fastapi_app)
