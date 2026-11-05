import { User } from './types';

const STORAGE_KEY = 'pictionary_user';

export function saveUser(user: User): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function getCurrentUser(): User | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
}

export function logout(): void {
    localStorage.removeItem(STORAGE_KEY);
}