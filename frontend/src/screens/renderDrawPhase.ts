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