"""
PURPOSE: Handles all user authentication endpoints.
CONTENTS:
- @app.route('/api/register') -> Creates a new user in the DB and hashes the password.
- @app.route('/api/login') -> Verifies credentials and creates a session cookie or returns a JWT.
- @app.route('/api/logout') -> Destroys the active session.
- Helper functions or decorators (e.g., @login_required) to protect other routes from unauthorized access.
"""

from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, UserRole

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', 'password')

    if not username:
        return jsonify({"error": "Username is required", "status": 400}), 400

    # Auto-register user if they don't exist yet for easy prototype testing
    user = db.session.scalar(db.select(User).filter_by(username=username))
    if not user:
        user = User(
            username=username,
            password_hash=generate_password_hash(password),
            role=UserRole.ADMIN if username.lower() == 'admin' else UserRole.PLAYER
        )
        db.session.add(user)
        db.session.commit()
    elif not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid password", "status": 401}), 401

    return jsonify({
        "id": user.id,
        "username": user.username,
        "role": user.role.value
    })