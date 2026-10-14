# Access control

## Limit an account to some services

Admins page, row menu, **Service access** (or the checkboxes when creating the account). Nothing ticked means every service.

```bash
curl -s -X POST $CONSOLE/api/admins -H "cookie: $SESSION" -H 'x-console-request: 1' -H 'content-type: application/json' \
  -d '{"username":"queue-ops","password":"a long password","role":"admin","services":["atc-queue","atc-backup"]}'
```

The account sees only those services in the menu, the overview and the About page; every other `/api/services/<id>/...` route and the API docs of other services answer `403 FORBIDDEN`. The role still applies inside the allowed services (`viewer` changes nothing). A limited account cannot create, change or delete accounts, so it cannot widen itself; nobody can change their own scope.

## Make two-factor mandatory

```bash
CONSOLE_REQUIRE_TOTP=true
```

After sign-in an account without a second factor is sent to the account page; every other route answers `403 TOTP_ENROLLMENT_REQUIRED` until the TOTP setup is confirmed. Password change and the account's own session list keep working. While the setting is on, two-factor cannot be turned off.

## Downloads

Backup files and export files can contain secrets and personal data: only admins can download them (a `viewer` gets `403`).

## Weak passwords

Setting a password shows a warning (not an error) for fewer than 12 characters, a repeated character or a single character class. The console still accepts it: password rules are the operator's choice.
