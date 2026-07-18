# Jezztify hobby gallery

The homepage is generated from project folders so the collection grows automatically. Each first-level folder under `vibe-coding` (such as `games` or `tools`) becomes a gallery section. Each card's eyebrow contains the immediate project folder beneath its category, such as `flight-simulator` under `games`.

## Add a project

1. Create a working folder under a category, for example `vibe-coding/space/Qwen-asteroids/`. Cards show `VIBE CODING / SPACE` as the eyebrow and `Qwen Asteroids` as the heading.
2. Put one or more `.html` files and their supporting files inside the working folder. The generator recursively scans all folders and creates one card per HTML file, so sibling apps such as `flight-simulator/qwen3.6-27b-mtp.html` and `flight-simulator/qwen3.6-27b-claude-opus-deepseek-distilled-imatrix-mtp.html` are shown separately.
3. Optionally add a `project.json` file:

```json
{
  "title": "My project",
  "description": "A short description shown on the gallery card.",
  "category": "Experiment"
}
```

An image placed directly in the folder (`jpg`, `jpeg`, `png`, `gif`, `webp`, or `avif`) is used as the card preview. Run `npm run build` to update the homepage locally. The GitHub Actions workflow rebuilds and commits the homepage whenever changes land on `main`.

The homepage search indexes project paths, filenames, and text in HTML, JavaScript, CSS, JSON, Markdown, SVG, XML, and text files. Results update after one second without typing.
