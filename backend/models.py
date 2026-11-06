"""
backend/models.py

Flask-SQLAlchemy 2.0 models mapped exactly to the frontend TypeScript interfaces.
Handles database schemas, constraints, and relational mappings.
"""

from typing import List, Optional
from enum import Enum as PyEnum
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, ForeignKey, Boolean, Text, Enum

from typing import List, Optional
from enum import Enum as PyEnum
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, ForeignKey, Boolean, Text, Enum

db = SQLAlchemy()

class UserRole(PyEnum):
    PLAYER = 'player'
    MODERATOR = 'moderator'

class MatchStatus(PyEnum):
    LOBBY = 'lobby'
    DRAWING = 'drawing'
    GUESSING = 'guessing'
    FINISHED = 'finished'

class GameRole(PyEnum):
    DRAWER = 'drawer'
    GUESSER = 'guesser'

class User(db.Model):
    __tablename__ = 'users'
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, native_enum=False), default=UserRole.PLAYER, nullable=False)

    participations: Mapped[List["Participant"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    drawings: Mapped[List["Drawing"]] = relationship(back_populates="drawer")
    guesses: Mapped[List["Guess"]] = relationship(back_populates="guesser")

class Match(db.Model):
    __tablename__ = 'matches'
    id: Mapped[int] = mapped_column(primary_key=True)
    room_code: Mapped[str] = mapped_column(String(4), unique=True, nullable=False)
    status: Mapped[MatchStatus] = mapped_column(Enum(MatchStatus, native_enum=False), default=MatchStatus.LOBBY, nullable=False)

    participants: Mapped[List["Participant"]] = relationship(back_populates="match", cascade="all, delete-orphan")
    drawings: Mapped[List["Drawing"]] = relationship(back_populates="match", cascade="all, delete-orphan")

class Participant(db.Model):
    __tablename__ = 'participants'
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), nullable=False)
    match_id: Mapped[int] = mapped_column(ForeignKey('matches.id'), nullable=False)
    team_id: Mapped[int] = mapped_column(Integer, nullable=False)
    game_role: Mapped[GameRole] = mapped_column(Enum(GameRole, native_enum=False), nullable=False)

    user: Mapped["User"] = relationship(back_populates="participations")
    match: Mapped["Match"] = relationship(back_populates="participants")

class Prompt(db.Model):
    __tablename__ = 'prompts'
    id: Mapped[int] = mapped_column(primary_key=True)
    word: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    difficulty: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    drawings: Mapped[List["Drawing"]] = relationship(back_populates="prompt")

class Drawing(db.Model):
    __tablename__ = 'drawings'
    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey('matches.id'), nullable=False)
    drawer_id: Mapped[int] = mapped_column(ForeignKey('users.id'), nullable=False)
    prompt_id: Mapped[int] = mapped_column(ForeignKey('prompts.id'), nullable=False)
    image_b64: Mapped[str] = mapped_column(Text, nullable=False)

    match: Mapped["Match"] = relationship(back_populates="drawings")
    drawer: Mapped["User"] = relationship(back_populates="drawings")
    prompt: Mapped["Prompt"] = relationship(back_populates="drawings")
    guess: Mapped[Optional["Guess"]] = relationship(back_populates="drawing", cascade="all, delete-orphan", uselist=False)

class Guess(db.Model):
    __tablename__ = 'guesses'
    id: Mapped[int] = mapped_column(primary_key=True)
    drawing_id: Mapped[int] = mapped_column(ForeignKey('drawings.id'), nullable=False, unique=True)
    guesser_id: Mapped[int] = mapped_column(ForeignKey('users.id'), nullable=False)
    guess_text: Mapped[str] = mapped_column(String(100), nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)

    drawing: Mapped["Drawing"] = relationship(back_populates="guess")
    guesser: Mapped["User"] = relationship(back_populates="guesses")

class MatchSettings(db.Model):
    """Separate table so existing databases need no destructive migration."""
    __tablename__ = 'match_settings'
    match_id: Mapped[int] = mapped_column(ForeignKey('matches.id'), primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey('users.id'), nullable=False)
    prompt_ids = mapped_column(db.JSON, nullable=False)


class RemovedPlayer(db.Model):
    __tablename__ = 'removed_players'
    match_id: Mapped[int] = mapped_column(ForeignKey('matches.id'), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), primary_key=True)
