/*
PURPOSE: Builds and manages the UI specifically for the 10-second blitz drawing rounds.
CONTENTS:
- Injects the <canvas> element and timer UI into the DOM.
- Imports and attaches the canvas event listeners from canvas.ts.
- Runs a setInterval for the 10-second countdown.
- At 0 seconds, grabs the Base64 image, stores it in an array, updates the prompt text, 
  and restarts the timer.
- After 5 rounds, imports submitDrawings from api.ts and pushes the payload to the server.
*/

import { apiGetPrompts, apiSubmitDrawings } from '../api';
import { getCurrentUser } from '../auth';
import { setupCanvas, clearCanvas, extractBase64 } from '../canvas';
import { navigateTo } from '../main';
import { DrawingSubmission } from '../types';

export async function renderDrawPhase(container: HTMLElement, matchId: number): Promise<void> {
    const prompts = await apiGetPrompts();
    const user = getCurrentUser();
    const submissions: DrawingSubmission[] = [];

    let currentIndex = 0;
    let timeLeft = 10;

    container.innerHTML = `
        <div class="text-center">
            <h3 id="prompt-header" class="mb-2">Prompt: <span class="text-danger">${prompts[0]?.word}</span></h3>
            <p id="timer-display" class="fs-5">Time left: 10s (Round 1 of ${prompts.length})</p>
            <canvas id="draw-canvas" width="450" height="320" class="mb-3"></canvas>
            <div>
                <button id="clear-btn" class="btn btn-secondary me-2">Clear Canvas</button>
                <button id="next-btn" class="btn btn-danger">Save & Next Prompt</button>
            </div>
        </div>
    `;

    const canvasEl = document.getElementById('draw-canvas') as HTMLCanvasElement;
    setupCanvas(canvasEl);

    const advanceRound = async () => {
        submissions.push({
            promptId: prompts[currentIndex].id,
            imageB64: extractBase64()
        });

        currentIndex++;
        if (currentIndex >= prompts.length) {
            clearInterval(timer);
            await apiSubmitDrawings({
                matchId,
                drawerId: user?.id ?? 1,
                drawings: submissions
            });
            navigateTo('guess');
            return;
        }

        clearCanvas();
        timeLeft = 10;
        const promptHeader = document.getElementById('prompt-header');
        if (promptHeader) {
            promptHeader.innerHTML = `Prompt: <span class="text-danger">${prompts[currentIndex].word}</span>`;
        }
    };

    const timer = window.setInterval(() => {
        timeLeft--;
        const timerEl = document.getElementById('timer-display');
        if (timerEl) {
            timerEl.textContent = `Time left: ${timeLeft}s (Round ${currentIndex + 1} of ${prompts.length})`;
        }
        if (timeLeft <= 0) {
            advanceRound();
        }
    }, 1000);

    document.getElementById('clear-btn')?.addEventListener('click', clearCanvas);
    document.getElementById('next-btn')?.addEventListener('click', advanceRound);
}