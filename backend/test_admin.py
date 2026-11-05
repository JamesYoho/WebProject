"""Run with: python -m unittest -v test_admin"""
import unittest
from flask import Flask
from werkzeug.security import generate_password_hash
from models import db, User, UserRole, Prompt, Participant, Match, MatchSettings
from routes_auth import auth_bp
from routes_game import game_bp


class AdminTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(TESTING=True, SECRET_KEY='test-only', SQLALCHEMY_DATABASE_URI='sqlite://')
        db.init_app(self.app)
        self.app.register_blueprint(auth_bp)
        self.app.register_blueprint(game_bp)
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()
        for name, role in [('host', UserRole.ADMIN), ('other', UserRole.ADMIN), ('player', UserRole.PLAYER)]:
            db.session.add(User(username=name, password_hash=generate_password_hash('test-pass'), role=role))
        db.session.add_all([Prompt(word=w) for w in ['Cat', 'Sun', 'Pizza']])
        db.session.commit()
        self.host, self.other, self.player = [self.app.test_client() for _ in range(3)]
        for client, name in [(self.host, 'host'), (self.other, 'other'), (self.player, 'player')]:
            self.send(client, '/api/auth/login', {'username': name, 'password': 'test-pass'})
        state = self.send(self.host, '/api/match/create', {}).get_json()
        self.mid = state['match']['id']
        self.code = state['match']['roomCode']
        self.base = f'/api/match/{self.mid}'
        self.send(self.player, '/api/match/join', {'roomCode': self.code})
        self.pid = db.session.scalar(db.select(User.id).filter_by(username='player'))
        self.hid = db.session.scalar(db.select(User.id).filter_by(username='host'))

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.context.pop()

    def send(self, client, path, data=None, method='POST'):
        return client.open(path, method=method, json=data, headers={'X-Pictionary-Request': '1'})

    def test_any_user_creates_game_and_host_participates(self):
        result = self.send(self.player, '/api/match/create', {'userId': self.hid})
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.get_json()['match']['ownerId'], self.pid)
        self.assertEqual(result.get_json()['participants'][0]['userId'], self.pid)
        settings = db.session.get(MatchSettings, self.mid)
        self.assertEqual(settings.owner_id, self.hid)
        self.assertIsNotNone(db.session.scalar(db.select(Participant).filter_by(match_id=self.mid, user_id=self.hid)))

    def test_anonymous_and_forged_role(self):
        anon = self.app.test_client()
        self.assertEqual(self.send(anon, '/api/match/create', {'userId': self.hid}).status_code, 401)
        result = self.send(anon, '/api/auth/login', {'username': 'admin', 'password': 'new', 'role': 'admin'})
        self.assertEqual(result.get_json()['role'], 'player')
        game = self.send(anon, '/api/match/create', {}).get_json()
        self.assertEqual(self.send(anon, f"/api/match/{game['match']['id']}/words", {'words': ['Forbidden']}, 'PUT').status_code, 403)

    def test_password_and_logout(self):
        anon = self.app.test_client()
        self.assertEqual(self.send(anon, '/api/auth/login', {'username': 'host', 'password': 'wrong'}).status_code, 401)
        self.send(self.host, '/api/auth/logout', {})
        self.assertEqual(self.host.get(self.base + '/lobby').status_code, 401)

    def test_custom_words_are_per_game(self):
        self.assertEqual(self.send(self.host, self.base+'/words', {'words': [' Dragon ', 'dragon', 'Castle']}, 'PUT').status_code, 200)
        state = self.send(self.other, '/api/match/create', {}).get_json()
        self.assertEqual(state['words'], ['Cat', 'Sun', 'Pizza'])
        self.assertEqual(self.host.get(self.base+'/lobby').get_json()['words'], ['Dragon', 'Castle'])
        self.assertEqual(self.player.get(self.base+'/lobby').get_json()['words'], [])
        self.send(self.host, self.base+'/start', {})
        self.assertEqual([p['word'] for p in self.host.get(self.base+'/prompts').get_json()], ['Dragon', 'Castle'])
        self.assertEqual(self.send(self.host, self.base+'/words', {'words': ['Late']}, 'PUT').status_code, 409)

    def test_word_validation_and_owner_only_controls(self):
        for words in [[], [''], ['a'*101], ['a']*51, 'Cat', [123]]:
            self.assertEqual(self.send(self.host, self.base+'/words', {'words': words}, 'PUT').status_code, 400)
        self.send(self.other, '/api/match/join', {'roomCode': self.code})
        self.assertEqual(self.send(self.player, self.base+'/words', {'words': ['No']}, 'PUT').status_code, 403)
        self.assertEqual(self.send(self.other, self.base+'/words', {'words': ['Allowed']}, 'PUT').status_code, 200)
        for client in [self.player, self.other]:
            self.assertEqual(self.send(client, self.base+'/start', {}).status_code, 403)
            self.assertEqual(self.send(client, self.base+f'/players/{self.pid}', method='DELETE').status_code, 403)

    def test_kick_blocks_rejoin_and_all_game_endpoints(self):
        self.assertEqual(self.send(self.host, self.base+f'/players/{self.pid}', method='DELETE').status_code, 200)
        self.assertEqual(self.send(self.player, '/api/match/join', {'roomCode': self.code}).status_code, 403)
        for endpoint in ['/lobby', '/prompts', '/drawings', '/results']:
            self.assertEqual(self.player.get(self.base+endpoint).status_code, 403)
        for endpoint in ['/drawings', '/guesses']:
            self.assertEqual(self.send(self.player, self.base+endpoint, {}).status_code, 403)
        self.assertEqual(len(self.host.get(self.base+'/lobby').get_json()['participants']), 1)

    def test_cannot_kick_self_and_can_kick_after_start(self):
        self.assertEqual(self.send(self.host, self.base+f'/players/{self.hid}', method='DELETE').status_code, 400)
        self.send(self.host, self.base+'/start', {})
        self.assertEqual(self.send(self.host, self.base+f'/players/{self.pid}', method='DELETE').status_code, 200)

    def test_host_can_play_full_round(self):
        self.send(self.host, self.base+'/words', {'words': ['Dragon']}, 'PUT')
        self.send(self.host, self.base+'/start', {})
        prompt = self.host.get(self.base+'/prompts').get_json()[0]
        self.assertEqual(self.send(self.host, self.base+'/drawings', {'drawerId': self.pid, 'drawings': [{'promptId': prompt['id'], 'imageB64': 'data:image/png;base64,test'}]}).status_code, 200)
        drawing = self.host.get(self.base+'/drawings').get_json()[0]
        self.assertEqual(self.send(self.host, self.base+'/guesses', {'guesses': [{'drawingId': drawing['drawingId'], 'guessText': 'dragon'}]}).status_code, 200)
        result = self.host.get(self.base+'/results').get_json()
        self.assertEqual(result['teamScores']['1'], 1)
        self.assertEqual(result['rounds'][0]['drawerUsername'], 'host')

    def test_regular_host_controls_and_admin_word_editing(self):
        state = self.send(self.player, '/api/match/create', {}).get_json()
        base = f"/api/match/{state['match']['id']}"
        self.assertEqual(self.send(self.player, base+'/words', {'words': ['No']}, 'PUT').status_code, 403)
        self.assertEqual(self.send(self.other, base+'/words', {'words': ['Not a member']}, 'PUT').status_code, 403)
        self.send(self.other, '/api/match/join', {'roomCode': state['match']['roomCode']})
        self.assertEqual(self.other.get(base+'/lobby').get_json()['words'], ['Cat', 'Sun', 'Pizza'])
        for words in [['Cat', 'Sun', 'Pizza', 'Dragon'], ['Cat', 'Sun', 'Castle'], ['Castle']]:
            self.assertEqual(self.send(self.other, base+'/words', {'words': words}, 'PUT').status_code, 200)
        self.assertEqual(self.send(self.player, base+'/start', {}).status_code, 200)
        self.assertEqual([p['word'] for p in self.player.get(base+'/prompts').get_json()], ['Castle'])
        oid = db.session.scalar(db.select(User.id).filter_by(username='other'))
        self.assertEqual(self.send(self.player, base+f'/players/{oid}', method='DELETE').status_code, 200)
        self.assertEqual(self.send(self.other, base+'/words', {'words': ['Removed']}, 'PUT').status_code, 403)

    def test_mutation_requires_custom_header(self):
        self.assertEqual(self.host.post('/api/match/create', json={}).status_code, 403)

if __name__ == '__main__':
    unittest.main()
