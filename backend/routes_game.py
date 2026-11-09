import random
import string
from flask import Blueprint, request, jsonify, g, abort
from models import db, Match, Participant, Prompt, Drawing, Guess, MatchStatus, GameRole, UserRole, MatchSettings, RemovedPlayer
from sqlalchemy.sql import func

game_bp = Blueprint('game', __name__, url_prefix='/api')


def membership(match_id):
    match = db.get_or_404(Match, match_id)
    if db.session.get(RemovedPlayer, (match_id, g.user.id)):
        abort(403, description='You were removed from this game.')
    participant = db.session.scalar(db.select(Participant).filter_by(match_id=match_id, user_id=g.user.id))
    if participant is None:
        abort(403, description='Join this game first.')
    return match


def owned_game(match_id):
    match = membership(match_id)
    settings = db.session.get(MatchSettings, match_id)
    if settings is None or settings.owner_id != g.user.id:
        abort(403, description='Only this game’s host can do that.')
    return match, settings


@game_bp.before_request
def check_game_membership():
    if request.view_args and 'match_id' in request.view_args:
        membership(request.view_args['match_id'])


@game_bp.route('/words', methods=['GET'])
def get_word_bank():
    if g.user.role != UserRole.MODERATOR:
        abort(403, description='Only moderators can view and edit the word bank.')

    prompts = list(db.session.scalars(db.select(Prompt).order_by(Prompt.id)))
    return jsonify(words=[
        {"word": p.word, "difficulty": p.difficulty}
        for p in prompts
    ])

@game_bp.route('/words', methods=['PUT'])
def set_word_bank():
    if g.user.role != UserRole.MODERATOR:
        abort(403, description='Only moderators can change, add, or remove words.')

    raw_words = (request.get_json() or {}).get('words')
    if not isinstance(raw_words, list) or not 1 <= len(raw_words) <= 50:
        abort(400, description='Enter 1–50 words.')

    cleaned = []
    seen = set()
    for item in raw_words:
        if not isinstance(item, dict):
            abort(400, description='Each word entry must include a word and difficulty.')

        word = item.get('word')
        difficulty = item.get('difficulty', 1)

        if not isinstance(word, str) or not 1 <= len(word.strip()) <= 100:
            abort(400, description='Each word must contain 1–100 characters.')
        if difficulty not in (1, 2, 3):
            abort(400, description='Difficulty must be Easy (1), Medium (2), or Hard (3).')

        word = word.strip()
        key = word.casefold()
        if key not in seen:
            seen.add(key)
            cleaned.append({"word": word, "difficulty": int(difficulty)})

    cleaned_map = {item["word"].casefold(): item for item in cleaned}
    existing_prompts = list(db.session.scalars(db.select(Prompt)))
    existing_map = {p.word.casefold(): p for p in existing_prompts}

    # Hard-delete words that were removed
    for lower_word, prompt in existing_map.items():
        if lower_word not in cleaned_map:
            db.session.delete(prompt)

    # Update existing words or insert new ones
    for lower_word, item in cleaned_map.items():
        if lower_word in existing_map:
            existing_map[lower_word].word = item["word"]
            existing_map[lower_word].difficulty = item["difficulty"]
        else:
            db.session.add(Prompt(word=item["word"], difficulty=item["difficulty"]))

    db.session.commit()
    return jsonify(status='ok', words=cleaned)


@game_bp.route('/match/<int:match_id>/players/<int:user_id>', methods=['DELETE'])
def kick_player(match_id, user_id):
    match, settings = owned_game(match_id)
    if user_id == settings.owner_id:
        abort(400, description='The host stays in their game.')
    participant = db.session.scalar(db.select(Participant).filter_by(match_id=match_id, user_id=user_id))
    if participant is None:
        abort(404, description='Player not found in this game.')
    db.session.add(RemovedPlayer(match_id=match_id, user_id=user_id))
    db.session.delete(participant)
    db.session.commit()
    return jsonify(status='ok')

