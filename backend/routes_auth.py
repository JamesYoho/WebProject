"""
PURPOSE: Handles all user authentication endpoints.
CONTENTS:
- @app.route('/api/register') -> Creates a new user in the DB and hashes the password.
- @app.route('/api/login') -> Verifies credentials and creates a session cookie or returns a JWT.
- @app.route('/api/logout') -> Destroys the active session.
- Helper functions or decorators (e.g., @login_required) to protect other routes from unauthorized access.
"""