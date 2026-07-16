# Jezztify hobby gallery

The homepage is generated from project folders so the collection grows automatically.

## Add a project

1. Create a working folder under a category, for example `vibe-coding/space/Qwen-asteroids/`. Cards show `VIBE CODING / SPACE` as the eyebrow and `Qwen Asteroids` as the heading.
2. Put any `.html` file and its supporting files inside the working folder. The generator recursively scans all folders, so apps can have multiple HTML, JavaScript, CSS, and asset files. If a folder has `index.html`, it is preferred; otherwise the first HTML file is used as the preview and link.
3. Optionally add a `project.json` file:

```json
{
  "title": "My project",
  "description": "A short description shown on the gallery card.",
  "category": "Experiment"
}
```

An image placed directly in the folder (`jpg`, `jpeg`, `png`, `gif`, `webp`, or `avif`) is used as the card preview. Run `npm run build` to update the homepage locally. The GitHub Actions workflow rebuilds and commits the homepage whenever changes land on `main`.
