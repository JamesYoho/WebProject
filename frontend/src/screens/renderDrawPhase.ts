import { escapeHtml, errorText } from '../ui';
import { apiGetPrompts, apiSubmitDrawings } from '../api';
import { getCurrentUser } from '../auth';
import { setupCanvas, clearCanvas, extractBase64 } from '../canvas';
import { navigateTo, onScreenLeave, isScreenActive } from '../main';
import { DrawingSubmission } from '../types';

export async function renderDrawPhase(container: HTMLElement, matchId: number): Promise<void> {
    const prompts = await apiGetPrompts(matchId);
    if (!isScreenActive('draw')) return;
    const user = getCurrentUser();
    const submissions: DrawingSubmission[] = [];

    let currentIndex = 0;
    let timeLeft = 10;

    container.innerHTML = `
        <div class="text-center">
            <h3 id="prompt-header" class="mb-2">Prompt: <span class="text-danger">${escapeHtml(prompts[0]?.word ?? "")}</span></h3>
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

    let submitting = false;
    let disposed = false;
    onScreenLeave(() => { disposed = true; });
    const advanceRound = async () => {
        if (submitting || disposed) return;
        submissions.push({
            promptId: prompts[currentIndex].id,
            imageB64: extractBase64()
        });

        currentIndex++;
        if (currentIndex >= prompts.length) {
            clearInterval(timer);
            submitting = true;
            try {
            await apiSubmitDrawings({
                matchId,
                drawerId: user?.id ?? 1,
                drawings: submissions
            });
            if (!disposed) navigateTo('guess');
            } catch (error) {
                if (!disposed) {
                    alert(errorText(error));
                    navigateTo('lobby');
                }
            }
            return;
        }

        clearCanvas();
        timeLeft = 10;
        const promptHeader = document.getElementById('prompt-header');
        if (promptHeader) {
            promptHeader.innerHTML = `Prompt: <span class="text-danger">${escapeHtml(prompts[currentIndex].word)}</span>`;
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

    onScreenLeave(() => clearInterval(timer));
    document.getElementById('clear-btn')?.addEventListener('click', clearCanvas);
    document.getElementById('next-btn')?.addEventListener('click', advanceRound);
}