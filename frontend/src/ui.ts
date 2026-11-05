export function escapeHtml(value: string): string {
    const element = document.createElement('span');
    element.textContent = value;
    return element.innerHTML;
}
export function errorText(error: unknown): string {
    return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
