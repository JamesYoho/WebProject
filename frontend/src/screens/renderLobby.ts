import { apiGetLobby, apiSetWords, apiKick, apiStart } from '../api';
import { getCurrentUser } from '../auth';
import { navigateTo, onScreenLeave, isScreenActive } from '../main';
import { escapeHtml, errorText } from '../ui';

export async function renderLobby(container: HTMLElement, matchId: number): Promise<void> {
    const lobby = await apiGetLobby(matchId);
    if (!isScreenActive('lobby')) return;
    const isOwner = lobby.match.ownerId === getCurrentUser()?.id;
    const canEditWords = getCurrentUser()?.role === 'admin';
    container.innerHTML = `
        <div class="card p-4 mx-auto" style="max-width: 620px;">
            <h2>Room: <span class="text-danger">${escapeHtml(lobby.match.roomCode)}</span></h2>
            <p>${isOwner ? 'Share this code. You also play in this game.' : 'Waiting for the host to start the game.'}</p>
            <ul id="players" class="list-group mb-3"></ul>
            ${canEditWords ? `<label for="words" class="form-label">Drawing words (one per line, 1–50 words)</label>
            <textarea id="words" class="form-control mb-2" rows="6"></textarea>
            <p class="small text-muted">This list replaces the starter words for this game. Each word gets 10 seconds.</p>
            <button id="save-words" class="btn btn-secondary mb-2">Save Words</button>` : '<p class="small text-muted">Only admins can change, add, or remove drawing words.</p>'}
            ${isOwner ? `<button id="start" class="btn btn-danger mb-2">${canEditWords ? 'Save Words & Start Game' : 'Start Game'}</button>` : ''}
            <p id="lobby-message" role="status"></p>
            <button id="home" class="btn btn-outline-light">Home</button>
        </div>`;
    const textarea = document.getElementById('words') as HTMLTextAreaElement | null;
    if (textarea) textarea.value = lobby.words.join('\n');
    const message = document.getElementById('lobby-message')!;
    let busy = false;
    const drawPlayers = (state: typeof lobby) => {
        document.getElementById('players')!.innerHTML = state.participants.map(p => `
            <li class="list-group-item d-flex justify-content-between align-items-center gap-2">
            <span>${escapeHtml(p.username)} ${p.userId === state.match.ownerId ? '(Host)' : ''}</span>
            <span>Team ${p.teamId} (${p.gameRole})</span>
            ${isOwner && p.userId !== state.match.ownerId ? `<button class="btn btn-sm btn-outline-danger" data-kick="${p.userId}">Kick</button>` : ''}</li>`).join('');
    };
    drawPlayers(lobby);
    const save = async () => {
        const words = textarea!.value.split('\n').map(w => w.trim()).filter(Boolean);
        await apiSetWords(matchId, words);
    };
    const action = async (fn: () => Promise<void>) => {
        if (busy) return;
        busy = true;
        try { await fn(); } catch (error) { message.textContent = errorText(error); }
        finally { busy = false; }
    };
    document.getElementById('save-words')?.addEventListener('click', () => action(async () => {
        await save(); message.textContent = 'Words saved.';
    }));
    document.getElementById('start')?.addEventListener('click', () => action(async () => {
        if (canEditWords) await save();
        await apiStart(matchId);
        navigateTo('draw');
    }));
    document.getElementById('players')!.addEventListener('click', event => {
        const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-kick]');
        if (!button) return;
        void action(async () => {
            await apiKick(matchId, Number(button.dataset.kick));
            const state = await apiGetLobby(matchId);
            if (isScreenActive('lobby')) { drawPlayers(state); message.textContent = 'Player removed.'; }
        });
    });
    document.getElementById('home')!.addEventListener('click', () => navigateTo('home'));
    let checking = false;
    const timer = window.setInterval(async () => {
        if (checking || busy) return;
        checking = true;
        try {
            const state = await apiGetLobby(matchId);
            if (!isScreenActive('lobby')) return;
            drawPlayers(state);
            if (state.match.status !== 'lobby') {
                const participant = state.participants.find(p => p.userId === getCurrentUser()?.id);
                navigateTo(state.match.status === 'finished' ? 'scorecard' : participant?.gameRole === 'drawer' && state.match.status === 'drawing' ? 'draw' : 'guess');
            }
        } catch (error) { if (isScreenActive('lobby')) message.textContent = errorText(error); }
        finally { checking = false; }
    }, 2000);
    onScreenLeave(() => clearInterval(timer));
}
