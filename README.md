# Make It So

A static, animated website for the creative marketing agency **Make It So**. It has no backend and no build step: plain HTML, CSS and JavaScript.

## Features

- Electric-blue hero with a warp-speed starfield, an animated robot mascot and a self-typing chat card
- Departments, mission log, process and contact sections
- Languages: English, Dutch and French (switcher in the header and footer; remembers the visitor's choice)
- Responsive layout, keyboard-friendly, respects `prefers-reduced-motion`

## Run it

Open `index.html` in a browser, or serve the folder locally:

```sh
python -m http.server 5200
```

Then visit <http://127.0.0.1:5200/>. Add `?lang=nl` or `?lang=fr` to open a specific language.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure and the inline robot mascot |
| `styles.css` | Design, layout and animations |
| `script.js` | Starfield, reveal animations, chat, menu and contact form |
| `i18n.js` | English, Dutch and French text |

## Before publishing

- Replace the placeholder figures in the hero (14 days, 24h, 0 boring decks) with real numbers.
- Replace the three sample missions with real case studies.
- Replace `hello@makeitso.studio` with your real address. The contact form only opens the visitor's mail app.
- Fonts load from Google Fonts, so an internet connection is needed for the intended typography.
