/*
PURPOSE: Manages the user's authentication state on the client side.
CONTENTS:
- Helper functions to interact with the browser's localStorage or sessionStorage 
  (e.g., saving the username and a JWT/session token after a successful login).
- Exported function isLoggedIn(): boolean that main.ts can use to decide whether 
  to show the Home screen or bypass directly to a Lobby.
- Exported function logout(): void that clears local storage and redirects to Home.
- Exported function getCurrentUser(): UserObject to easily grab the player's ID 
  when sending data to the Flask server.
*/