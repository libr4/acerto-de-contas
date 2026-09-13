# Mental Math Shooter

A mobile-first mental-arithmetic arcade game built with React, TypeScript, and Vite.

## Local development

Requires Node.js 22 or newer.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite. Other useful commands:

```bash
npm test
npm run build
npm run preview
```

## Project structure

```text
src/
  assets/
    backgrounds/   Game scenery
    sprites/       Animated sprite sheets
  components/      React UI and game components
  game/            Game rules, progression, state, and tests
docs/               Design and gameplay documentation
public/             Static files copied directly to the build
unused/             Local archive excluded from Git
```

## GitHub Pages deployment

The workflow in `.github/workflows/deploy-pages.yml` tests and builds the game, then publishes `dist/` whenever `main` is updated.

1. Create a GitHub repository and push this project to its `main` branch.
2. In the repository, open **Settings > Pages**.
3. Set **Source** to **GitHub Actions**.
4. Run the workflow or push another commit to `main`.

Vite uses relative production URLs, so the same build works at `username.github.io` or `username.github.io/repository-name` without changing the repository name in configuration.
