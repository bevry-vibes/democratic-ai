---
title: "agent-detect releases move to a page of their own"
date: 2026-11-19
kind: site
order: 3
summary: "The agent-detect changelog is now /releases rather than a homepage section, and the twelve releases cut before notes were required now have them."
---

The releases record on the [agent-detect site](https://agent-detect.bevry.me) is now a page of its own at [releases](https://agent-detect.bevry.me/releases). It was a section on the homepage, which made the homepage carry a changelog; the menubar entry is now the only reference from the registry, and the homepage carries none.

Each release keeps its permalink at [`/releases/<tag>`](https://agent-detect.bevry.me/releases/2026.11.19-2), and the date on the list links there too.

## Notes for the releases that had none

Twelve releases were cut before the rule that the annotated tag carries the notes: `2026.8.11-1` through `2026.10.29-1`. Their tags say only `agent-detect 2026.8.11-1` or `Release 2026.10.29-1`, so neither the site nor GitHub had anything to show.

Those notes are now written, reconstructed from the commits in each release and stored as `releases/<tag>.md` in the repository. The tag stays immutable; the site reads the overlay, and the GitHub release body was updated to match. `2026.10.27-1` had no GitHub release at all, so it has one now.

The announcement rule stands: point at `/releases/<tag>`, not at GitHub.
