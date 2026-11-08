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

    // Moderators are strictly blocked from entering game lobbies
    if (user.role === 'moderator') {
        navigateTo('moderator');
        return;
    }

    async function refreshLobby(): Promise<void> {
        // Stop polling if the user navigated away and this container is no longer in the DOM
        if (!document.body.contains(container)) {
            stopLobbyPolling();
            return;
        }

        try {
            const lobby: LobbyState = await apiGetLobby(matchId);

            // If the match has started, kill the lobby timer immediately and move to the game
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
                    <h6 class="text-secondary text-uppercase small fw-bold mb-2">Host Controls</h6>
                    <button id="start-game-btn" class="btn w-100 fw-bold py-2" style="background-color: #E50914; color: white; border: none;">
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

            document.getElementById('start-game-btn')?.addEventListener('click', async () => {
                try {
                    await apiStart(matchId);
                    stopLobbyPolling();
                    navigateTo('draw');
                } catch (error) {
                    const errEl = document.getElementById('lobby-error');
                    if (errEl) errEl.textContent = errorText(error);
                }
            });

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