# Security Policy

## Reporting a vulnerability

Please report security issues privately through GitHub's security advisory feature rather than a public issue. Include reproduction details and the affected version or commit.

Never include TypeSafe keys, GoDaddy keys or secrets, payment identifiers, or unredacted account data in an issue.

## Credential handling

Credentials belong in `.env`, which is excluded from version control. The project uses GoDaddy credentials only from the server-side CLI process and never writes them to reports or caches.
