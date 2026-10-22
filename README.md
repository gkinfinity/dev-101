# Game Dev 101

Pseudocode practice: variables, math, comparisons, AND, OR, NOT and
IF / ELSE IF / ELSE.

Live site: https://gkinfinity.github.io/dev-101/

The site currently shows only The Dig Site, a 3D block world. The other
pages (three 2D scenarios, a warm-up and a cheat sheet) are still in the code;
set `ONLY` to `null` in `js/app.js` to bring them back.

Dig Site controls: WASD move, mouse look, hold click dig, Space jump, Esc exit.
Arrow keys look and F digs without a mouse.

Each browser saves its own answers, code, world and diamonds, so a refresh
loses nothing. Settings → Start over clears them; Reset challenges is separate.

Static site with no build step: open `index.html`, or serve the folder.
Scenarios are in `js/scenarios.js`, pictures in `js/scenes.js`, the 3D world in
`js/dig.js`.
