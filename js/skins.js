// skins.js — apply data-skin to <body>. Persistence is via state.js / saveState.

const VALID = new Set(["pastel", "cyberpunk", "heroic-fantasy", "particles"]);

export function applySkin(skin) {
  if (!VALID.has(skin)) skin = "pastel";
  document.body.setAttribute("data-skin", skin);
}
