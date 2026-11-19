---
title: "Journal permalinks, and a releases page for agent-detect"
date: 2026-11-19
kind: site
order: 1
summary: "Every Journal entry now carries a visible permalink, on the date and on the title. The agent-detect site gained a releases page built from its annotated tags."
---

Two small changes make the record linkable.

## Permalinks

Every Journal entry has a stable anchor, and it is now visible: the date links to it, the title links to it, and a `#` sits beside the kind badge. An entry can be cited as `https://democratic-ai.bevry.me/journal/#2026-11-19-inworld`, and the entry flashes when the link is opened.

The Journal feed already used the same anchor as its `<guid>`, so a reader arriving from a feed lands on the exact entry.

## agent-detect releases

The [agent-detect site](https://agent-detect.bevry.me) now has a **releases** section after **cli** and **registry**, in the menubar and on the page. It reads the annotated calver tags from git, so the notes it shows are the same notes the GitHub release carries. Each release has a page at `/releases/<tag>`, for example [2026.11.18-1](https://agent-detect.bevry.me/releases/2026.11.18-1), and the footer's version link points there instead of to GitHub.

Announcements should link those pages rather than the repository: a permalink that opens the notes, with the GitHub release one click away.
