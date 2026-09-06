# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-09-06

Initial release.

### Added

- Idle-triggered fullscreen screensaver: a canvas-based, Windows-3D-Starfield-style
  animation with a digital clock that drifts and bounces around the screen
  (DVD-logo style), to reduce burn-in risk on always-on displays.
- Dismisses instantly on any touch, click, key press, mouse movement, or scroll,
  restoring the mirror.
- Hides every other MagicMirror module while active via the core `module.hide()`/
  `show()` API (which also triggers each module's `suspend()`/`resume()` lifecycle
  hooks), and restores them on dismissal.
- Configurable `idleTimeout` before the screensaver activates.
- Configurable `quietPeriods`: any number of `{ start, end }` time-of-day windows
  (24h `"HH:MM"`, with overnight wraparound support) during which the screensaver
  never auto-activates. If it's already active when a quiet period begins, it's
  force-dismissed immediately. Defaults to a morning (06:00-10:00) and evening
  (17:00-20:00) window.
- Configurable star count, star speed, clock drift speed, and 12h/24h clock format.
- No build step or external dependencies — plain JS/CSS.

[0.1.0]: https://github.com/calicopizzadelivery/MMM-StarfieldSaver/releases/tag/v0.1.0
