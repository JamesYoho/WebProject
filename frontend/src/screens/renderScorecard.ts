/*
PURPOSE: The final reveal screen displaying how well the team performed.
CONTENTS:
- Calls api.ts to fetch the final Match Results from the Flask database.
- Iterates over the results array to dynamically build a grid or list in the DOM.
- For each round, displays: 
    1. The Target Word (what the prompt was).
    2. The Base64 Drawing (what was drawn).
    3. The Guess (what the partner typed).
    4. A visual indicator (check mark or red X) of whether they matched.
- Calculates and injects the final team score out of 5.
- Provides a "Play Again" button that routes the user back to the Home/Lobby screen.
*/

import { apiGetResults } from '../api';
import { navigateTo } from '../main';

export async function renderScorecard(container: HTMLElement, matchId: number): Promise<void> {
    const results = await apiGetResults(matchId);
    const totalScore = results.teamScores[1] ?? 0;

    const cardsHtml = results.rounds
        .map(r => `
            <div class="col-md-4 mb-3">
                <div class="card h-100 p-3 text-center">
                    <h5>Prompt: <strong>${r.promptWord}</strong></h5>
                    <img src="${r.imageB64}" class="drawing-preview mx-auto my-2 img-fluid" />
                    <p class="mb-1">Guess: <strong>${r.guessText}</strong></p>
                    <span class="badge ${r.isCorrect ? 'bg-success' : 'bg-danger'}">
                        ${r.isCorrect ? 'Correct (+1)' : 'Incorrect'}
                    </span>
                </div>
            </div>
        `)
        .join('');

    container.innerHTML = `
        <div class="text-center">
            <h2 class="mb-2">Match Scorecard</h2>
            <h4 class="text-danger mb-4">Total Score: ${totalScore} / ${results.rounds.length}</h4>
            <div class="row">${cardsHtml}</div>
            <button id="play-again-btn" class="btn btn-outline-light mt-3">Back to Home</button>
        </div>
    `;

    document.getElementById('play-again-btn')?.addEventListener('click', () => navigateTo('home'));
}