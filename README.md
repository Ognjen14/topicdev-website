# topicdev-website

The website of TopicDev, an independent app studio: a home page that presents every app, and a page per app with its screenshots, price and store link.

Plain HTML, CSS and a little JavaScript, with no build step. Preview it with `python -m http.server 8777` in this folder and open `http://localhost:8777/`.

| Path | What it is |
|---|---|
| `index.html` | Home: the studio, the featured app (Makimedia), all apps with filters, values, about |
| `reroll/`, `md-editor/`, `topic-finance/`, `cpp-guide/`, `python-guide/` | One page per app |
| `contact.html`, `contact.js` | Contact form, sent through Web3Forms |
| `privacy.html` | Privacy policy of the website itself |
| `404.html` | Page for missing addresses; its links start with `/` |
| `style.css` | All styles. Each app page sets its colours with a `body` class such as `app-reroll` |
| `script.js` | Screenshot galleries: thumbnails, full-size view with zoom, auto-advance |
| `filters.js` | The app filters on the home page |
| `nav.js` | The menu on phones |
| `assets/apps/<app>/` | Each app's icons and screenshots (WebP) |
| `assets/icons/` | Small interface icons, one SVG each, placed with `<span class="ico i-NAME">` |

Hosted on GitHub Pages from the `main` branch at [topicdev.com](https://topicdev.com); the `CNAME` file holds the domain, so keep it in the root.

Makimedia keeps its own site, [makimedia.org](https://makimedia.org); this site links to it.

After changing `style.css` or a script, raise the `?v=` number where pages link to it.
