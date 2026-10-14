# Admins and roles

**Admins** (visible to the `admin` role only).

## Roles

| Role | Sees | Changes |
|---|---|---|
| `admin` | everything | everything: service operations, console admins, own account |
| `viewer` | everything | only their own account (password, 2FA, theme, language) |

Viewers get no write buttons; if a call is forced, the API answers `403 FORBIDDEN "viewers cannot change anything"`. Use viewers for support staff who need to look but not touch.

## Add an admin

**Add admin** → username (`a-z`, `0-9`, `.`, `_`, `-`, up to 64 characters, stored lower-cased), optional name (defaults to the username), password (any non-empty password up to 256 characters), role. Hand the password over through a secure channel and ask the person to change it and enable 2FA on first sign-in.

## Change role, disable, unlock, set password, delete

Buttons per row. Rules the console enforces:

- You cannot demote, disable or delete **your own** account.
- The **last active administrator** cannot be demoted, disabled or deleted (`409 LAST_ADMIN`).
- Usernames are unique regardless of case (`409 USERNAME_TAKEN`). Accounts created before usernames existed were renamed on upgrade to the part of their email before `@`, or to the whole address with `@` replaced by `.` when that would clash (`ali@example.com` becomes `ali`).
- Disabling ends the person's sessions immediately; setting a password does too.
- Delete asks you to type the username.

## Audit

`admin.created`, `admin.updated` (with the patch), `admin.password_reset`, `admin.unlocked`, `admin.deleted` land in the audit log with the acting admin's username and IP. Accounts created from the CLI show `cli` as the actor.

## Behind the scenes

| Call | Purpose |
|---|---|
| `GET /api/admins` | list |
| `POST /api/admins { username, name?, password, role }` | create |
| `PATCH /api/admins/:id { name?, role?, status? }` | update |
| `POST /api/admins/:id/password { password }` | set password |
| `POST /api/admins/:id/unlock` | clear lockout |
| `DELETE /api/admins/:id` | delete |
