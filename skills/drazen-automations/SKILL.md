---
name: drazen-automations
description: Create and manage Instagram comment-to-DM automations with Drazen. Use when the person wants to auto-reply to comments, auto-DM commenters, set a trigger word on a post, run an automation on their next post, or manage existing automations. Trigger words - comment to DM, auto DM, trigger word, automation, auto reply.
---

# Drazen automations

An automation = pick a post (or "my next post"), choose trigger word(s),
write the DM. When someone comments the word, Drazen DMs them.

All actions run through the CLI tool proxy (JSON in, JSON out):

```
{{DRAZEN_CLI}} tool                  # list every available action
{{DRAZEN_CLI}} tool <name> --args '{"key": "value"}'
```

Useful actions (run `tool` with no name for the full, current list):

- `get_account` — the connected Instagram account(s)
- `list_posts` — recent posts with ids and captions, to pick from
- `list_automations` / `get_automation`
- `create_automation` — ALWAYS created paused; review with the person first
- `activate_automation` — the explicit go-live moment
- `pause_automation`, `update_automation`, `delete_automation`

## The flow that works

1. Ask what they're promoting and what word people should comment
   (suggest ONE short, memorable, uppercase word like GUIDE).
2. `list_posts` and let them pick — or offer "your next post" so it arms
   automatically the moment they publish.
3. Agree the DM message (short, friendly, one link). Drazen sends a
   link-free first DM with a button, then the link after the tap — that's
   the default and it roughly triples delivery; don't fight it.
4. `create_automation`, read it back to them, then `activate_automation`
   only when they say go.
5. Tell them it's live and that DMs land within seconds of a comment.

Keep public reply text and DM copy in THEIR voice. Short beats clever.
