---
status: active
lane: docs
type: spec
---
# Security, Legal, and Private-Use Guardrails

🟢 `[status: active]` `[lane: docs]` `[type: spec]`

This is not legal advice. It is a practical engineering policy for reducing risk.

## Default use case

Assume Homebrew Forge outputs are for:

- personal playtesting,
- private Cockatrice games,
- private tabletop/casual games,
- non-commercial sharing with playtesters.

## Required markings

Default export profiles should include a visible marking such as:

```text
CUSTOM PLAYTEST — NOT FOR SALE
```

or a footer field that makes the card obviously unofficial.

## Do not build counterfeits

The app should not help make cards intended to pass as real Magic cards. Avoid:

- official logos,
- counterfeit set/collector markings,
- print-ready counterfeit backs,
- removing legal notices from official images,
- hiding playtest markings.

## Fan content constraints

Wizards' Fan Content Policy says fan content should be unofficial, should not remove legal notices, and does not include verbatim copying/reposting of Wizards IP or counterfeit/proxy Magic cards. The app should therefore default to private-playtest, clearly unofficial outputs.

## Proxy/playtest baseline

Wizards' public proxy-policy communication says personal, non-commercial playtest cards are not something they desire to police, but official sanctioned events require authentic Magic cards and counterfeits are a serious problem. Build the app around playtest clarity, not realism.

## Asset metadata

Every non-generated asset should have:

- source,
- artist/creator if known,
- license/permission status,
- local checksum,
- whether redistribution is allowed.

## Git policy

Do not commit:

- asset files marked `redistribution_allowed: false`,
- private commissions unless intended,
- generated art that license forbids redistributing,
- user account exports containing private data,
- access tokens/cookies/API keys.

## Scraping policy

Do not automate scraping of sites that lack permission or an API. Do not bypass login, rate limits, robots, paywalls, or anti-automation mechanisms. Prefer local import, package managers, public GitHub releases, and documented APIs.
