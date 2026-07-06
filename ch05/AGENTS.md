# Repository Guidelines

## Project Structure & Module Organization

This chapter is a small Node.js ESM application for a real-estate transaction lookup example. The HTTP server, API validation, mock transaction fetcher, and static-file routing live in `server.js`. Browser assets are under `public/`: `index.html`, `styles.css`, and `app.js`. Tests live beside the server in `server.test.js` and import exported functions directly from `server.js`. `PROMPTS.md` contains chapter prompt material and is not part of runtime behavior.

## Build, Test, and Development Commands

- `npm start`: runs `node server.js` and serves the app at `http://localhost:3000` unless `PORT` is set.
- `npm test`: runs the built-in Node test runner with `node --test`.
- `PORT=4000 npm start`: starts the server on an alternate local port.

There is no build step or bundler; edit files directly and refresh the browser.

## Coding Style & Naming Conventions

Use modern JavaScript modules (`import`/`export`) and keep server-side helpers exportable when tests need direct access. Follow the existing style: two-space indentation, semicolons, single quotes, `const` by default, and descriptive camelCase names such as `validateQuery`, `fetchTransactions`, and `handleStatic`. Keep public API responses structured with explicit `status`, `summary`, and `items` fields. Prefer small functions with clear boundaries between validation, data fetching, routing, and response formatting.

## Testing Guidelines

Tests use `node:test` with `node:assert/strict`. Add or update tests in `server.test.js` when changing query validation, transaction status handling, or response shape. Name tests by observable behavior, for example `it('rejects invalid input before API work', ...)`. Use environment-object injection, as `fetchTransactions(query, env)` already does, instead of mutating global `process.env` in tests.

## Commit & Pull Request Guidelines

Recent commits use short, imperative summaries, often prefixed by chapter scope such as `ch17:` or by maintenance scope such as `chore:`. For this chapter, prefer messages like `ch05: add transaction validation test` or `ch05: update lookup UI`. Pull requests should describe the user-visible change, list test commands run, and include screenshots when `public/` UI behavior changes. Note any required environment variables, especially `PUBLIC_DATA_API_KEY`.

## Security & Configuration Tips

Keep `PUBLIC_DATA_API_KEY` server-only. Do not place it in `public/` files or commit local secret files. Use mock flags such as `MOCK_EMPTY=true` and `MOCK_API_FAILURE=true` for local state testing.
