"""
PURPOSE: The central entry point for the Flask server.
CONTENTS:
- Initializes the Flask application instance.
- Configures the SQLAlchemy database connection (e.g., SQLite for dev, PostgreSQL for prod).
- Registers Flask Blueprints (routes) from routes_auth.py and routes_game.py.
- Handles global configurations like CORS (Cross-Origin Resource Sharing) so the TypeScript frontend can communicate with it.
"""

from flask import Flask
from models import db, Prompt
from routes_auth import auth_bp
from routes_game import game_bp

app = Flask(__name__)
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

if __name__ == '__main__':
    app.run(debug=True, port=5000)