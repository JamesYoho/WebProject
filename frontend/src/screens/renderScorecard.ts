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