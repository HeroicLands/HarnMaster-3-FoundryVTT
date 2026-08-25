# Security Policy

## Supported versions

Only the most recent release of the `hm3` system is supported. Fixes are made on
`main` and ship in the next release; earlier versions are not patched.

## Reporting a vulnerability

**Report privately.** Use GitHub's
[private vulnerability reporting](https://github.com/HeroicLands/HarnMaster-3-FoundryVTT/security/advisories/new)
rather than opening a public issue.

This system ships JavaScript that Foundry loads into every connected client, and
compendium content that world data is built on. Treat as security-sensitive
anything that could let one user run code in another's client, corrupt or destroy
world data, or escalate a player to GM capability.

Please include what you were doing, what happened, the Foundry and system
versions, and — if you have one — a minimal reproduction. You will get an
acknowledgement; there is no paid bounty.

## What is *not* a private advisory

A bug with no security dimension is a normal public issue. So is a licensing
problem: shipping third-party art or verbatim rulebook text is broken behaviour
to be fixed in the open, not a weakness to be disclosed privately.
