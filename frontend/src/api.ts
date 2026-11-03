/*
PURPOSE: The dedicated bridge between the frontend and the Flask backend.
CONTENTS:
- Contains all fetch() calls. No fetch() should appear anywhere else in the project.
- Exported functions like:
  - submitDrawings(matchId: string, b64Images: string[]): Promise<boolean>
  - fetchMatchStatus(matchId: string): Promise<MatchState>
- Handles parsing JSON responses and catching HTTP errors (like 401 Unauthorized or 500 Server Error).
*/

import {
    User,
    LobbyState,
    Prompt,
    SubmitDrawingsPayload,
    DrawingToGuess,
    SubmitGuessesPayload,
    MatchResults
} from './types';

export async function apiLogin(username: string, password = 'password'): Promise<User> {
    const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    if (!res.ok) throw new Error('Login failed');
    return res.json();
}

export async function apiCreateMatch(userId: number): Promise<LobbyState> {
    const res = await fetch('/api/match/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
    });
    return res.json();
}

export async function apiJoinMatch(roomCode: string, userId: number): Promise<LobbyState> {
    const res = await fetch('/api/match/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, userId })
    });
    if (!res.ok) throw new Error('Room not found');
    return res.json();
}

export async function apiGetLobby(matchId: number): Promise<LobbyState> {
    const res = await fetch(`/api/match/${matchId}/lobby`);
    return res.json();
}

export async function apiGetPrompts(): Promise<Prompt[]> {
    const res = await fetch('/api/prompts');
    return res.json();
}

export async function apiSubmitDrawings(payload: SubmitDrawingsPayload): Promise<void> {
    await fetch(`/api/match/${payload.matchId}/drawings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
}

export async function apiGetDrawingsToGuess(matchId: number): Promise<DrawingToGuess[]> {
    const res = await fetch(`/api/match/${matchId}/drawings`);
    return res.json();
}

export async function apiSubmitGuesses(payload: SubmitGuessesPayload): Promise<void> {
    await fetch(`/api/match/${payload.matchId}/guesses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
}

export async function apiGetResults(matchId: number): Promise<MatchResults> {
    const res = await fetch(`/api/match/${matchId}/results`);
    return res.json();
}