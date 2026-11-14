# Raw source cache

Every source response is cached here before it is used. This includes free sources, such as Hugging Face, and billable sources, such as the X API.

The cache makes the catalogue reproducible without another read. The X API is metered, so a repeated read costs money. The Hugging Face API is free, but its cache keeps the build deterministic.

## Layout

```text
data/raw/x/lists/<list-id>/<YYYY-MM-DD>.list.json
data/raw/x/lists/<list-id>/<YYYY-MM-DD>.members.json
data/raw/hf/users/<user>/<YYYY-MM-DD>.following-orgs.json
data/raw/hf/users/<user>/<YYYY-MM-DD>.following.json
```

The filename carries the source, the endpoint, and the capture date. A refresh adds a new dated file. It never overwrites an older snapshot.

## Rules

1. The file holds the response body. Do not edit it by hand.
2. The request URL and the capture date live in the filename and in the commit message.
3. Secrets never enter this directory. The authorization header is not stored.
4. A derived record cites the snapshot that supports it.
5. CI never fetches a billable source. It reads the cache.
6. A missing cache is an error for a billable source. Do not fetch it silently.
7. A refresh needs an explicit request and a documented token.

## Cost note

The X list read was one list lookup plus one member page for 47 members. Owned reads cost about USD 0.001 per resource. The snapshot exists so the same data never costs twice.

## What is here

| Snapshot | Contents |
| --- | --- |
| `x/lists/2084302656580034676/2026-11-14.list.json` | The list metadata: name, description, owner, member count, creation date. |
| `x/lists/2084302656580034676/2026-11-14.members.json` | All 47 members with username, name, bio, verification, and public metrics. |
| `hf/users/balupton/2026-11-14.following-orgs.json` | The 13 organisations the owner follows on Hugging Face. |
| `hf/users/balupton/2026-11-14.following.json` | The followed users. Empty at capture. |

The curated view is [data/watchlist.json](../../watchlist.json).
