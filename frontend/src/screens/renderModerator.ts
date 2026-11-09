import { escapeHtml, errorText } from '../ui';
import { apiGetWords, apiSetWords, WordBankItem } from '../api';
import { getCurrentUser } from '../auth';
import { navigateTo } from '../main';

export async function renderModerator(container: HTMLElement): Promise<void> {
    const user = getCurrentUser();
    if (!user || user.role.toLowerCase() !== 'moderator') {
        navigateTo('home');
        return;
    }

    let wordList: WordBankItem[] = [];
    try {
        const res = await apiGetWords();
        wordList = res.words;
    } catch (error) {
        container.innerHTML = `<div class="alert alert-danger">${escapeHtml(errorText(error))}</div>`;
        return;
    }

    container.innerHTML = `
        <div class="card bg-dark text-light border-secondary p-4 mx-auto" style="max-width: 600px;">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h4 class="m-0">Moderator Word Bank</h4>
                <button id="back-home-btn" class="btn btn-sm btn-outline-secondary">Back</button>
            </div>
            <p class="small text-secondary mb-3">
                Manage 1–50 clues and assign each a difficulty tier for future matches.
            </p>

            <!-- Add New Word Bar -->
            <div class="d-flex gap-2 mb-4 p-3 rounded border border-secondary" style="background-color: #181a1b;">
                <input
                    id="new-word-input"
                    type="text"
                    class="form-control bg-dark text-light border-secondary"
                    placeholder="Type a new word..."
                    maxlength="100"
                />
                <select id="new-word-difficulty" class="form-select bg-dark text-light border-secondary" style="max-width: 140px;">
                    <option value="1" selected>Easy</option>
                    <option value="2">Medium</option>
                    <option value="3">Hard</option>
                </select>
                <button id="add-word-btn" type="button" class="btn btn-outline-light fw-bold px-3">
                    + Add
                </button>
            </div>

            <!-- Word Boxes Container -->
            <div id="word-boxes-list" class="d-flex flex-column gap-2 mb-3" style="max-height: 380px; overflow-y: auto;"></div>

            <p id="word-bank-status" class="small m-0 mb-2"></p>

            <button
                id="save-word-bank-btn"
                type="button"
                class="btn w-100 fw-bold py-2"
                style="background-color: #dc3545; color: white; border: none;"
            >
                Save Word Bank
            </button>
        </div>
    `;

    const listEl = document.getElementById('word-boxes-list') as HTMLElement;
    const statusEl = document.getElementById('word-bank-status') as HTMLElement;
    const newWordInput = document.getElementById('new-word-input') as HTMLInputElement;
    const newWordDiff = document.getElementById('new-word-difficulty') as HTMLSelectElement;

    function renderWordBoxes(): void {
        if (wordList.length === 0) {
            listEl.innerHTML = `<div class="text-center text-secondary py-3 border border-secondary rounded">No words in the list. Add at least one word above.</div>`;
            return;
        }

        listEl.innerHTML = wordList.map((item, index) => `
            <div class="d-flex align-items-center gap-2 p-2 rounded border border-secondary" style="background-color: #1f2224;" data-index="${index}">
                <input
                    type="text"
                    class="form-control form-control-sm bg-dark text-light border-secondary word-text-input fw-bold"
                    value="${escapeHtml(item.word)}"
                    maxlength="100"
                    required
                />
                <select class="form-select form-select-sm bg-dark text-light border-secondary word-diff-select" style="max-width: 130px;">
                    <option value="1" ${item.difficulty === 1 ? 'selected' : ''}>Easy</option>
                    <option value="2" ${item.difficulty === 2 ? 'selected' : ''}>Medium</option>
                    <option value="3" ${item.difficulty === 3 ? 'selected' : ''}>Hard</option>
                </select>
                <button type="button" class="btn btn-sm btn-outline-danger remove-word-btn px-2" title="Remove word">
                    &times;
                </button>
            </div>
        `).join('');

        // Sync edits in text inputs back to state array
        listEl.querySelectorAll('.word-text-input').forEach((input, idx) => {
            input.addEventListener('input', (e) => {
                wordList[idx].word = (e.target as HTMLInputElement).value;
            });
        });

        // Sync edits in difficulty dropdowns back to state array
        listEl.querySelectorAll('.word-diff-select').forEach((select, idx) => {
            select.addEventListener('change', (e) => {
                wordList[idx].difficulty = Number((e.target as HTMLSelectElement).value) as 1 | 2 | 3;
            });
        });

        // Remove word box
        listEl.querySelectorAll('.remove-word-btn').forEach((btn, idx) => {
            btn.addEventListener('click', () => {
                wordList.splice(idx, 1);
                renderWordBoxes();
            });
        });
    }

    function handleAddWord(): void {
        const trimmed = newWordInput.value.trim();
        if (!trimmed) return;

        const diff = Number(newWordDiff.value) as 1 | 2 | 3;
        const exists = wordList.some(w => w.word.toLowerCase() === trimmed.toLowerCase());
        if (exists) {
            statusEl.className = 'small text-warning mb-2';
            statusEl.textContent = `"${trimmed}" is already in the list.`;
            return;
        }

        wordList.unshift({ word: trimmed, difficulty: diff });
        newWordInput.value = '';
        statusEl.textContent = '';
        renderWordBoxes();
    }

    document.getElementById('add-word-btn')?.addEventListener('click', handleAddWord);
    newWordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddWord();
        }
    });

    document.getElementById('back-home-btn')?.addEventListener('click', () => {
        navigateTo('home');
    });

    document.getElementById('save-word-bank-btn')?.addEventListener('click', async () => {
        const cleaned = wordList
            .map(item => ({ word: item.word.trim(), difficulty: item.difficulty }))
            .filter(item => item.word.length > 0);

        try {
            const res = await apiSetWords(cleaned);
            wordList = res.words;
            renderWordBoxes();
            statusEl.className = 'small text-success mb-2';
            statusEl.textContent = `Saved ${res.words.length} words to the global word bank.`;
        } catch (error) {
            statusEl.className = 'small text-danger mb-2';
            statusEl.textContent = errorText(error);
        }
    });

    renderWordBoxes();
}