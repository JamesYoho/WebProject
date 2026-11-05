import { escapeHtml, errorText } from '../ui';
import { apiLogin, apiCreateMatch, apiJoinMatch, apiLogout } from '../api';
import { getCurrentUser, saveUser, logout } from '../auth';
import { navigateTo, setActiveMatchId } from '../main';

export function renderHome(container: HTMLElement): void {
    const user = getCurrentUser();

    if (!user) {
        container.innerHTML = `
            <div class="card p-4 mx-auto" style="max-width: 420px;">
                <h2 class="mb-3 text-center">Blitz Pictionary</h2>
                <form id="login-form">
                    <div class="mb-3">
                        <label class="form-label">Username</label>
                        <input id="username-input" class="form-control" required placeholder="Enter any username" />
                    </div>
                    <label class="form-label" for="password-input">Password</label>
                    <input id="password-input" type="password" class="form-control mb-3" required autocomplete="current-password" />
                    <p id="login-error" class="text-danger" role="alert"></p>
                    <button type="submit" class="btn btn-danger w-100">Login / Quick Register</button>
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

    container.innerHTML = `
        <div class="card p-4 mx-auto" style="max-width: 480px;">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h4 class="m-0">Welcome, ${escapeHtml(user.username)}</h4>
                <button id="logout-btn" class="btn btn-sm btn-outline-secondary">Logout</button>
            </div>
            <button id="host-btn" class="btn btn-danger w-100 mb-3">Host New Game</button>
            <hr />
            <form id="join-form" class="d-flex gap-2">
                <input id="room-code-input" class="form-control text-uppercase" maxlength="4" placeholder="4-Letter Code" required />
                <button type="submit" class="btn btn-primary">Join</button>
            </form>
        </div>
    `;

    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        try { await apiLogout(); } catch (error) { alert(errorText(error)); return; }
        logout();
        navigateTo('home');
    });

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