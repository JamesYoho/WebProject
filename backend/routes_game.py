"""
PURPOSE: Manages the Jackbox-style game state and HTTP API endpoints.
CONTENTS:
- Endpoints for match lifecycle: /api/match/create, /api/match/join.
- State polling endpoints: /api/match/<id>/status (so the frontend knows when everyone is ready).
- Data ingestion: /api/match/<id>/submit_drawings (accepts the array of 5 Base64 strings).
- Data retrieval: /api/match/<id>/get_drawings (sends the drawings to the guesser).
- Data submission: /api/match/<id>/submit_guesses (evaluates if the guess matches the prompt).
"""