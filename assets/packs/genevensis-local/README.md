# GenevensiS Local Asset Pack

This manifest maps Kyle's local GenevensiS MSE frame library into Homebrew Forge.
It does not copy the 117 MB asset folder into this packet; it references the
local source folder:

```text
/Users/kyle/Documents/My Games/Magic The Gathering/GenevensiS_Frames_2023_09_14
```

Run:

```bash
PATH="$PWD/node_modules/.bin:$PATH" forge assets check --pack genevensis-local
PATH="$PWD/node_modules/.bin:$PATH" forge render --set DEMO --profile review_png
```

