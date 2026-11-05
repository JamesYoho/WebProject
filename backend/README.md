# Blitz Pictionary — admin update

## Run the backend

From this directory, create/activate a Python virtual environment, then run:

```sh
python -m pip install -r requirements.txt
python -m flask --app app create-admin admin
python app.py
```

The create-admin command asks for a password twice. It creates an admin or promotes an existing username and resets its password. Admin privileges are never granted by the public login form. Run the command again with another username to create another admin.

The existing prototype accounts used the password `password`. Use create-admin to set a new password on any existing admin account. New regular players register by entering a new username and password on the login screen. Existing users enter their existing password.

In a second terminal, run the frontend as described in its README. Use different browsers or an incognito window to test different players: tabs in the same browser profile share the login cookie.

## Hosting and word management

1. Log in as any user and choose **Host New Game**. The host automatically joins Team 1 as a drawer and remains a player.
2. Share the room code. Any logged-in user can create or join games.
3. Only admins can edit, add, or remove words in a game they have joined. Edit the word list in the lobby, one word or phrase per line. **Save Words** saves without starting. **Save Words & Start Game** saves and starts the game. Regular hosts use **Start Game**, which uses the saved word list without editing it. Default words are Cat, Sun, and Pizza.
4. Each game has its own list of 1–50 words (up to 100 characters each). Duplicate words ignoring case are removed. Word editing locks when the game starts. Each word receives the existing 10-second drawing timer.
5. Use **Kick** beside a participant in the lobby, or in **Host controls** below the game screen. Only the user who created that game can start it or kick players, regardless of their account role. The host cannot kick themselves.

Removed accounts cannot rejoin the same game, read its data, or submit drawings/guesses. Their screen returns home within about two seconds. Previously submitted work remains in the match. A removal applies to that account and game, not all games or newly created accounts.

The lobby refreshes every two seconds. The host starts the game for everyone; drawers enter drawing, guessers wait for submitted drawings. The existing prototype drawing-to-guessing flow and combined score remain; separate team scoring and synchronization across multiple drawers are still future work.

## Existing databases

Keep your existing `instance/pictionary.db` when applying the code to your own checkout. Startup adds two new tables (`match_settings` and `removed_players`) without deleting existing records. Existing matches have no owner/settings: create a new game for the admin workflow. The included database is the original empty starter database.

Login now uses a signed session cookie, and backend identity comes from that cookie rather than request user IDs. Old localStorage login data alone is no longer enough; log in again. A secret is generated in `instance/session.key`; keep it private and stable. Alternatively set `SECRET_KEY`. Use `COOKIE_SECURE=1` when serving over HTTPS. The bundled Flask debug server and Vite proxy are for local development.

## Verification

```sh
python -m unittest -v test_admin
```

Ten tests cover authorization, ownership, word validation and isolation, login/logout, kicked-player access, and host gameplay. The frontend also passes `npm run build`. Browser interaction has not been manually tested.
