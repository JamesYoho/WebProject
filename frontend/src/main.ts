import { apiMe, apiGetLobby, apiKick, ApiError } from './api';
import { saveUser, logout, getCurrentUser } from './auth';
import { errorText, escapeHtml } from './ui';
import { renderHome } from './screens/renderHome';
import { renderLobby } from './screens/renderLobby';
import { renderDrawPhase } from './screens/renderDrawPhase';
import { renderGuessPhase } from './screens/renderGuessPhase';
import { renderScorecard } from './screens/renderScorecard';

export type ScreenName = 'home' | 'lobby' | 'draw' | 'guess' | 'scorecard';

let activeMatchId = 1;
let activeScreen: ScreenName = 'home';
let cleanups: Array<() => void> = [];
export function onScreenLeave(cleanup: () => void): void { cleanups.push(cleanup); }
export function isScreenActive(screen: ScreenName): boolean { return activeScreen === screen; }
function showError(error: unknown): void {
    const root = document.getElementById('app-root');
    if (root) {
        const message = document.createElement('p');
        message.className = 'alert alert-danger'; message.textContent = errorText(error);
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
    cleanups.forEach(cleanup => cleanup());
    cleanups = [];
    activeScreen = screen;
    document.getElementById('host-controls')?.remove();
    const root = document.getElementById('app-root');
    if (!root) return;

    root.innerHTML = '';
    if (screen !== 'home') {
        let checking = false;
        const timer = window.setInterval(async () => {
            if (checking) return;
            checking = true;
            try {
                const state = await apiGetLobby(activeMatchId);
                if (activeScreen !== screen || screen === 'lobby') return;
                if (state.match.ownerId === getCurrentUser()?.id) {
                    let panel = document.getElementById('host-controls');
                    if (!panel) {
                        panel = document.createElement('aside');
                        panel.id = 'host-controls'; panel.className = 'container pb-4';
                        document.body.append(panel);
                        panel.addEventListener('click', async event => {
                            const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-remove]');
                            if (!button) return;
                            button.disabled = true;
                            try { await apiKick(activeMatchId, Number(button.dataset.remove)); button.closest('li')?.remove(); }
                            catch (error) { showError(error); button.disabled = false; }
                        });
                    }
                    panel.innerHTML = '<h5>Host controls</h5><ul class="list-group">' + state.participants
                        .filter(p => p.userId !== state.match.ownerId)
                        .map(p => `<li class="list-group-item d-flex justify-content-between">${escapeHtml(p.username)}<button class="btn btn-sm btn-outline-danger" data-remove="${p.userId}">Kick</button></li>`).join('') + '</ul>';
                }
            }
            catch (error) {
                if (activeScreen === 'home') return;
                if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
                    if (error.status === 401) logout();
                    navigateTo('home'); showError(error);
                }
            } finally { checking = false; }
        }, 2000);
        onScreenLeave(() => clearInterval(timer));
    }

    switch (screen) {
        case 'home':
            renderHome(root);
            break;
        case 'lobby':
            void renderLobby(root, activeMatchId).catch(showError);
            break;
        case 'draw':
            void renderDrawPhase(root, activeMatchId).catch(showError);
            break;
        case 'guess':
            void renderGuessPhase(root, activeMatchId).catch(showError);
            break;
        case 'scorecard':
            void renderScorecard(root, activeMatchId).catch(showError);
            break;
    }
}

async function boot(): Promise<void> {
    try { saveUser(await apiMe()); } catch { logout(); }
    navigateTo('home');
}
void boot();
