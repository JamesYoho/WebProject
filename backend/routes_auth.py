"""Password login and server-side authorization identity."""
from flask import Blueprint, request, jsonify, session, g, abort
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User, UserRole

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


def user_json(user):
    return {"id": user.id, "username": user.username, "role": user.role.value}


@auth_bp.before_app_request
def protect_api():
    if not request.path.startswith('/api/'):
        return
    if request.method not in ('GET', 'HEAD', 'OPTIONS') and request.headers.get('X-Pictionary-Request') != '1':
        abort(403, description='Missing request header.')
    g.user = db.session.get(User, session.get('user_id')) if session.get('user_id') else None
    if request.path != '/api/auth/login' and g.user is None:
        abort(401, description='Please log in.')


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = str(data.get('username', '')).strip()
    password = data.get('password', '')
    if not username or len(username) > 50 or not isinstance(password, str) or not password:
        abort(400, description='Enter a username (up to 50 characters) and password.')
    user = db.session.scalar(db.select(User).filter_by(username=username))
    if user is None:
        user = User(username=username, password_hash=generate_password_hash(password), role=UserRole.PLAYER)
        db.session.add(user)
        db.session.commit()
    elif not check_password_hash(user.password_hash, password):
        abort(401, description='Invalid username or password.')
    session.clear()
    session['user_id'] = user.id
    return jsonify(user_json(user))


@auth_bp.route('/me')
def me():
    return jsonify(user_json(g.user))


@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"status": "ok"})
