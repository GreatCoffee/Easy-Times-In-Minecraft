# Server harness notes (hard rules since 2026-10-25)

- **RCON must use the harness start chain** (`start-server.ps1`, binpatched
  classpath), never `gradle runServer`. The GradleStart dev chain breaks
  RConThreadClient with an NPE on every connection (4/4 in the 11:41 window).
- **The etim jar is appended to the classpath, never copied into `run/mods/`.**
  With the workdir form the same jar is visible as `...\.\mods\etim*.jar` and
  `.\mods\etim*.jar` → DuplicateMods crash on boot.
- `run/uw` = underworld verification scene. Safe to delete after the window closes.
