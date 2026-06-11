# Updates

Safe toolkit update boundaries on the file system. This layer decides which paths the toolkit may overwrite and how local edits to toolkit-owned files are preserved before replacement.

Ownership classification splits project paths into toolkit-managed versus user-managed regions so updates never silently change specs, living specs, or user config. Backup helpers detect content drift from expected toolkit versions and write sibling `.bak` files when a locally modified toolkit-owned file would otherwise be lost.
