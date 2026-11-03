/*
PURPOSE: Builds the initial landing page UI (Login, Register, Host, Join).
CONTENTS:
- Injects the HTML for the login/registration forms and the "Host Game" / "Join Game" inputs.
- Grabs the form elements using document.getElementById() and attaches 'submit' event listeners.
- On login submit, calls the login endpoint via api.ts, hands the result to auth.ts, 
  and tells main.ts to re-render the screen.
- On "Join Game" submit, reads the 4-letter room code from the input and calls the join API.
*/