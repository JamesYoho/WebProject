import os
import secrets
from pathlib import Path
import click
from werkzeug.security import generate_password_hash
from werkzeug.exceptions import HTTPException
from flask import Flask, jsonify
from models import db, Prompt, User, UserRole
from routes_auth import auth_bp
from routes_game import game_bp

app = Flask(__name__)
Path(app.instance_path).mkdir(parents=True, exist_ok=True)
key_path = Path(app.instance_path) / 'session.key'
if not key_path.exists():
    key_path.write_text(secrets.token_hex(32))
    key_path.chmod(0o600)
app.config.update(
    SECRET_KEY=os.environ.get('SECRET_KEY') or key_path.read_text().strip(),
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Strict',
    SESSION_COOKIE_SECURE=os.environ.get('COOKIE_SECURE') == '1',
)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///pictionary.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
app.register_blueprint(auth_bp)
app.register_blueprint(game_bp)

with app.app_context():
    db.create_all()
    # Seed 3 starter prompts if DB is empty
    if not db.session.scalar(db.select(Prompt)):
        db.session.add_all([
            Prompt(word="Cat", difficulty=1),
            Prompt(word="Sun", difficulty=1),
            Prompt(word="Pizza", difficulty=1),
        ])
        db.session.commit()

@app.errorhandler(HTTPException)
def api_error(error):
    return jsonify(error=error.description), error.code


@app.cli.command('create-moderator')
@click.argument('username')
@click.password_option(confirmation_prompt=True)
def create_moderator(username, password):
    """Create or promote a moderator, setting their password."""
    username = username.strip()
    if not username or not password:
        raise click.ClickException('Username and password are required.')
    user = db.session.scalar(db.select(User).filter_by(username=username))
    if user is None:
        user = User(username=username, password_hash=generate_password_hash(password))
        db.session.add(user)
    user.role = UserRole.MODERATOR
    user.password_hash = generate_password_hash(password)
    db.session.commit()
    click.echo(f'Moderator {username} is ready.')

if __name__ == '__main__':
    app.run(debug=True, port=5000)