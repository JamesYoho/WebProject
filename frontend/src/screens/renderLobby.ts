import { escapeHtml, errorText } from '../ui';
import { apiGetLobby, apiKick, apiStart } from '../api';
import { getCurrentUser } from '../auth';
import { navigateTo } from '../main';
import { LobbyState } from '../types';

let lobbyPollTimer: number | null = null;

export function stopLobbyPolling(): void {
    if (lobbyPollTimer !== null) {
        window.clearInterval(lobbyPollTimer);
        lobbyPollTimer = null;
    }
}

export async function renderLobby(container: HTMLElement, matchId: number): Promise<void> {
    stopLobbyPolling();

    const user = getCurrentUser();
    if (!user) {
        navigateTo('home');
        return;
    }

    if (user.role.toLowerCase() === 'moderator') {
        navigateTo('moderator');
        return;
    }

    // Stored outside refreshLobby() so the 2-second poll doesn't wipe the host's selection
    let selectedDifficulty = 1;
    let selectedDrawTime = 10;

    async function refreshLobby(): Promise<void> {
        if (!document.body.contains(container)) {
            stopLobbyPolling();
            return;
        }

        try {
            const lobby: LobbyState = await apiGetLobby(matchId);

            if (lobby.match.status === 'drawing') {
                stopLobbyPolling();
                navigateTo('draw');
                return;
            }
            if (lobby.match.status === 'guessing') {
                stopLobbyPolling();
                navigateTo('guess');
                return;
            }
            if (lobby.match.status === 'finished') {
                stopLobbyPolling();
                navigateTo('scorecard');
                return;
            }

            const isHost = lobby.match.ownerId === user!.id;

            const participantItems = lobby.participants.map(p => {
                const canKick = isHost && p.userId !== user!.id && lobby.match.status === 'lobby';
                return `
                    <li class="list-group-item bg-dark text-light border-secondary d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${escapeHtml(p.username)}</strong>
                            ${p.userId === lobby.match.ownerId ? '<span class="badge bg-warning text-dark ms-2">Host</span>' : ''}
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            <span class="badge bg-secondary">Team ${p.teamId} (${escapeHtml(p.gameRole)})</span>
                            ${canKick ? `<button class="btn btn-sm btn-outline-danger kick-btn" data-user-id="${p.userId}">Kick</button>` : ''}
                        </div>
                    </li>
                `;
            }).join('');

            const hostControlsHtml = (isHost && lobby.match.status === 'lobby') ? `
                <div class="mt-4 pt-3 border-top border-secondary">
                    <h6 class="text-secondary text-uppercase small fw-bold mb-3">Host Settings</h6>
                    <div class="d-flex gap-3 mb-3">
                        <div class="w-50">
                            <label class="form-label small text-secondary mb-1">Clue Difficulty</label>
                            <select id="setting-difficulty" class="form-select bg-dark text-light border-secondary">
                                <option value="1" ${selectedDifficulty === 1 ? 'selected' : ''}>Easy</option>
                                <option value="2" ${selectedDifficulty === 2 ? 'selected' : ''}>Medium</option>
                                <option value="3" ${selectedDifficulty === 3 ? 'selected' : ''}>Hard</option>
                            </select>
                        </div>
                        <div class="w-50">
                            <label class="form-label small text-secondary mb-1">Time per Drawing</label>
                            <select id="setting-time" class="form-select bg-dark text-light border-secondary">
                                <option value="10" ${selectedDrawTime === 10 ? 'selected' : ''}>10 Seconds</option>
                                <option value="15" ${selectedDrawTime === 15 ? 'selected' : ''}>15 Seconds</option>
                                <option value="20" ${selectedDrawTime === 20 ? 'selected' : ''}>20 Seconds</option>
                                <option value="30" ${selectedDrawTime === 30 ? 'selected' : ''}>30 Seconds</option>
                            </select>
                        </div>
                    </div>
                    <button id="start-game-btn" class="btn w-100 fw-bold py-2" style="background-color: #dc3545; color: white; border: none;">
                        Start Game
                    </button>
                </div>
            ` : `
                <p class="text-center text-secondary mt-3 mb-0">Waiting for host to start the game...</p>
            `;

            container.innerHTML = `
                <div class="card bg-dark text-light border-secondary p-4 mx-auto" style="max-width: 520px;">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h3 class="m-0">Room Code: <span class="text-warning fw-bold">${escapeHtml(lobby.match.roomCode)}</span></h3>
                        <button id="leave-lobby-btn" class="btn btn-sm btn-outline-secondary">Leave</button>
                    </div>
                    <p id="lobby-error" class="text-danger small m-0 mb-2"></p>
                    <h6 class="text-secondary mb-2">Players (${lobby.participants.length})</h6>
                    <ul class="list-group mb-2">
                        ${participantItems}
                    </ul>
                    ${hostControlsHtml}
                </div>
            `;

            document.getElementById('leave-lobby-btn')?.addEventListener('click', () => {
                stopLobbyPolling();
                navigateTo('home');
            });

            if (isHost && lobby.match.status === 'lobby') {
                const diffSelect = document.getElementById('setting-difficulty') as HTMLSelectElement | null;
                const timeSelect = document.getElementById('setting-time') as HTMLSelectElement | null;

                diffSelect?.addEventListener('change', () => {
                    selectedDifficulty = Number(diffSelect.value);
                    // Snap to recommended time for that difficulty
                    if (selectedDifficulty === 1) selectedDrawTime = 10;
                    if (selectedDifficulty === 2) selectedDrawTime = 15;
                    if (selectedDifficulty === 3) selectedDrawTime = 20;
                    if (timeSelect) timeSelect.value = String(selectedDrawTime);
                });

                timeSelect?.addEventListener('change', () => {
                    selectedDrawTime = Number(timeSelect.value);
                });

                document.getElementById('start-game-btn')?.addEventListener('click', async () => {
                    try {
                        await apiStart(matchId, selectedDifficulty, selectedDrawTime);
                        stopLobbyPolling();
                        navigateTo('draw');
                    } catch (error) {
                        const errEl = document.getElementById('lobby-error');
                        if (errEl) errEl.textContent = errorText(error);
                    }
                });
            }

            container.querySelectorAll('.kick-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const targetUserId = Number((btn as HTMLElement).dataset.userId);
                    try {
                        await apiKick(matchId, targetUserId);
                        await refreshLobby();
                    } catch (error) {
                        const errEl = document.getElementById('lobby-error');
                        if (errEl) errEl.textContent = errorText(error);
                    }
                });
            });

        } catch (error) {
            stopLobbyPolling();
            alert(errorText(error));
            navigateTo('home');
        }
    }

    await refreshLobby();
    lobbyPollTimer = window.setInterval(refreshLobby, 2000);
}