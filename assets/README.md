# Assets Folder

This packet intentionally includes no production frame assets or official Magic graphic assets.

Homebrew Forge should create this structure in the real repo:

```text
assets/packs/<pack-id>/manifest.yaml
assets/packs/<pack-id>/frames/
assets/packs/<pack-id>/symbols/
assets/packs/<pack-id>/fonts/
assets/packs/<pack-id>/layout-maps/
```

Use `forge assets import-local` or `forge assets sync` to populate packs after reviewing source permissions.
