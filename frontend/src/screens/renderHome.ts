import { escapeHtml, errorText } from '../ui';
import { apiLogin, apiCreateMatch, apiJoinMatch, apiLogout } from '../api';
import { getCurrentUser, saveUser, logout } from '../auth';
import { navigateTo, setActiveMatchId } from '../main';

export function renderHome(container: HTMLElement): void {
    const user = getCurrentUser();

    // 1. NOT LOGGED IN
    if (!user) {
        container.innerHTML = `
            <div class="card bg-dark text-light border-secondary p-4 mx-auto" style="max-width: 420px;">
                <h2 class="mb-3 text-center fw-bold">Blitz Pictionary</h2>
                <form id="login-form">
                    <div class="mb-3">
                        <label class="form-label text-secondary">Username</label>
                        <input id="username-input" class="form-control bg-dark text-light border-secondary" required placeholder="Enter any username" />
                    </div>
                    <label class="form-label text-secondary" for="password-input">Password</label>
                    <input id="password-input" type="password" class="form-control bg-dark text-light border-secondary mb-3" required autocomplete="current-password" />
                    <p id="login-error" class="text-danger small" role="alert"></p>
                    <button type="submit" class="btn w-100 fw-bold" style="background-color: #E50914; color: white; border: none;">Login / Quick Register</button>
                </form>
            </div>
        `;

        const form = document.getElementById('login-form') as HTMLFormElement;
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = (document.getElementById('username-input') as HTMLInputElement).value;
            try {
                const password = (document.getElementById('password-input') as HTMLInputElement).value;
                const loggedInUser = await apiLogin(username, password);
                saveUser(loggedInUser);
                navigateTo('home');
            } catch (error) {
                document.getElementById('login-error')!.textContent = errorText(error);
            }
        });
        return;
    }

    // 2. LOGGED IN AS MODERATOR
    if (user.role === 'moderator') {
        container.innerHTML = `
            <div class="card bg-dark text-light border-secondary p-4 mx-auto" style="max-width: 480px;">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h4 class="m-0">Moderator: ${escapeHtml(user.username)}</h4>
                    <button id="logout-btn" class="btn btn-sm btn-outline-secondary">Logout</button>
                </div>
                <p class="small text-muted mb-4">Moderators cannot play in standard matches. Use this dashboard to manage the global word bank and review flagged drawings.</p>
                <button id="edit-word-bank-btn" class="btn w-100 fw-bold py-2" style="background-color: #E50914; color: white; border: none;">
                    Open Moderator Dashboard
                </button>
            </div>
        `;

        document.getElementById('edit-word-bank-btn')?.addEventListener('click', () => {
            navigateTo('moderator');
        });
    } 
    
    // 3. LOGGED IN AS STANDARD PLAYER
    else {
        container.innerHTML = `
            <div class="card bg-dark text-light border-secondary p-4 mx-auto" style="max-width: 480px;">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h4 class="m-0">Welcome, ${escapeHtml(user.username)}</h4>
                    <button id="logout-btn" class="btn btn-sm btn-outline-secondary">Logout</button>
                </div>
                
                <button id="host-btn" class="btn w-100 mb-4 fw-bold py-2" style="background-color: #E50914; color: white; border: none;">Host New Game</button>
                
                <form id="join-form" class="d-flex gap-2">
                    <input id="room-code-input" class="form-control bg-dark text-light border-secondary text-uppercase fw-bold" maxlength="4" placeholder="4-Letter Code" required />
                    <button type="submit" class="btn btn-secondary fw-bold px-4">Join</button>
                </form>
            </div>
        `;

        document.getElementById('host-btn')?.addEventListener('click', async () => {
            try {
                const lobby = await apiCreateMatch(user.id);
                setActiveMatchId(lobby.match.id);
                navigateTo('lobby');
            } catch (error) { alert(errorText(error)); }
        });

        document.getElementById('join-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const code = (document.getElementById('room-code-input') as HTMLInputElement).value;
            try {
                const lobby = await apiJoinMatch(code, user.id);
                setActiveMatchId(lobby.match.id);
                navigateTo('lobby');
            } catch (error) {
                alert(errorText(error));
            }
        });
    }

    // Shared Logout Event Listener (applies to both Moderator and Player views)
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        try { await apiLogout(); } catch (error) { alert(errorText(error)); return; }
        logout();
        navigateTo('home');
    });
}