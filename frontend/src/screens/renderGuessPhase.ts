/*
PURPOSE: Builds the UI for the Guesser's 10-second blitz rounds.
CONTENTS:
- Prior to starting, it polls the Flask server to see if the Drawer has submitted their 5 images.
- Once the images are fetched, it injects an <img> tag and a text <input> for guessing.
- Runs a 10-second countdown timer for Image #1. 
- At 0 seconds (or if the user hits Enter), it saves the text input, clears the text box, 
  updates the <img> tag's src attribute to Image #2 (Base64 string), and restarts the timer.
- After 5 rounds, it packages all 5 guesses and POSTs them to the server via api.ts, 
  then transitions to the scoreboard.
*/