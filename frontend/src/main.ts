/*
PURPOSE: The core state machine and router for the client side.
CONTENTS:
- Tracks global state (e.g., currentUserId, currentMatchId, currentRole).
- Contains the navigation logic. Instead of loading new HTML pages, this file clears 
  document.getElementById('app-root') and calls functions from the /screens directory 
  to build the requested UI.
- Listens for global events (like an expired session kicking the user back to home).
*/