/*
PURPOSE: Builds the UI for the Guesser's 10-second blitz rounds.
CONTENTS:
- Prior to starting, it polls the Flask server to see if the Drawer has submitted their 5 images.
- Once the images are fetched, it injects an <img> tag and a text <input> for guessing.
- Runs a 10-second countdown timer for Image #1. 
- At 0 seconds (or if the user hits Enter), it saves the text input, clears the text box, 
  updates the <img> tag's src attribute to Image #2 (Base64 string), and restarts the timer.
- After 5 rounds, it packages all 5 guesses and POSTs them to the server via api.ts, 
  then transitions to the scoreboard.
*/

import { apiGetDrawingsToGuess, apiSubmitGuesses } from '../api';
import { getCurrentUser } from '../auth';
import { navigateTo } from '../main';
import { GuessSubmission } from '../types';

export async function renderGuessPhase(container: HTMLElement, matchId: number): Promise<void> {
    const drawings = await apiGetDrawingsToGuess(matchId);
    const user = getCurrentUser();

    if (drawings.length === 0) {
        container.innerHTML = `
            <div class="alert alert-warning text-center">
                No drawings submitted for this match yet!
                <div class="mt-3">
                    <button id="go-draw-btn" class="btn btn-danger">Draw First</button>
                </div>
            </div>
        `;
        document.getElementById('go-draw-btn')?.addEventListener('click', () => navigateTo('draw'));
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

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        guesses.push({
            drawingId: drawings[currentIndex].drawingId,
            guessText: input.value
        });

        currentIndex++;
        if (currentIndex >= drawings.length) {
            await apiSubmitGuesses({
                matchId,
                guesserId: user?.id ?? 1,
                guesses
            });
            navigateTo('scorecard');
            return;
        }

        input.value = '';
        img.src = drawings[currentIndex].imageB64;
        counter.textContent = `Guess Drawing ${currentIndex + 1} of ${drawings.length}`;
        input.focus();
    });
}