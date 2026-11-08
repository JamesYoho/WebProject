import { escapeHtml, errorText } from '../ui';
import { apiGetWords, apiSetWords } from '../api';
import { getCurrentUser } from '../auth';
import { navigateTo } from '../main';

export async function renderModerator(container: HTMLElement): Promise<void> {
    const user = getCurrentUser();
    if (!user || user.role !== 'moderator') {
        navigateTo('home');
        return;
    }

    let currentWords: string[] = [];
    try {
        const res = await apiGetWords();
        currentWords = res.words;
    } catch (error) {
        container.innerHTML = `<div class="alert alert-danger">${escapeHtml(errorText(error))}</div>`;
        return;
    }

    container.innerHTML = `
        <div class="card bg-dark text-light border-secondary p-4 mx-auto" style="max-width: 540px;">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h4 class="m-0">Edit Global Word Bank</h4>
                <button id="back-home-btn" class="btn btn-sm btn-outline-secondary">Back</button>
            </div>
            <p class="small text-secondary mb-3">
                Enter 1–50 words (one per line). All future matches hosted by players will randomly draw clues from this list.
            </p>
            <form id="word-bank-form">
                <textarea id="word-bank-textarea" class="form-control bg-dark text-light border-secondary mb-3" rows="10" required>${escapeHtml(currentWords.join('\n'))}</textarea>
                <p id="word-bank-status" class="small m-0 mb-2"></p>
                <button type="submit" class="btn w-100 fw-bold py-2" style="background-color: #E50914; color: white; border: none;">
                    Save Word Bank
                </button>
            </form>
        </div>
    `;

    document.getElementById('back-home-btn')?.addEventListener('click', () => {
        navigateTo('home');
    });

    const form = document.getElementById('word-bank-form') as HTMLFormElement;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const textarea = document.getElementById('word-bank-textarea') as HTMLTextAreaElement;
        const statusEl = document.getElementById('word-bank-status')!;

        const words = textarea.value
            .split('\n')
            .map(w => w.trim())
            .filter(w => w.length > 0);

        try {
            const res = await apiSetWords(words);
            textarea.value = res.words.join('\n');
            statusEl.className = 'small text-success mb-2';
            statusEl.textContent = `Saved ${res.words.length} words to the global word bank.`;
        } catch (error) {
            statusEl.className = 'small text-danger mb-2';
            statusEl.textContent = errorText(error);
        }
    });
}