@game_bp.route('/match/<int:match_id>/start', methods=['POST'])
def start_match(match_id: int):
    match, settings = owned_game(match_id)
    if match.status != MatchStatus.LOBBY:
        abort(409, description='This game has already started.')

    data = request.get_json() or {}
    difficulty = int(data.get('difficulty', 1))
    draw_time = int(data.get('drawTime', 10))

    # Pick random words matching ONLY the host's selected difficulty
    ids = list(db.session.scalars(
        db.select(Prompt.id)
        .filter_by(difficulty=difficulty)
        .order_by(func.random())
        .limit(3)  # Or 5, depending on how many rounds you want
    ))

    if not ids:
        abort(400, description=f'No words found for difficulty tier {difficulty}. Add some in Moderator Mode first.')

    settings.prompt_ids = ids
    settings.difficulty = difficulty
    settings.draw_time = draw_time
    match.status = MatchStatus.DRAWING

    db.session.commit()
    return jsonify(status='ok')

def generate_room_code() -> str:
    return ''.join(random.choices(string.ascii_uppercase, k=4))

@game_bp.route('/match/create', methods=['POST'])
def create_match():
    if g.user.role == UserRole.MODERATOR:
        abort(403, description='Moderators cannot host or play in matches.')

    user_id = g.user.id
    code = generate_room_code()
    while db.session.scalar(db.select(Match).filter_by(room_code=code)):
        code = generate_room_code()

    match = Match(room_code=code, status=MatchStatus.LOBBY)
    db.session.add(match)
    db.session.flush()

    # Pull up to 5 random words from the Moderator's global Prompt table
    ids = list(db.session.scalars(db.select(Prompt.id).order_by(func.random()).limit(5)))
    db.session.add(MatchSettings(match_id=match.id, owner_id=g.user.id, prompt_ids=ids))

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
    if g.user.role == UserRole.MODERATOR:
        abort(403, description='Moderators cannot host or play in matches.')
    data = request.get_json()
    room_code = data.get('roomCode', '').upper().strip()
    user_id = g.user.id

    match = db.session.scalar(db.select(Match).filter_by(room_code=room_code))
    if not match:
        return jsonify({"error": "Room not found", "status": 404}), 404

    existing = db.session.scalar(
        db.select(Participant).filter_by(match_id=match.id, user_id=user_id)
    )
    if db.session.get(RemovedPlayer, (match.id, g.user.id)):
        abort(403, description='You were removed from this game.')
    if not existing and match.status != MatchStatus.LOBBY:
        abort(409, description='This game has already started.')
    if not existing:
        occupied = {(p.team_id, p.game_role) for p in match.participants}
        slot = 0
        while (slot // 2 + 1, GameRole.DRAWER if slot % 2 == 0 else GameRole.GUESSER) in occupied:
            slot += 1
        team_id = slot // 2 + 1
        role = GameRole.DRAWER if slot % 2 == 0 else GameRole.GUESSER
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
    settings = db.session.get(MatchSettings, match_id)
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
            "status": match.status.value,
            "ownerId": settings.owner_id if settings else None,
            "difficulty": settings.difficulty if settings else 1,
            "drawTime": settings.draw_time if settings else 10
        },
        "participants": participants
    })

@game_bp.route('/match/<int:match_id>/prompts', methods=['GET'])
def get_prompts(match_id):
    settings = db.session.get(MatchSettings, match_id)
    if settings is None:
        abort(409, description='Please create a new game.')
    if db.session.get(Match, match_id).status != MatchStatus.DRAWING:
        abort(409, description='Wait for the host to start the game.')
    prompts = [db.session.get(Prompt, pid) for pid in settings.prompt_ids]
    return jsonify([{"id": p.id, "word": p.word, "difficulty": p.difficulty} for p in prompts])


@game_bp.route('/match/<int:match_id>/drawings', methods=['POST'])
def submit_drawings(match_id: int):
    match = db.get_or_404(Match, match_id)
    data = request.get_json()
    drawer_id = g.user.id
    if match.status not in (MatchStatus.DRAWING, MatchStatus.GUESSING):
        abort(409, description='This game is not accepting drawings.')
    settings = db.session.get(MatchSettings, match_id)
    items = data.get('drawings', [])
    if not items or any(item.get('promptId') not in settings.prompt_ids for item in items):
        abort(400, description='Use this game’s prompts.')

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
    guesser_id = g.user.id

    for item in data.get('guesses', []):
        drawing = db.session.get(Drawing, item['drawingId'])
        if not drawing or drawing.match_id != match_id:
            abort(400, description="Drawing does not belong to this game.")
        guess_text = item['guessText'].strip()
        is_correct = guess_text.lower() == drawing.prompt.word.lower()

        existing_guess = db.session.scalar(
            db.select(Guess).filter_by(drawing_id=drawing.id)
        )
        if existing_guess:
            existing_guess.guesser_id = guesser_id
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