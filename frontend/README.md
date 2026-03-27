# Frontend — Phone Verification App

React + TypeScript + Vite UI for Howard University’s phone verification and survey enrollment study.

## Documentation

- **[Root README](../README.md)** — quick start, architecture, deployment
- **[Frontend design](../design-docs/frontend-design.md)** — pages, routing, API usage, workflows

## Scripts

```bash
npm install
npm run dev      # dev server (see vite.config.ts for proxy/port)
npm run build    # production build → dist/
npm run lint
```

Configuration for API base URL in production is via **`VITE_API_BASE_URL`** when applicable.

The default Vite template ESLint notes below are **optional**; this project’s lint rules live in `eslint.config.js`.

---

<details>
<summary>Original Vite + React ESLint template notes (optional)</summary>

If you are developing a production application, consider enabling type-aware lint rules:

- Set top-level `parserOptions.project` to `['./tsconfig.node.json', './tsconfig.app.json']` and `tsconfigRootDir: import.meta.dirname`.
- Consider `tseslint.configs.recommendedTypeChecked` or `strictTypeChecked`, and optionally `eslint-plugin-react`.

</details>
