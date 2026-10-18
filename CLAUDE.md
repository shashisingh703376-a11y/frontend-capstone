# AI coding assistant instructions

Use this file as project context when helping with the Frontend Capstone repository.

## Project

This is a React 19 + Vite frontend web application. Prefer clear, accessible UI, maintainable component structure, and small, focused changes.

Weekly assignments live on separate hash routes (`#/` home, `#/action-studio` for Week 6). Do not fold a new week into an existing assignment page unless the user asks.

## Working in this repo

- Match existing file structure, naming, and formatting once source files exist.
- Do not add dependencies unless they are required for the requested work.
- Keep secrets out of git. Use `.env` locally and never commit credentials.
- Do not create commits unless the user asks for one.
- Prefer updating existing files over adding new layers of abstraction.

## Frontend conventions

- Use semantic HTML and keyboard-accessible interactive elements.
- Keep styles scoped to the feature you are changing.
- Handle loading, empty, and error states for user-facing data.
- After UI, layout, routing, or client-state changes, verify the affected flow in the browser (or the closest available substitute) before considering the work done.

## When adding or changing code

1. Read nearby files first and follow their patterns.
2. Implement the smallest change that satisfies the request.
3. Update `README.md` if setup, scripts, or project structure change.
4. Leave the tree in a working state: no unused imports, no commented-out dead code.
