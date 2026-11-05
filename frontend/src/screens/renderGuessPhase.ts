import { errorText } from '../ui';
import { apiGetDrawingsToGuess, apiSubmitGuesses } from '../api';
import { getCurrentUser } from '../auth';
import { navigateTo, onScreenLeave, isScreenActive } from '../main';
import { GuessSubmission } from '../types';

export async function renderGuessPhase(container: HTMLElement, matchId: number): Promise<void> {
    const drawings = await apiGetDrawingsToGuess(matchId);
    if (!isScreenActive('guess')) return;
    const user = getCurrentUser();

    if (drawings.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Waiting for drawings…</div>';
        const timer = window.setTimeout(() => {
            if (isScreenActive('guess')) navigateTo('guess');
        }, 2000);
        onScreenLeave(() => clearTimeout(timer));
        return;
    }

    const guesses: GuessSubmission[] = [];
    let currentIndex = 0;

    container.innerHTML = `
        <div class="card p-4 mx-auto text-center" style="max-width: 500px;">
            <h4 id="guess-counter">Guess Drawing 1 of ${drawings.length}</h4>
            <div class="my-3">
                <img id="guess-img" src="${drawings[0].imageB64}" class="drawing-preview img-fluid" alt="Drawing to guess" />
            </div>
            <form id="guess-form" class="d-flex gap-2">
                <input id="guess-input" class="form-control" placeholder="Type your guess..." required autofocus />
                <button type="submit" class="btn btn-danger">Submit</button>
            </form>
        </div>
    `;

    const form = document.getElementById('guess-form') as HTMLFormElement;
    const input = document.getElementById('guess-input') as HTMLInputElement;
    const img = document.getElementById('guess-img') as HTMLImageElement;
    const counter = document.getElementById('guess-counter') as HTMLElement;

    let submitting = false;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (submitting) return;
        guesses.push({
            drawingId: drawings[currentIndex].drawingId,
            guessText: input.value
        });

        currentIndex++;
        if (currentIndex >= drawings.length) {
            submitting = true;
            try {
            await apiSubmitGuesses({
                matchId,
                guesserId: user?.id ?? 1,
                guesses
            });
            if (isScreenActive('guess')) navigateTo('scorecard');
            } catch (error) {
                if (isScreenActive('guess')) { alert(errorText(error)); navigateTo('lobby'); }
            }
            return;
        }

        input.value = '';
        img.src = drawings[currentIndex].imageB64;
        counter.textContent = `Guess Drawing ${currentIndex + 1} of ${drawings.length}`;
        input.focus();
    });
}