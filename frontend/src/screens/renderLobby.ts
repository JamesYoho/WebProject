/*
PURPOSE: The waiting room where players gather before the host starts the match.
CONTENTS:
- Injects UI showing the 4-letter Room Code so the host can share it with their partner.
- Renders a list (<ul>) of players currently in the room.
- Uses a setInterval() to poll the Flask server every 2 seconds via api.ts to check 
  who else has joined and if the Match Status has changed from 'lobby' to 'drawing'.
- When the status changes to 'drawing', it automatically clears the interval and tells 
  main.ts to transition to renderDrawPhase.ts.
*/

import { apiGetLobby } from '../api';
import { navigateTo } from '../main';

export async function renderLobby(container: HTMLElement, matchId: number): Promise<void> {
    const lobby = await apiGetLobby(matchId);

    const playerRows = lobby.participants
        .map(p => `<li class="list-group-item d-flex justify-content-between">
            <span>${p.username}</span>
            <span class="badge bg-secondary">Team ${p.teamId} (${p.gameRole})</span>
        </li>`)
        .join('');

    container.innerHTML = `
        <div class="card p-4 mx-auto text-center" style="max-width: 520px;">
            <h2>Lobby Room Code: <span class="text-danger">${lobby.match.roomCode}</span></h2>
            <p class="text-muted">Share this code or test the phases directly below:</p>
            <ul class="list-group mb-4">${playerRows}</ul>
            <div class="d-flex gap-2 justify-content-center">
                <button id="start-draw-btn" class="btn btn-danger">Start Draw Phase</button>
                <button id="start-guess-btn" class="btn btn-warning">Go to Guess Phase</button>
                <button id="back-home-btn" class="btn btn-outline-light">Home</button>
            </div>
        </div>
    `;

    document.getElementById('start-draw-btn')?.addEventListener('click', () => navigateTo('draw'));
    document.getElementById('start-guess-btn')?.addEventListener('click', () => navigateTo('guess'));
    document.getElementById('back-home-btn')?.addEventListener('click', () => navigateTo('home'));
}