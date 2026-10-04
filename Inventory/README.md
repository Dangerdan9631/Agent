# Inventory

A Kotlin Multiplatform Compose Desktop app for taking inventory of files across many hard drives, finding exact and probable duplicates, tagging and reviewing them, and moving keepers into one consolidated tree.

The catalog lives in a local SQLite database. Source drives are never modified until you execute a consolidation plan, and even then each move is copy-then-verify-then-delete.

## Problem

Backups and copies accumulate over years. Drives do not have the same files, the same folder layout, or even the same bytes for files that "should" be the same. Some copies were edited after a backup. Inventory walks every registered root, records what it finds, groups likely copies, and helps you produce a single destination tree.

## Requirements

- JDK 21 or newer (JDK 25 is known to work)
- Gradle wrapper included (`gradlew` / `gradlew.bat`)

## Run

From this directory:

```
./gradlew :app:run
```

On Windows:

```
.\gradlew.bat :app:run
```

The SQLite file is stored at `%LOCALAPPDATA%\Inventory\inventory.db` on Windows, `~/Library/Application Support/Inventory/inventory.db` on macOS, and `$XDG_DATA_HOME/inventory/inventory.db` (or `~/.local/share/inventory/inventory.db`) on Linux. Override the directory with `INVENTORY_DATA_DIR`.

## Build and test

```
./gradlew build
./gradlew allTests
```

## Workflow

1. **Volumes.** Add each drive or backup folder and scan it. Scans walk the tree, compute a cheap sampled hash for every file, and mark files that disappeared since the last scan as missing. Recycle bins, `.git`, and `node_modules` are skipped.
2. **Duplicates.** Run analysis. Groups appear on the list as they are confirmed, and analysis can run while a scan is still adding files. Exact groups share a full SHA-256, computed only after a sampled hash collision. Probable groups come from rules (same name and size, same relative path on different volumes, name plus size-within-tolerance, normalized text, image dHash, audio tags, archive contents). Folder groups share a Merkle tree hash of the whole nested tree and are confirmed after scanning of a volume has finished. Choose a keeper per group, mark discards, or dismiss false positives. Choosing a keeper folder marks every file in that tree KEEP and every file in the other copies DISCARD. A keeper policy (newest, oldest, preferred volume, shortest path) can be applied to all open groups, including folders.
3. **Browser.** Browse each registered volume as an expandable tree of folders and files. Filter, multi-select, tag, and record KEEP/DISCARD decisions. The detail panel shows every known copy, hashes, extracted metadata, and a preview for images and text.
4. **Tags.** Create tags and apply them in bulk by extension and/or path glob (`*` within a segment, `**` across segments).
5. **Consolidate.** Pick a destination that is not inside any scanned root. Choose a layout (`Preserve keeper path`, `Date folders for media`, `Tag folders`) and a conflict policy (`Rename with suffix` or `Skip`). Optionally delete redundant **exact** copies after the keeper is verified. Probable members are never auto-deleted; they need an explicit DISCARD decision. Dry-run the plan, execute it, resume or retry from the journal, and export a CSV report.

## Safety model

Consolidation **moves** files using a journaled three-step action:

1. Copy the source to a temporary sibling of the destination (`.inventory-tmp`).
2. SHA-256 the temporary file and compare it to the source full hash. On mismatch the temporary file is deleted, the action is marked FAILED, and the source is left untouched.
3. Rename the temporary file into place, then delete the source.

Restarting the app resumes the journal. A COPIED-but-unverified row is re-hashed rather than copied again. DELETE_REDUNDANT actions run only after their keeper MOVE is VERIFIED or SOURCE_DELETED, and only when the redundant file has the same full hash as the keeper or an explicit DISCARD decision.

## Duplicate detection

| Kind | Reason | Meaning |
| --- | --- | --- |
| Exact | `same-content` | Identical full SHA-256 |
| Probable | `same-name-size` | Same file name and size, content not already known identical |
| Probable | `path-twin` | Same relative path on more than one volume, content differs |
| Probable | `name-size-tolerance` | Same name, size within 10%, different modified time |
| Probable | `normalized-text` | Text/source with the same hash after CRLF/LF and trailing-whitespace normalization |
| Probable | `visual-similar` | Image dHash Hamming distance ≤ 6 (jpg/png/gif/bmp/tiff/webp) |
| Probable | `audio-tags` | Same artist/title/album/duration key |
| Probable | `archive-contents` | Zip-like archives with the same sorted (name, size, crc) entry list; `docProps/` is ignored so Office metadata-only edits still match |
| Folder | `tree-hash` | Identical Merkle hash of the nested files and folders. A fully duplicated tree is one entry; nested matches under an already-matching parent are omitted. Keeping a folder marks that tree KEEP and the other copies DISCARD |

Video files are inventoried and can match by exact hash or name/size heuristics. There is no video content fingerprint in this version.

HEIC/HEIF files are classified as images but are not dHashed (Java ImageIO does not decode them).

## Project layout

```
Inventory/
  core/   Domain model, ports, and application services (commonMain)
  data/   SQLDelight schema, NIO filesystem, hashing, metadata adapters (desktopMain)
  app/    Compose Desktop UI, view models, composition root
```

Versions live in `gradle/libs.versions.toml`. The composition root is `app/src/desktopMain/kotlin/dev/inventory/app/composition/CompositionRoot.kt`.
