---
title: "Anchors instead of pages"
date: 2026-11-19
kind: site
order: 4
summary: "Release and Journal permalinks are anchors now: #<tag> for one release, #<yyyy-mm-dd> for a day, and the old paths redirect."
---

A release page carried one release's notes and three links that all pointed at itself. It was a page for the sake of a permalink. The permalink is the anchor.

## agent-detect

- Each release keeps its id: `https://agent-detect.bevry.me/releases/#2026.11.19-2`. The tag is the link, and the redundant `permalink` link is gone.
- A day is an anchor too: `https://agent-detect.bevry.me/releases/#2026-11-19` highlights every release cut that day. The date beside a release links there.
- The old paths still work: `/releases/<tag>` and `/releases/<yyyy-mm-dd>` 308 to the matching anchor, so a link already in the wild lands on the notes.
- The `releases` menubar entry stays live on its own page: clicking it clears the anchor and returns to the top. `cli` and `registry` stay in the bar there, and a click carries the anchor home.

## Journal

- A date is an anchor: `https://democratic-ai.bevry.me/journal/#2026-11-19` highlights every entry of that day. The date on an entry links there.
- An entry keeps its own anchor, `#<entry-id>`, for citing one post.

Both pages flash the anchors they are given for a moment, so a link says which entry it named.
