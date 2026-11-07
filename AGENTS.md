# AGENTS.md

## Documentation (Obsidian vault in `docs/`)

The project documentation lives in `docs/` as atomic Obsidian notes (open `docs/` as the vault, not the repo root). To avoid wasting tokens:

- Read `docs/00_Overview.md` first (technical identity card: exact stack/versions, banned dependencies, mandatory conventions), then start from `docs/Inicio.md` (MOC with a task → note table) and open **only the one note** needed for the task (see `docs/00-Como-Usar-con-IA.md`).
- Never read the whole vault or any monolithic doc. Read the source code in `src/` / `prisma/` for implementation details.
- When documentation changes, update only the affected note (schema → `docs/05-Prisma-Schema.md`, endpoints → `docs/08-API.md`, etc.). Keep notes under ~150 lines.

## Production data: NestJS Observe

This app reports its traces, errors, logs and metrics to [NestJS Observe](https://observe.nestjs.com) through `ObserveModule` in `src/app.module.ts`. Its key pair comes from `OBSERVE_APP_KEY` and `OBSERVE_APP_SECRET` in `.env`, which `npx @nestjs/observe link` writes.

When a task depends on how the app behaves in production - an error users hit, a slow endpoint, a failing job, whether a release made things worse - work from that data, not from the code alone:

- The Observe MCP server answers those questions directly: errors with their traces and logs, slow operations, jobs, and what a release changed (`find_regressions`, `diff_release`). It is included on the Pro plan and above. In Claude Code: `claude mcp add observe --transport http https://observe-api.nestjs.com/mcp`, and the client opens a browser to approve. Other clients: https://www.observe.nestjs.com/documentation/mcp
- Without it, the user can open the request or error in the Observe dashboard and click **Copy agent prompt**, which hands over that page's trace, stack and logs as text.
