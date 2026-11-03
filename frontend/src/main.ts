/*
PURPOSE: The core state machine and router for the client side.
CONTENTS:
- Tracks global state (e.g., currentUserId, currentMatchId, currentRole).
- Contains the navigation logic. Instead of loading new HTML pages, this file clears 
  document.getElementById('app-root') and calls functions from the /screens directory 
  to build the requested UI.
- Listens for global events (like an expired session kicking the user back to home).
*/

import { renderHome } from './screens/renderHome';
import { renderLobby } from './screens/renderLobby';
import { renderDrawPhase } from './screens/renderDrawPhase';
import { renderGuessPhase } from './screens/renderGuessPhase';
import { renderScorecard } from './screens/renderScorecard';

export type ScreenName = 'home' | 'lobby' | 'draw' | 'guess' | 'scorecard';

let activeMatchId = 1;

export function setActiveMatchId(id: number): void {
    activeMatchId = id;
}

export function getActiveMatchId(): number {
    return activeMatchId;
}

export function navigateTo(screen: ScreenName): void {
    const root = document.getElementById('app-root');
    if (!root) return;

    root.innerHTML = '';

    switch (screen) {
        case 'home':
            renderHome(root);
            break;
        case 'lobby':
            renderLobby(root, activeMatchId);
            break;
        case 'draw':
            renderDrawPhase(root, activeMatchId);
            break;
        case 'guess':
            renderGuessPhase(root, activeMatchId);
            break;
        case 'scorecard':
            renderScorecard(root, activeMatchId);
            break;
    }
}

navigateTo('home');