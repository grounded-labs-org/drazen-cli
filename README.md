# drazen

Set up [Drazen](https://drazen.ai) — Instagram comment-to-DM automation —
inside your AI agent with one command:

```bash
npx drazen@latest init
```

Works with Claude Code, Codex, Cursor, Gemini CLI and any agent that reads
the Agent Skills standard. After setup, just talk: "put a comment-to-DM
automation on my last post" and your agent handles it with Drazen's skills.

## What init installs

- Drazen skills into `~/.claude/skills/` and `~/.agents/skills/`
- A tiny local hook (`~/.drazen/drazen-hook.mjs`) that reminds your agent
  Drazen exists — it never touches the network and never blocks anything
- The CLI itself into `~/.drazen/cli/`
- Your config in `~/.drazen/config.json` (owner-only permissions)

Settings files are backed up before any edit, merged never overwritten.
Codex users: run `/hooks` once inside Codex to enable the hooks.

## Privacy

On signup we send your email, which agent you use, your operating system
and the Drazen version. We never send your prompts, your files or your
keys. Ask us to delete your data any time: https://drazen.ai/privacy

## Pricing

$5 a month per Instagram account, billed annually.

## Uninstall

```bash
npx drazen uninstall
```

Removes everything Drazen added, and only that.
