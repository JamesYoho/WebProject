# Blitz Pictionary frontend

Start the Flask backend first (see backend README), then run here:

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. API requests are proxied to `http://127.0.0.1:5000`.

Create a moderator from the backend directory with:

```sh
python -m flask --app app create-moderator moderator
```

Any logged-in user can host a game, start it, and kick players while also playing. Only moderators can add, edit, or remove words in games they have joined. Words remain specific to each game and lock when it starts. Regular users log in/register with a username and password and can host or join using a room code. Existing prototype users initially used `password`.

Use different browser profiles or an incognito window for separate players. Start new matches after installing this update. Replace both frontend and backend together.

```sh
npm run build
```

Includes a TypeScript configuration so this performs type checking before building. The output in `dist` requires a deployment server routing `/api` to Flask; only the development proxy is configured here.
