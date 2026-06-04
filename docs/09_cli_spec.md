# CLI Spec

Use a Node CLI package, for example with `commander` or `clipanion`.

## Commands

```bash
forge init [path]
forge new-set --code SG1 --name "Stargate Demo"
forge validate --set SG1
forge editor --set SG1
forge render --set SG1 --profile cockatrice
forge render --set SG1 --all --profile print
forge export cockatrice --set SG1 --zip
forge export images --set SG1 --format png
forge export print --set SG1 --paper letter --cards-per-page 9
forge import csv --set SG1 --from ./old/cards.csv --map ./import_map.csv
forge import mse --from ./old-set.mse-set --set SG1
forge import cockatrice --from ./customsets/SG1.xml --set SG1
forge assets list
forge assets sync --source mana
forge assets sync --source keyrune
forge assets import-local --pack user-modern --path ~/CardFrames
forge assets audit --pack user-modern
forge reference sync --source mtgjson
forge reference sync --source scryfall
forge reference search "type:legendary color>=uw commander"
forge compare --card SG1-001 --against "Sol Ring"
forge doctor
```

## Output philosophy

Every command should have:

- readable terminal output,
- `--json` mode,
- clear nonzero exit codes,
- logs written under `output/<SET>/logs/`,
- dry-run support for commands that modify files.

## Examples

### Validate old set

```bash
forge import csv --set SG1 --from ~/old-stargate/cards.csv --map import_map.csv
forge validate --set SG1
```

### Render only changed cards

```bash
forge render --set SG1 --profile cockatrice
```

### Render everything from scratch

```bash
forge render --set SG1 --profile cockatrice --all
```

### Build Cockatrice package

```bash
forge export cockatrice --set SG1 --zip
```

## Exit codes

- `0`: success
- `1`: validation failed
- `2`: missing assets
- `3`: render failed
- `4`: export failed
- `5`: unsafe asset source / license review missing
- `10`: internal error
