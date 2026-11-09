import { User, LobbyState, Prompt, SubmitDrawingsPayload, DrawingToGuess, SubmitGuessesPayload, MatchResults } from './types';

export class ApiError extends Error {
    constructor(message: string, public status: number) { super(message); }
}
async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const response = await fetch(`/api${path}`, {
        method, credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-Pictionary-Request': '1' },
        body: body === undefined ? undefined : JSON.stringify(body)
    });
    
    // Read as text first to avoid crashing on empty responses
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    
    if (!response.ok) throw new ApiError(data.error || 'Request failed.', response.status);
    return data as T;
}
export interface WordBankItem {
    word: string;
    difficulty: 1 | 2 | 3;
}
export const apiLogin = (username: string, password: string) => request<User>('/auth/login', 'POST', { username, password });
export const apiMe = () => request<User>('/auth/me');
export const apiLogout = () => request<void>('/auth/logout', 'POST');
export const apiCreateMatch = (_userId: number) => request<LobbyState>('/match/create', 'POST', {});
export const apiJoinMatch = (roomCode: string, _userId: number) => request<LobbyState>('/match/join', 'POST', { roomCode });
export const apiGetLobby = (id: number) => request<LobbyState>(`/match/${id}/lobby`);
export const apiGetWords = () => request<{ words: WordBankItem[] }>('/words');
export const apiSetWords = (words: WordBankItem[]) => request<{ status: string; words: WordBankItem[] }>('/words', 'PUT', { words });
export const apiKick = (id: number, userId: number) => request<void>(`/match/${id}/players/${userId}`, 'DELETE');
export const apiStart = (id: number, difficulty: number, drawTime: number) =>
    request<void>(`/match/${id}/start`, 'POST', { difficulty, drawTime });
export const apiGetPrompts = (id: number) => request<Prompt[]>(`/match/${id}/prompts`);
export const apiSubmitDrawings = (payload: SubmitDrawingsPayload) => request<void>(`/match/${payload.matchId}/drawings`, 'POST', payload);
export const apiGetDrawingsToGuess = (id: number) => request<DrawingToGuess[]>(`/match/${id}/drawings`);
export const apiSubmitGuesses = (payload: SubmitGuessesPayload) => request<void>(`/match/${payload.matchId}/guesses`, 'POST', payload);
export const apiGetResults = (id: number) => request<MatchResults>(`/match/${id}/results`);
export const apiSetUserRole = (role: 'player' | 'moderator') => request<User>('/auth/role', 'POST', { role });
