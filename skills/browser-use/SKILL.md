---
name: browser-use
description: "Drive web UIs and Electron or Chromium CDP targets with the Browser Use CLI. Use for browser interaction, DOM inspection, screenshots, or UI verification; check installation and setup on first use."
---

# Browser Use

Use the Browser Use CLI for browser interaction. Use `read` for static pages and APIs that do not need a browser.

## First use in a session

Set `BH_TELEMETRY=0` for every invocation of the selected executable, including preflight, bootstrap, and cleanup. Default telemetry includes command text, output, and helper arguments. Do not send UI content off-host without the user's explicit approval. Use a per-process environment value, not a persistent preference change. On PowerShell, pass it in the child process environment.

1. Locate the executable with `command -v browser-use` and `command -v bu`. On Windows, use `Get-Command browser-use, bu -ErrorAction SilentlyContinue`.
2. Use `browser-use` when present. If only `bu` is present, check `BH_TELEMETRY=0 bu --help` and use it only if it is the Browser Use CLI. Do not create an alias or wrapper.
3. Run the selected command with `--version`, `--help`, and `--doctor`, each with `BH_TELEMETRY=0`. Reuse an existing installation; a failing command is not permission to reinstall or upgrade it.
4. If the executable is missing or the doctor reports a missing connection or setup prerequisite, tell the user what failed. Ask them to install and set up Browser Use, or explicitly approve help with those steps. Wait before browser actions. Do not fall back to another UI driver to bypass the setup gate.

Check again after the user completes setup or the connection stops working. Do not repeat a successful preflight before every action.

Local/CDP work does not require Browser Use cloud authentication. An optional cloud-auth warning is not a setup failure when the intended browser connection is healthy.

## Installation and setup guidance

Give these steps to the user when needed. Do not run installation or configuration commands without their approval.

With [uv installed](https://docs.astral.sh/uv/getting-started/installation/), install the CLI using Python 3.12:

```bash
uv tool install --python 3.12 browser-use
```

Use the executable path reported by uv if it is not on PATH. Do not edit shell startup files automatically. This plugin already supplies the skill; do not run a skill installer that overwrites the user's skills.

For local Chrome, ask the user to open Chrome and enable remote debugging at `chrome://inspect/#remote-debugging` if the doctor identifies that prerequisite. The user handles browser and OS permission prompts. Do not automate approval or change browser profiles/security settings as hidden setup.

For an owned Electron or Chromium instance, use its documented debug launch and set `BU_CDP_URL` to the loopback HTTP DevTools endpoint, or `BU_CDP_WS` to its WebSocket endpoint. Repeat the same endpoint and run-specific `BU_NAME` on every CLI call. A daemon name does not isolate a shared browser.

If the intended daemon already has a healthy connection, skip bootstrap. Otherwise ask before establishing it. For an explicitly configured endpoint, one approved connection probe can establish the daemon:

```bash
BH_TELEMETRY=0 BU_CDP_URL=http://127.0.0.1:<debug-port> BU_NAME=<run-name> browser-use <<'PY'
print(list_tabs())
PY
```

Replace the endpoint and run name with discovered values. After that approved bootstrap, require `BH_REQUIRE_EXISTING_DAEMON=1` on every Python-stdin call. Repeat the endpoint and daemon name as well. A health failure must return to the user setup gate, not trigger automatic repair. In a headless environment, require an explicit endpoint. Do not start a billable cloud browser without the user's approval.

For connection details, read [the Browser Use setup guide](https://github.com/browser-use/browser-harness/blob/main/install.md). That guide may use the underlying `browser-harness` name; keep using the installed Browser Use executable unless the user approves a change.

## Drive the page

The current CLI executes Python on stdin. Helpers are pre-imported. Browser state and the attached tab persist between calls; Python variables do not. Do not use retired `open`, `state`, `eval`, or `--session` command recipes.

Inspect `current_tab()` and `list_tabs()` before choosing a target. For a new task, call `new_tab()` without a URL to create an owned blank tab, then `goto_url(discovered_url)`. Retain the returned target ID for cleanup. Do not call `new_tab(url)`, which can navigate an existing blank user tab.

With the approved endpoint environment set, enforce reuse-only mode:

```bash
BH_TELEMETRY=0 BH_REQUIRE_EXISTING_DAEMON=1 browser-use <<'PY'
target = new_tab()
goto_url("http://127.0.0.1:<app-port>")
assert wait_for_load(), "page did not finish loading"
print(current_tab())
print(page_info())
print(capture_screenshot("/absolute/run-dir/before.png"))
PY
```

Replace the URL and artifact path with this run's values. Read the saved PNG.

1. Inspect bounded accessibility nodes with `cdp("Accessibility.getFullAXTree")["nodes"]`. Filter by the intended role and name before printing.
2. Resolve the observed `backendDOMNodeId` with `cdp("DOM.getBoxModel", backendNodeId=...)`. Its content quad gives viewport CSS coordinates for `click_at_xy(x, y)`.
3. Check that the target is in the viewport; scroll and reobserve if needed. Act once. Use `fill_input(selector, text)` or `press_key(key)` for input when appropriate.
4. Reobserve with `page_info()` or a targeted `js(...)` read. Check `wait_for_element(selector)` and `wait_for_load()` results; neither proves the task's postcondition by itself.
5. Capture the changed view with `capture_screenshot(path)` and verify the visible result. If capture stalls, `activate_tab(target)` is permitted in an owned headless browser. On a shared visible browser, ask before changing the active tab.

DOM inspection is not permission to call app internals or mutate state instead of exercising the user path. Screenshot-derived clicks need the exact image scale and `js("window.devicePixelRatio")` conversion. Read [the screenshot guide](https://github.com/browser-use/browser-harness/blob/main/interaction-skills/screenshots.md) before using image coordinates.

## Diagnostics, recording, cleanup

Use `cdp(...)` for the supported DevTools domains. Enable the relevant domain before the action, collect events with `drain_events()`, and save the actual result. CPU profiles use `Profiler.enable`, `Profiler.start`, and `Profiler.stop`; metrics use `Performance.enable` and `Performance.getMetrics`. Tracing and heap snapshots stream events, so collect through completion before reporting an artifact.

Record only with user consent. `start_recording(name, title=...)` returns the run directory; retain it and call `stop_recording()` after verification. Do not change persistent recording preferences. Follow [the video guide](https://github.com/browser-use/browser-harness/blob/main/interaction-skills/make-video.md) when a video is requested.

Use `switch_tab(observed_target)` to reattach without foregrounding it. Use `activate_tab` only in an owned headless browser or when visible control is authorized. Close only a tab this run created with `close_tab(target)`. Do not reload or stop a shared daemon for cleanup. Stop only browser processes and servers you launched.

Command references: [Browser Use](https://github.com/browser-use/browser-use) and [interaction guides](https://github.com/browser-use/browser-harness/tree/main/interaction-skills).
