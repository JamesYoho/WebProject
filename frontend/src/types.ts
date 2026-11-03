/**
 * types.ts
 * 
 * Centralized TypeScript interfaces for the Pictionary web app.
 * This guarantees the frontend expects the exact JSON structures 
 * that the Flask backend sends and receives.
 */


export type UserRole = 'player' | 'admin';

export interface User {
    id: number;
    username: string;
    role: UserRole;
}

export type MatchStatus = 'lobby' | 'drawing' | 'guessing' | 'finished';
export type GameRole = 'drawer' | 'guesser';

export interface Match {
    id: number;
    roomCode: string;
    status: MatchStatus;
}

export interface Participant {
    userId: number;
    username: string;
    teamId: number;
    gameRole: GameRole;
}

export interface LobbyState {
    match: Match;
    participants: Participant[];
}

export interface Prompt {
    id: number;
    word: string;
    difficulty: number;
}

export interface DrawingSubmission {
    promptId: number;
    imageB64: string;
}

export interface SubmitDrawingsPayload {
    matchId: number;
    drawerId: number;
    drawings: DrawingSubmission[];
}

export interface DrawingToGuess {
    drawingId: number;
    imageB64: string;
}

export interface GuessSubmission {
    drawingId: number;
    guessText: string;
}

export interface SubmitGuessesPayload {
    matchId: number;
    guesserId: number;
    guesses: GuessSubmission[];
}

export interface RoundResult {
    promptWord: string;
    imageB64: string;
    drawerUsername: string;
    guesserUsername: string;
    guessText: string;
    isCorrect: boolean;
}

export interface MatchResults {
    matchId: number;
    winningTeamId: number;
    teamScores: Record<number, number>;
    rounds: RoundResult[];
}