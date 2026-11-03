/*
PURPOSE: The dedicated bridge between the frontend and the Flask backend.
CONTENTS:
- Contains all fetch() calls. No fetch() should appear anywhere else in the project.
- Exported functions like:
  - submitDrawings(matchId: string, b64Images: string[]): Promise<boolean>
  - fetchMatchStatus(matchId: string): Promise<MatchState>
- Handles parsing JSON responses and catching HTTP errors (like 401 Unauthorized or 500 Server Error).
*/