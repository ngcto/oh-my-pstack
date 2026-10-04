---
name: control-cli
description: "Drive, inspect, and profile an interactive CLI or TUI with a repeatable local harness and no external services. Use for CLI UX checks, prompt flows, resize bugs, startup regressions, memory leaks, hangs, terminal transcripts, or when asked to \"drive the CLI\", \"test this TUI\", or \"reproduce in a terminal\"."
---

# Control CLI

Exercise an interactive CLI with a repeatable harness instead of poking at it. Reuse the repo's own test or demo harness first; otherwise assemble a temporary one from the tools below.

## What it is used for

- Reproducing CLI/TUI bugs with deterministic input.
- Verifying keyboard flows, prompts, interrupts, resize behavior, and terminal layout.
- Capturing before/after transcripts for bug fixes.
- Profiling startup time, slow operations, hangs, or memory growth.
- Recording a short terminal demo when output is easier to show than explain.

## Harness loop

1. Identify the command under test and the smallest reproducible workspace.
2. Discover existing harnesses: package scripts, e2e tests, demo recorders, expect scripts, PTY helpers.
3. If none exists, launch the CLI in an isolated terminal session with deterministic env vars.
4. Capture the current screen before interacting.
5. Send one action at a time: text, Enter, arrows, Escape, Ctrl-C, resize.
6. Wait for a concrete screen pattern or prompt before the next action.
7. Save the transcript and any profile artifacts.
8. Kill the session cleanly.

## Harness options

Pick the lightest one that fits.

- **Repo-native harness.** Checked-in scripts already know the app's startup, env, and prompts.
- **Named `bash` service.** For line-oriented prompts and REPLs that need stdin, start the program as a service: `bash {command, name, ready?}` with a `ready` log regex or port, and no `async` and no `timeout` (both throw in service mode). The service runs under its own broker-owned PTY, so prompts, colors, and line editing behave as for a user, and it works in subagents. Then `read proc://<name>` for state and output, `write proc://<name>` to send stdin (an empty write sends Enter), and `write proc://<name>/kill` to stop it. A plain `async: true` job takes no stdin. Foreground `bash` with `pty: true` opens a human-facing overlay and is unavailable in subagents, so do not plan a harness around it.
- **`tmux`.** The robust path for full-screen TUIs and anything needing a stable screen or a resize, and the subagent-safe TUI path because it needs no overlay: `capture-pane` returns the rendered screen, `send-keys` sends real keys, `resize-window` tests layout. Use it when raw PTY output is escape-sequence noise.
- **Scripted PTY probe.** Use eval (py or js) when the flow needs exact waits and assertions in one place. Prefer it over hand-rolled `select` loops in shell.
- **Runtime inspector.** Node or Bun inspector for CPU profiles, heap snapshots, and live evaluation. `xd://debug` (DAP) attaches to a running process for breakpoints and stacks.
- **Terminal recorder.** Repo-local demo tools or asciinema-compatible tools, only when the user asks for a demo.

## Minimal tmux harness

```bash
SESSION="cli-harness-$(date +%s)"
tmux new-session -d -x 120 -y 40 -s "$SESSION" -- <command-under-test>
tmux capture-pane -pt "$SESSION"
tmux send-keys -t "$SESSION" "help" Enter
tmux capture-pane -pt "$SESSION"
tmux resize-window -t "$SESSION" -x 60 -y 20
tmux kill-session -t "$SESSION"
```

Wait by polling `capture-pane` for a concrete pattern with a deadline, not by sleeping. For Node CLIs, start with `NODE_OPTIONS="--inspect=127.0.0.1:0"`, read the inspector URL from the terminal, and profile with DevTools-compatible tooling or `xd://debug`.

## Scripted PTY probe

Use eval (py) when neither tmux nor a repo harness fits. Keep it temporary, under `/tmp`, unless the user asks for a reusable test.

```python
import os, pty, select, subprocess, time

master, slave = pty.openpty()
proc = subprocess.Popen(["<command>", "<arg>"], stdin=slave, stdout=slave, stderr=slave, close_fds=True)
os.close(slave)

def wait_for(text, timeout=30):
    buf, end = b"", time.time() + timeout
    while time.time() < end:
        if select.select([master], [], [], 0.25)[0]:
            buf += os.read(master, 4096)
            if text in buf:
                return buf.decode(errors="replace")
    raise TimeoutError(f"never saw {text!r}; got {buf[-500:]!r}")

try:
    wait_for(b"<ready text>")
    os.write(master, b"help\n")
    print(wait_for(b"<expected reply>"))
finally:
    proc.terminate()
    os.close(master)
```

For richer terminal control use `pty.fork()` or an existing PTY library.

## Profiling recipes

- Startup regression: capture baseline and treatment timings on the same machine, env, and command.
- Slow operation: start a CPU profile, perform the operation, stop the profile, compare top self-time functions.
- Memory leak: force GC if available, take a heap snapshot, repeat the operation, force GC again, take another snapshot.
- Hang: capture the screen, active handles and resources, and a stack or CPU sample before interrupting. `xd://debug` can pause the process and show stacks.

## Guardrails

- Prefer deterministic waits over sleeps. If you must sleep, explain why.
- Do not send credentials or destructive commands into a controlled session.
- Keep the harness in `/tmp` unless the repo already has a testing or demo harness.
- Do not hard-code paths from another repository. Adapt commands to the current repo's scripts and runtime.
- Clean up tmux sessions, `proc://<name>` services, temp dirs, inspector processes, and demo artifacts unless the user asks to keep them.

Adapted from cursor-team-kit (MIT).
