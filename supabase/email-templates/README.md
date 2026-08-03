# Auth email templates

Supabase generates these emails on its own servers, so they can't be styled from
the app — the HTML has to be pasted into the dashboard. It lives here so the
templates are version-controlled and reviewable rather than existing only in a
web form.

## Where each one goes

**Supabase dashboard → Authentication → Emails → Templates**

| Template in the dashboard | File | Suggested subject |
|---|---|---|
| Confirm signup | `confirm-signup.html` | Confirm your email address |
| Reset password | `reset-password.html` | Reset your Lane² password |
| Reauthentication | `reauthentication.html` | Your Lane² verification code |
| Invite user | `invite.html` | You've been invited to Lane² |
| Change email address | `change-email.html` | Confirm your new email address |
| Magic link | `magic-link.html` | Your Lane² sign-in link |

For each: open the template, paste the file's full contents into the message
body, set the subject, save.

## Which ones this app actually uses

- **Confirm signup** — every new account (the signup form in `auth-screen.tsx`).
- **Reset password** — "Forgot password" and the resend on an expired link.
- **Reauthentication** — the 6-digit code in Settings → Security, for changing a
  password without knowing the current one. This is the one that uses
  `{{ .Token }}` rather than a link.

`invite`, `change-email` and `magic-link` aren't wired up yet; they're included
so the set is consistent if those flows get switched on later.

## Template variables

Supabase substitutes these before sending. Don't rename them.

| Variable | Meaning |
|---|---|
| `{{ .ConfirmationURL }}` | The action link. Honours `emailRedirectTo`, falling back to Site URL. |
| `{{ .Token }}` | 6-digit one-time code (reauthentication / OTP). |
| `{{ .TokenHash }}` | Hashed token, for building your own verification URL. |
| `{{ .SiteURL }}` | The project's configured Site URL. |
| `{{ .Email }}` | Current address of the recipient. |
| `{{ .NewEmail }}` | The requested new address (change-email only). |

## Notes on the markup

Written for email clients, not browsers — they are twenty years behind:

- **Tables for layout.** Flexbox and grid don't render in Outlook.
- **Inline styles.** Several clients strip `<style>` blocks; every rule that
  matters is inline, and the `<style>` block only adds the dark-mode and
  small-screen refinements that are safe to lose.
- **No images.** Most clients block remote images by default, so the logo is a
  styled table cell with a letter in it — it always renders, and there's no
  asset to host or break.
- **Visible fallback URL.** Some corporate gateways rewrite or strip buttons,
  so the raw link is also shown as selectable text.
- **A preheader.** The hidden line at the top controls the grey preview text in
  the inbox list instead of leaving the client to pick the first words it finds.
- **Dark mode.** `prefers-color-scheme` overrides, with the light inline styles
  as the fallback for clients that ignore them.

## Before you rely on these

Send yourself one of each and check it in whatever the agency actually uses —
Gmail web, Gmail on a phone, and Outlook if anyone is on it. Outlook's rendering
engine is the one that surprises people.

## Related: sender address

The stock emails arrive from `noreply@mail.app.supabase.io`, which looks
generic and is more likely to be filtered as spam. To send from your own domain,
configure a custom SMTP provider under **Authentication → Emails → SMTP
Settings**. Supabase's built-in sender is also rate-limited, so a real provider
is worth setting up before onboarding a team.
