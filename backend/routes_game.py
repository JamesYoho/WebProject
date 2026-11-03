"""
PURPOSE: Manages the Jackbox-style game state and HTTP API endpoints.
CONTENTS:
- Endpoints for match lifecycle: /api/match/create, /api/match/join.
- State polling endpoints: /api/match/<id>/status (so the frontend knows when everyone is ready).
- Data ingestion: /api/match/<id>/submit_drawings (accepts the array of 5 Base64 strings).
- Data retrieval: /api/match/<id>/get_drawings (sends the drawings to the guesser).
- Data submission: /api/match/<id>/submit_guesses (evaluates if the guess matches the prompt).
"""

import random
import string
from flask import Blueprint, request, jsonify
from models import db, Match, Participant, Prompt, Drawing, Guess, MatchStatus, GameRole

game_bp = Blueprint('game', __name__, url_prefix='/api')

def generate_room_code() -> str:
    return ''.join(random.choices(string.ascii_uppercase, k=4))

@game_bp.route('/match/create', methods=['POST'])
def create_match():
    data = request.get_json()
    user_id = data.get('userId')

    match = Match(room_code=generate_room_code(), status=MatchStatus.LOBBY)
    db.session.add(match)
    db.session.flush()

    participant = Participant(
        user_id=user_id,
        match_id=match.id,
        team_id=1,
        game_role=GameRole.DRAWER
    )
    db.session.add(participant)
    db.session.commit()

    return get_lobby(match.id)

@game_bp.route('/match/join', methods=['POST'])
def join_match():
    data = request.get_json()
    room_code = data.get('roomCode', '').upper().strip()
    user_id = data.get('userId')

    match = db.session.scalar(db.select(Match).filter_by(room_code=room_code))
    if not match:
        return jsonify({"error": "Room not found", "status": 404}), 404

    existing = db.session.scalar(
        db.select(Participant).filter_by(match_id=match.id, user_id=user_id)
    )
    if not existing:
        count = len(match.participants)
        team_id = 1 if count < 2 else 2
        role = GameRole.DRAWER if count % 2 == 0 else GameRole.GUESSER
        participant = Participant(
            user_id=user_id,
            match_id=match.id,
            team_id=team_id,
            game_role=role
        )
        db.session.add(participant)
        db.session.commit()

    return get_lobby(match.id)

@game_bp.route('/match/<int:match_id>/lobby', methods=['GET'])
def get_lobby(match_id: int):
    match = db.get_or_404(Match, match_id)
    participants = [
        {
            "userId": p.user_id,
            "username": p.user.username,
            "teamId": p.team_id,
            "gameRole": p.game_role.value
        }
        for p in match.participants
    ]
    return jsonify({
        "match": {
            "id": match.id,
            "roomCode": match.room_code,
            "status": match.status.value
        },
        "participants": participants
    })

@game_bp.route('/prompts', methods=['GET'])
def get_prompts():
    prompts = db.session.scalars(db.select(Prompt).limit(3)).all()
    return jsonify([
        {"id": p.id, "word": p.word, "difficulty": p.difficulty}
        for p in prompts
    ])

@game_bp.route('/match/<int:match_id>/drawings', methods=['POST'])
def submit_drawings(match_id: int):
    match = db.get_or_404(Match, match_id)
    data = request.get_json()
    drawer_id = data.get('drawerId', 1)

    for item in data.get('drawings', []):
        drawing = Drawing(
            match_id=match.id,
            drawer_id=drawer_id,
            prompt_id=item['promptId'],
            image_b64=item['imageB64']
        )
        db.session.add(drawing)

    match.status = MatchStatus.GUESSING
    db.session.commit()
    return jsonify({"status": "ok"})

@game_bp.route('/match/<int:match_id>/drawings', methods=['GET'])
def get_drawings_to_guess(match_id: int):
    drawings = db.session.scalars(
        db.select(Drawing).filter_by(match_id=match_id)
    ).all()
    return jsonify([
        {"drawingId": d.id, "imageB64": d.image_b64}
        for d in drawings
    ])

@game_bp.route('/match/<int:match_id>/guesses', methods=['POST'])
def submit_guesses(match_id: int):
    match = db.get_or_404(Match, match_id)
    data = request.get_json()
    guesser_id = data.get('guesserId', 1)

    for item in data.get('guesses', []):
        drawing = db.session.get(Drawing, item['drawingId'])
        if not drawing:
            continue
        guess_text = item['guessText'].strip()
        is_correct = guess_text.lower() == drawing.prompt.word.lower()

        existing_guess = db.session.scalar(
            db.select(Guess).filter_by(drawing_id=drawing.id)
        )
        if existing_guess:
            existing_guess.guess_text = guess_text
            existing_guess.is_correct = is_correct
        else:
            guess = Guess(
                drawing_id=drawing.id,
                guesser_id=guesser_id,
                guess_text=guess_text,
                is_correct=is_correct
            )
            db.session.add(guess)

    match.status = MatchStatus.FINISHED
    db.session.commit()
    return jsonify({"status": "ok"})

@game_bp.route('/match/<int:match_id>/results', methods=['GET'])
def get_results(match_id: int):
    match = db.get_or_404(Match, match_id)
    rounds = []
    score = 0

    for d in match.drawings:
        guess_text = d.guess.guess_text if d.guess else "(No guess)"
        is_correct = d.guess.is_correct if d.guess else False
        if is_correct:
            score += 1
        rounds.append({
            "promptWord": d.prompt.word,
            "imageB64": d.image_b64,
            "drawerUsername": d.drawer.username if d.drawer else "Drawer",
            "guesserUsername": d.guess.guesser.username if (d.guess and d.guess.guesser) else "Guesser",
            "guessText": guess_text,
            "isCorrect": is_correct
        })

    return jsonify({
        "matchId": match.id,
        "winningTeamId": 1,
        "teamScores": {"1": score},
        "rounds": rounds
    })