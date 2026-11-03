/*
PURPOSE: The waiting room where players gather before the host starts the match.
CONTENTS:
- Injects UI showing the 4-letter Room Code so the host can share it with their partner.
- Renders a list (<ul>) of players currently in the room.
- Uses a setInterval() to poll the Flask server every 2 seconds via api.ts to check 
  who else has joined and if the Match Status has changed from 'lobby' to 'drawing'.
- When the status changes to 'drawing', it automatically clears the interval and tells 
  main.ts to transition to renderDrawPhase.ts.
*/