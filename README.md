# MMM-StarfieldSaver

A [MagicMirror²](https://github.com/MagicMirrorOrg/MagicMirror) module that acts as a screensaver: after a period of inactivity it takes over the full screen with a Windows-3D-Starfield-style animation and a drifting digital clock (DVD-logo style), then dismisses on any touch, click, key press, or mouse movement — restoring every other module to how it was.

Built to reduce static-image burn-in risk on always-on displays (e.g. a calendar/dashboard mirror) without needing separate pixel-shifting tooling.

## Screenshot

A full-screen field of streaking stars radiating from the center, with the current time drifting slowly around the screen.

## Installation

```sh
cd ~/MagicMirror/modules
git clone https://github.com/calicopizzadelivery/MMM-StarfieldSaver.git
```

No build step or dependencies — it's plain JS/CSS.

## Configuration

Add it to `config.js`. It's a fullscreen overlay, so it must use the `fullscreen_above` position:

```js
{
	module: "MMM-StarfieldSaver",
	position: "fullscreen_above",
	config: {
		idleTimeout: 30 * 60 * 1000, // 30 minutes
		starCount: 400,
		clock24h: false,
		quietHoursEnabled: true,
		quietHoursStart: "06:00",
		quietHoursEnd: "10:00"
	}
}
```

### Options

| Option | Default | Description |
|---|---|---|
| `idleTimeout` | `1800000` (30 min) | Milliseconds of no touch/mouse/keyboard activity before the screensaver activates |
| `starCount` | `400` | Number of stars rendered |
| `starSpeed` | `200` | Star travel speed in px/sec at the outer edge |
| `clockDriftSpeed` | `40` | Speed in px/sec the clock drifts around the screen |
| `clock24h` | `false` | Use 24-hour time format |
| `activityThrottle` | `500` | Milliseconds to throttle activity-event handling (avoids resetting the idle timer on every `mousemove` tick) |
| `activityEvents` | `["mousemove", "mousedown", "keydown", "touchstart", "touchmove", "wheel"]` | DOM events on `document` that count as "activity" |
| `quietHoursEnabled` | `true` | When `true`, the screensaver never auto-activates during the quiet-hours window, and force-dismisses immediately if it's already active when the window begins |
| `quietHoursStart` | `"06:00"` | Quiet-hours start time, 24h `"HH:MM"` local time |
| `quietHoursEnd` | `"10:00"` | Quiet-hours end time, 24h `"HH:MM"` local time. If earlier than `quietHoursStart`, the window is treated as wrapping past midnight (e.g. `22:00`–`06:00`) |
| `tickInterval` | `15000` | Milliseconds between idle/quiet-hours checks |

## How it works

- Listens for activity events on `document` and tracks the time of the last one.
- Every `tickInterval`, it checks: are we idle for at least `idleTimeout` AND outside quiet hours? If so, it hides every other module via MagicMirror's own `module.hide()` API (which also triggers each module's `suspend()` lifecycle hook) and renders a `<canvas>` starfield animation plus a drifting clock, positioned `fullscreen_above` so it sits on top of everything. The same tick also force-dismisses an already-active screensaver the moment quiet hours begin.
- Any of the configured activity events immediately stops the animation and calls `module.show()` on every other module, restoring the mirror.

## License

MIT
