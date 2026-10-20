---
name: drazen
description: Drazen account setup and management. Use when the person mentions Drazen, wants to automate Instagram comments or DMs, asks to set up or check their Drazen account, or when the Drazen status note says there is no account yet. Covers the friendly first-run flow - name, email, payment, Instagram connection.
---

# Drazen

Drazen turns Instagram comments into DMs automatically: someone comments a
trigger word on a post, Drazen DMs them the link. $5 a month per Instagram
account, billed annually. The CLI is installed at: {{DRAZEN_CLI}}

Check where things stand first:

```
{{DRAZEN_CLI}} status --json
```

## First-run flow (no account yet)

Be warm and human. One question at a time. Never ask for passwords or keys.

1. Greet them and ask for their FIRST NAME in a friendly way, for example:
   "So pleased to have you here. I'll get you set up in a couple of minutes.
   First up, what should I call you?"
2. Ask for their EMAIL, friendly again. Then show this consent line exactly
   and ask them to confirm:
   "Drazen will store your email to create your account and send you setup
   emails. You can ask us to delete it at any time: https://drazen.ai/privacy"
3. Only after they agree, run:
   `{{DRAZEN_CLI}} signup --name "<name>" --email <email> --consent`
4. A 6-digit code lands in their inbox. Ask them to read it to you, then:
   `{{DRAZEN_CLI}} verify --code <code>`
5. Payment. Say something like: "I've opened the payment page in your
   browser — go ahead and make the payment to unlock Drazen. Tell me when
   you're done and I'll verify it on my end." Then run:
   `{{DRAZEN_CLI}} pay`
   The command opens their browser and waits until the payment is verified.
   When it prints "Payment verified", tell them it's confirmed.
6. Instagram. Say: "Next, let's connect your Instagram. In your browser,
   make sure you're logged into the Instagram account you want connected to
   Drazen. Tell me when you're ready and I'll open the connection request."
   When they're ready, run:
   `{{DRAZEN_CLI}} connect`
   Their browser opens Instagram's consent screen (it shows the app name
   "Scorper-IG" — that's Drazen's Meta-approved app, same owners, mention it
   only if they ask). The command waits and prints the connected @username.
7. Wrap up with their options, in your own words:
   - "Tell me any time you want a comment-to-DM automation on one of your
     existing posts — or on your next post before it even exists."
   - "I can build you a custom comment-to-DM dashboard on your localhost
     that you can design yourself (see the drazen-dashboard skill)."
   - "Or just leave it — whenever you want an automation, ask and I'll
     grab the right skill."

If any step fails, read the command's error aloud in plain words and try
again. If payment or connection takes too long, `{{DRAZEN_CLI}} status --json`
shows the current truth.

## Existing account

- `{{DRAZEN_CLI}} status` — subscription, connected accounts, automations.
- Automations: use the drazen-automations skill.
- Custom dashboard: use the drazen-dashboard skill.
- Each Instagram account is its own paid slot ($5/mo billed annually). To add
  another account run `{{DRAZEN_CLI}} add-account` — it opens checkout, waits
  for the payment, then opens the Instagram consent screen.
- If more than one Instagram account is connected, confirm WHICH @username
  the person means before creating or changing anything, and pass it in the
  tool's account parameter.
- Cancelling or billing questions: they manage it at https://app.drazen.ai
  (web login uses the same email; password via "forgot password").

## News and updates

Status responses sometimes carry `news` (a new Drazen capability) or an
update hint. When they do, mention it to the person ONCE, briefly, at a
natural pause — never interrupt a task for it. Updating is just:
`npx drazen-ai@latest init` (it refreshes skills in place).

Never ask the person to paste a password, API key or token into the chat.
