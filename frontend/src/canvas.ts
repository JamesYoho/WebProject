/*
PURPOSE: Isolates all complex HTML5 Canvas mathematics and event listeners.
CONTENTS:
- Logic to track mousedown, mousemove, and mouseup (or touch equivalents) to draw paths.
- Functions to change stroke color or brush size.
- Exported helper function extractBase64(): string that grabs the current canvas state.
- Exported helper function clearCanvas(): void that resets the board for the next 10-second blitz prompt.
*/

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let isDrawing = false;

export function setupCanvas(canvasElement: HTMLCanvasElement): void {
    canvas = canvasElement;
    ctx = canvas.getContext('2d');
    if (!ctx) return;

    clearCanvas();

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    const startDraw = (e: MouseEvent) => {
        if (!ctx || !canvas) return;
        isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    };

    const draw = (e: MouseEvent) => {
        if (!isDrawing || !ctx || !canvas) return;
        const rect = canvas.getBoundingClientRect();
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
    };

    const endDraw = () => {
        isDrawing = false;
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', endDraw);
}

export function clearCanvas(): void {
    if (!ctx || !canvas) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

export function extractBase64(): string {
    return canvas ? canvas.toDataURL('image/png') : '';
}