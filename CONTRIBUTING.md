# Contributing

Thanks for helping improve JEV Domain Scout.

## Development

1. Use Node.js 22.12 or newer.
2. Run `npm ci`.
3. Copy `.env.example` to `.env` only when testing live integrations. Never commit credentials.
4. Run `npm run typecheck` and `npm test` before opening a pull request.

Keep changes focused. New scoring signals should include a clear rationale, remain independently inspectable, and have tests. Do not add automatic bidding or purchasing without an explicit human-approval design and safeguards.

## Reporting bugs

Open a GitHub issue with reproduction steps, expected behavior, and sanitized output. Remove API keys, domain-account identifiers, and payment information.
