"""
PURPOSE: Defines the database schema using Flask-SQLAlchemy.
CONTENTS:
- Classes representing database tables: User, Match, Participant, Drawing, Guess, Prompt.
- Defines relationships (e.g., a Match has many Participants; a Drawing belongs to a Match and a User).
- No routing or game logic goes here. This file is strictly for data structure definition.
"""