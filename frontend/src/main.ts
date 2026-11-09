import { apiMe, apiGetLobby, apiSetUserRole, ApiError } from './api';
import { saveUser, logout, getCurrentUser } from './auth';
import { errorText, escapeHtml } from './ui';
import { renderHome } from './screens/renderHome';
import { renderLobby, stopLobbyPolling } from './screens/renderLobby';
import { renderDrawPhase } from './screens/renderDrawPhase';
import { renderGuessPhase } from './screens/renderGuessPhase';
import { renderScorecard } from './screens/renderScorecard';
import { renderModerator } from './screens/renderModerator';

export type ScreenName = 'home' | 'lobby' | 'draw' | 'guess' | 'scorecard' | 'moderator';

let activeMatchId = 1;
let activeScreen: ScreenName = 'home';
let cleanups: Array<() => void> = [];

export function onScreenLeave(cleanup: () => void): void {
    cleanups.push(cleanup);
}

export function isScreenActive(screen: ScreenName): boolean {
    return activeScreen === screen;
}

function showError(error: unknown): void {
    const root = document.getElementById('app-root');
    if (root) {
        const message = document.createElement('p');
        message.className = 'alert alert-danger mx-auto';
        message.style.maxWidth = '540px';
        message.textContent = errorText(error);
        root.prepend(message);
    }
}

export function setActiveMatchId(id: number): void {
    activeMatchId = id;
}

export function getActiveMatchId(): number {
    return activeMatchId;
}

export function navigateTo(screen: ScreenName): void {
    stopLobbyPolling();
    cleanups.forEach(cleanup => cleanup());
    cleanups = [];
    activeScreen = screen;

    const root = document.getElementById('app-root');
    if (!root) return;

    root.innerHTML = '';

    const user = getCurrentUser();

    // Render the temporary Demo Role Toggle bar whenever a user is logged in
    if (user) {
        const isModerator = user.role === 'moderator';
        const demoBar = document.createElement('div');
        demoBar.className = 'd-flex justify-content-between align-items-center bg-dark text-light border border-secondary rounded p-3 mb-4 mx-auto';
        demoBar.style.maxWidth = '540px';
        demoBar.innerHTML = `
            <div class="d-flex align-items-center gap-2">
                <span class="fw-bold">${escapeHtml(user.username)}</span>
                <span class="badge" style="background-color: ${isModerator ? '#E50914' : '#6c757d'};">
                    ${isModerator ? 'Moderator' : 'Normal Player'}
                </span>
            </div>
            <div class="form-check form-switch m-0">
                <input class="form-check-input" type="checkbox" role="switch" id="role-toggle-switch" ${isModerator ? 'checked' : ''}>
                <label class="form-check-label small text-warning" for="role-toggle-switch">
                    Moderator Mode
                </label>
            </div>
        `;
        root.appendChild(demoBar);

        const toggle = demoBar.querySelector('#role-toggle-switch') as HTMLInputElement;
        toggle.addEventListener('change', async () => {
            try {
                const newRole = toggle.checked ? 'moderator' : 'player';
                const updatedUser = await apiSetUserRole(newRole);
                saveUser(updatedUser);
                navigateTo('home');
            } catch (error) {
                toggle.checked = !toggle.checked;
                showError(error);
            }
        });
    }

    // Create dedicated container for the active screen so the top bar isn't overwritten
    const screenContainer = document.createElement('div');
    root.appendChild(screenContainer);

    // Only poll match membership during active in-game phases (not on 'home', 'moderator', or 'lobby')
    if (screen === 'draw' || screen === 'guess' || screen === 'scorecard') {
        let checking = false;
        const timer = window.setInterval(async () => {
            if (checking) return;
            checking = true;
            try {
                await apiGetLobby(activeMatchId);
            } catch (error) {
                if (activeScreen === 'home' || activeScreen === 'moderator') return;
                if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
                    if (error.status === 401) logout();
                    navigateTo('home');
                    showError(error);
                }
            } finally {
                checking = false;
            }
        }, 2000);
        onScreenLeave(() => clearInterval(timer));
    }

    switch (screen) {
        case 'home':
            renderHome(screenContainer);
            break;
        case 'lobby':
            void renderLobby(screenContainer, activeMatchId).catch(showError);
            break;
        case 'draw':
            void renderDrawPhase(screenContainer, activeMatchId).catch(showError);
            break;
        case 'guess':
            void renderGuessPhase(screenContainer, activeMatchId).catch(showError);
            break;
        case 'scorecard':
            void renderScorecard(screenContainer, activeMatchId).catch(showError);
            break;
        case 'moderator':
            void renderModerator(screenContainer).catch(showError);
            break;
    }
}

async function boot(): Promise<void> {
    try {
        saveUser(await apiMe());
    } catch {
        logout();
    }
    navigateTo('home');
}
void boot();