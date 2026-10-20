---
name: drazen-dashboard
description: Build the person a custom local comment-to-DM dashboard on top of their Drazen connection. Use when they want their own dashboard, control panel or admin UI for Drazen automations on localhost, designed their way.
---

# Build their own Drazen dashboard

The person owns their Drazen connection — they can have any dashboard they
want. You build it for them, locally, their taste.

Ground rules:

- All data comes from the CLI: `{{DRAZEN_CLI}} tool <name> --args '...'`
  (list it with `{{DRAZEN_CLI}} tool`). Shell out to it from the server side
  of whatever you build. NEVER read ~/.drazen/config.json or embed the
  token in frontend code.
- Keep it on localhost. Don't deploy their token anywhere.
- Start simple: one page that lists automations with status + DM counts,
  a form to create one (post picker from `list_posts`, trigger word, DM
  text), and live/pause buttons. A plain Node server with no dependencies
  is plenty; use whatever stack they prefer.
- Create paused, activate on an explicit click — same rule as everywhere.
- Ask what THEY want it to look like before you build. It's their dashboard.
