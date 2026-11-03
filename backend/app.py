"""
PURPOSE: The central entry point for the Flask server.
CONTENTS:
- Initializes the Flask application instance.
- Configures the SQLAlchemy database connection (e.g., SQLite for dev, PostgreSQL for prod).
- Registers Flask Blueprints (routes) from routes_auth.py and routes_game.py.
- Handles global configurations like CORS (Cross-Origin Resource Sharing) so the TypeScript frontend can communicate with it.
"""