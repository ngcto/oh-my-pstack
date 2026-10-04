import { afterEach, describe, expect, it } from "bun:test";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  NotFoundError,
  UserError,
  openStore,
  parseVerdict,
  type OpenStoreOptions,
  type RunCommand,
  type Store,
} from "./store.ts";

const SCRIPT = join(import.meta.dir, "orch.ts");
const directories: string[] = [];
const handles: Store[] = [];

interface RunResult {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}

async function makeDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "orch-test-"));
  directories.push(directory);
  return directory;
}

function useStore(
  directory: string,
  options?: OpenStoreOptions
): Store {
  const store = openStore(directory, options);
  handles.push(store);
  return store;
}

async function initializedStore(): Promise<{
  readonly directory: string;
  readonly store: Store;
}> {
  const directory = await makeDirectory();
  const store = useStore(directory);
  await store.init();
  return { directory, store };
}

function git({
  args,
  repo,
}: {
  args: readonly string[];
  repo: string;
}): string {
  const result = Bun.spawnSync(["git", "-C", repo, ...args]);
  if (result.exitCode !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed: ${result.stderr.toString()}`
    );
  }
  return result.stdout.toString().trim();
}

async function makeGitStack(directory: string): Promise<{
  readonly repo: string;
  readonly queuedSha: string;
  readonly openSha: string;
}> {
  const repo = join(directory, "repo");
  await mkdir(repo);
  git({ repo, args: ["init", "--initial-branch=main"] });
  git({ repo, args: ["config", "user.name", "Orch Test"] });
  git({ repo, args: ["config", "user.email", "orch@example.com"] });
  await writeFile(join(repo, "main.txt"), "main\n");
  git({ repo, args: ["add", "."] });
  git({ repo, args: ["commit", "-m", "main"] });

  const branches = ["stack/merged", "stack/queued", "stack/open"];
  for (const [index, branch] of branches.entries()) {
    git({ repo, args: ["checkout", "-b", branch] });
    await writeFile(join(repo, `stack-${index}.txt`), `${branch}\n`);
    git({ repo, args: ["add", "."] });
    git({ repo, args: ["commit", "-m", branch] });
  }

  return {
    repo,
    queuedSha: git({ repo, args: ["rev-parse", "stack/queued"] }),
    openSha: git({ repo, args: ["rev-parse", "stack/open"] }),
  };
}

interface RunCall {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string | undefined;
}

// Fakes every `gh` call; `git` runs for real against the fixture repo. Any
// other gh invocation (for example a bare `gh stack view`, which opens a TUI)
// fails the test.
function fakeRun(responses: {
  readonly view?: string;
  readonly viewError?: string;
  readonly api?: string;
}): { readonly run: RunCommand; readonly calls: RunCall[] } {
  const calls: RunCall[] = [];
  const run: RunCommand = (command, args, { cwd }) => {
    calls.push({ command, args, cwd });
    const line = `${command} ${args.join(" ")}`;
    if (command === "git") {
      return git({ repo: cwd ?? "", args });
    }
    if (line === "gh stack view --json") {
      if (responses.viewError !== undefined) {
        throw new Error(responses.viewError);
      }
      return responses.view ?? "";
    }
    if (command === "gh" && args[0] === "api" && responses.api !== undefined) {
      return responses.api;
    }
    throw new Error(`unexpected command: ${line}`);
  };
  return { run, calls };
}

async function stackFixture(responses: Parameters<typeof fakeRun>[0]) {
  const root = await makeDirectory();
  const stack = await makeGitStack(root);
  const { calls, run } = fakeRun(responses);
  const store = useStore(join(root, "store"), { run });
  await store.init();
  return { calls, stack, store };
}

function viewBranch(
  name: string,
  pr: number,
  state: string
): Record<string, unknown> {
  return {
    name,
    head: "1".repeat(40),
    base: "2".repeat(40),
    isCurrent: false,
    isMerged: state === "MERGED",
    isQueued: state === "QUEUED",
    needsRebase: false,
    pr: {
      number: pr,
      url: `https://github.com/octocat/hello-world/pull/${pr}`,
      state,
    },
  };
}

function viewJson(branches: readonly Record<string, unknown>[]): string {
  return JSON.stringify(
    { trunk: "main", currentBranch: "stack/open", branches },
    null,
    2
  );
}

function restMember(
  number: number,
  state: string,
  mergedAt: string | null,
  ref: string,
  sha: string
): Record<string, unknown> {
  return {
    number,
    state,
    draft: false,
    merged_at: mergedAt,
    head: { ref, sha },
  };
}

// Two stacks as the list endpoint returns them. The stack holding PRs
// 101-104 lists its pull requests bottom to top; 101 is already merged.
function stacksJson(): string {
  return JSON.stringify([
    {
      id: 9876544,
      number: 43,
      base: { ref: "main" },
      open: true,
      created_at: "2026-04-16T10:00:00Z",
      pull_requests: [restMember(201, "open", null, "other", "e".repeat(40))],
    },
    {
      id: 9876543,
      number: 42,
      base: { ref: "main" },
      open: true,
      created_at: "2026-04-15T10:00:00Z",
      pull_requests: [
        restMember(
          101,
          "closed",
          "2026-04-16T09:00:00Z",
          "user-model",
          "a".repeat(40)
        ),
        restMember(102, "open", null, "user-api", "b".repeat(40)),
        restMember(103, "open", null, "user-ui", "c".repeat(40)),
        restMember(104, "closed", null, "user-docs", "d".repeat(40)),
      ],
    },
  ]);
}

function runCli(
  args: readonly string[],
  env: Readonly<Record<string, string | undefined>> = process.env
): RunResult {
  const result = Bun.spawnSync([process.execPath, SCRIPT, ...args], { env });
  return {
    code: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  };
}

afterEach(async () => {
  for (const store of handles.splice(0).reverse()) {
    await store.close();
  }
  for (const directory of directories.splice(0)) {
    await rm(directory, { recursive: true, force: true });
  }
});

describe("Store", () => {
  it("initializes an idempotent plain-file store and releases its lock", async () => {
    const directory = await makeDirectory();
    const store = useStore(directory);

    expect(await store.init()).toEqual({ store: directory });
    const firstUnits = await readFile(join(directory, "units.tsv"), "utf8");
    const firstLedger = await readFile(
      join(directory, "ledger.tsv"),
      "utf8"
    );

    expect(await store.init()).toEqual({ store: directory });
    expect(await readFile(join(directory, "units.tsv"), "utf8")).toBe(
      firstUnits
    );
    expect(await readFile(join(directory, "ledger.tsv"), "utf8")).toBe(
      firstLedger
    );
    expect((await readdir(directory)).sort()).toEqual([
      ".orch.lock",
      "frontier.json",
      "gates.md",
      "inbox",
      "ledger.tsv",
      "preferences.md",
      "units.tsv",
    ]);

    await store.close();
    expect(await readdir(directory)).not.toContain(".orch.lock");
  });

  it("composes unit add, set, get, list, and counts", async () => {
    const { store } = await initializedStore();

    expect(
      await store.units.add({
        id: "u1",
        track: "build",
        brief: "briefs/u1.md",
      })
    ).toMatchObject({ id: "u1", state: "pending" });
    expect(
      await store.units.add({ id: "=SUM(A1)", track: "+build" })
    ).toMatchObject({ id: "'=SUM(A1)", track: "'+build" });

    const updated = await store.units.set({
      id: "u1",
      state: "done",
      branch: "poteto/u1",
      pr: 184530,
      sha: "abc123",
    });
    expect(updated).toEqual({
      id: "u1",
      track: "build",
      state: "done",
      branch: "poteto/u1",
      pr: "184530",
      sha: "abc123",
      brief: "briefs/u1.md",
    });
    expect(await store.units.get("u1")).toEqual(updated);
    expect(
      await store.units.list({ state: "done", track: "build" })
    ).toEqual([updated]);
    expect(await store.units.counts()).toEqual({ done: 1, pending: 1 });
    await expect(
      store.units.add({ id: "u1", track: "build" })
    ).rejects.toThrow("unit u1 already exists");
    await expect(
      store.units.set({ id: "missing", state: "done" })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("records, replaces, checks, and summarizes typed ledger verdicts", async () => {
    const { store } = await initializedStore();

    try {
      await store.ledger.check({ pr: 184530, sha: "abc123" });
      throw new Error("expected ledger check to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundError);
      if (error instanceof NotFoundError) {
        expect(error.output).toEqual({
          compact: "NOT-VERIFIED",
          json: {
            pr: "184530",
            sha: "abc123",
            verdict: "NOT-VERIFIED",
          },
        });
      }
    }
    expect(() => parseVerdict("looks-good")).toThrow("verdict must be");

    const recorded = await store.ledger.record({
      pr: 184530,
      sha: "abc123",
      verdict: "unit-test-verified",
      evidence: "reports/verify.md",
      verifier: "sol",
    });
    expect(await store.ledger.check({ pr: 184530, sha: "abc123" })).toEqual(
      recorded
    );
    expect(await store.ledger.summary()).toEqual({
      "unit-test-verified": 1,
    });

    await store.ledger.record({
      pr: 184530,
      sha: "abc123",
      verdict: "live-ui-verified",
      evidence: "reports/live.md",
    });
    expect(await store.ledger.summary()).toEqual({
      "live-ui-verified": 1,
    });
  });

  it("pushes, peeks, and atomically drains inbox pointers", async () => {
    const { directory, store } = await initializedStore();

    const first = await store.inbox.push({
      agent: "worker-1",
      unit: "u1",
      status: "done",
      report: "reports/u1.md",
    });
    expect(first.pointer).toMatchObject({ unit: "u1", status: "done" });
    expect(first.filename).toEndWith(".tsv");
    await store.inbox.push({
      agent: "worker-2",
      unit: "u2",
      status: "failed",
    });

    expect(await store.inbox.count()).toBe(2);
    expect(await store.inbox.peek()).toHaveLength(2);
    expect(await store.inbox.count()).toBe(2);
    expect(await store.inbox.drain()).toHaveLength(2);
    expect(await store.inbox.count()).toBe(0);
    expect(await readdir(join(directory, "inbox"))).toEqual([]);
    expect(
      (await readdir(directory)).filter((name) =>
        name.startsWith(".inbox-drain-")
      )
    ).toEqual([]);
  });

  it("replaces a stale lock whose holder pid is dead", async () => {
    const { directory } = await initializedStore();
    const exited = Bun.spawn(["true"]);
    await exited.exited;
    await writeFile(join(directory, ".orch.lock"), `${exited.pid}\n`);

    const stale: string[] = [];
    const recovered = useStore(directory, {
      onStaleLock: (holder) => stale.push(holder),
    });
    expect(
      await recovered.units.add({ id: "u1", track: "build" })
    ).toMatchObject({ id: "u1" });
    expect(stale).toEqual([String(exited.pid)]);
    await recovered.close();
    expect(await readdir(directory)).not.toContain(".orch.lock");
  });

  it("blocks a writer and steals the pid lock only with force", async () => {
    const { directory, store } = await initializedStore();
    await store.close();
    await writeFile(join(directory, ".orch.lock"), `${process.pid}\n`);

    const blocked = useStore(directory);
    await expect(
      blocked.units.add({ id: "u1", track: "build" })
    ).rejects.toThrow(`store lock held by pid ${process.pid}`);

    const stolen: string[] = [];
    const forced = useStore(directory, {
      force: true,
      onLockStolen: (holder) => stolen.push(holder),
    });
    expect(
      await forced.units.add({ id: "u1", track: "build" })
    ).toMatchObject({ id: "u1" });
    expect(stolen).toEqual([String(process.pid)]);
    await forced.close();
    expect(await readdir(directory)).not.toContain(".orch.lock");
  });

  it("parks gates, stores standing orders, and renders status", async () => {
    const { directory, store } = await initializedStore();
    await store.units.add({ id: "u1", track: "build" });
    expect(
      await store.gates.park({
        id: "release",
        question: "Ship now?",
        options: "ship,wait",
        defaultAnswer: "wait",
      })
    ).toMatchObject({ kind: "open", id: "release" });
    expect(
      await store.standing.add({ line: "Never force push." })
    ).toEqual({ number: 1, line: "Never force push." });

    const first = await store.status.render();
    expect(first.changed).toBe("first render");
    expect(first.summary.openGateIds).toEqual(["release"]);
    expect(await readFile(join(directory, "status.md"), "utf8")).toContain(
      "| release | open | Ship now? |"
    );
    expect((await store.status.render()).changed).toBe("no derived changes");

    expect(
      await store.gates.resolve({ id: "release", answer: "ship" })
    ).toMatchObject({ kind: "resolved", answer: "ship" });
    expect((await store.status.render()).changed).toBe("open gates 1->0");
    expect(await store.gates.list()).toEqual([]);
    expect(await store.standing.show()).toEqual([
      { number: 1, line: "Never force push." },
    ]);
  });

  it("resolves the ordered gh stack frontier and validates an optional pin", async () => {
    const { calls, stack, store } = await stackFixture({
      view: viewJson([
        viewBranch("stack/merged", 10, "MERGED"),
        viewBranch("stack/queued", 13, "QUEUED"),
        viewBranch("stack/open", 11, "OPEN"),
      ]),
    });

    expect(await store.frontier.set({ repo: stack.repo })).toEqual({
      generation: 1,
      prs: [
        {
          pr: 13,
          branches: "stack/queued",
          sha: stack.queuedSha,
          state: "QUEUED",
        },
        {
          pr: 11,
          branches: "stack/open",
          sha: stack.openSha,
          state: "OPEN",
        },
      ],
      lowestUnmerged: 13,
    });
    expect(calls.filter((call) => call.command === "gh")).toEqual([
      { command: "gh", args: ["stack", "view", "--json"], cwd: stack.repo },
    ]);
    expect(
      (await store.frontier.set({ repo: stack.repo, prs: [13, 11] }))
        .generation
    ).toBe(2);
    expect((await store.frontier.show()).generation).toBe(2);
    await expect(
      store.frontier.set({ repo: stack.repo, prs: [13, 12] })
    ).rejects.toThrow(
      "frontier pin mismatch: missing from gh stack: 12; extra in gh stack: 11"
    );
    await expect(
      store.frontier.set({ repo: stack.repo, prs: [11, 13] })
    ).rejects.toThrow(
      "frontier pin mismatch: order differs: expected 11,13; gh stack 13,11"
    );
    await expect(
      store.frontier.set({ repo: stack.repo, prs: [13, 13] })
    ).rejects.toThrow("--prs must not contain duplicates");
  });

  it("records an empty frontier when every branch in the stack is merged", async () => {
    const { stack, store } = await stackFixture({
      view: viewJson([
        viewBranch("stack/merged", 10, "MERGED"),
        viewBranch("stack/queued", 13, "MERGED"),
      ]),
    });
    expect(await store.frontier.set({ repo: stack.repo })).toEqual({
      generation: 1,
      prs: [],
      lowestUnmerged: null,
    });
  });

  it("rejects malformed gh stack view output loudly", async () => {
    const cases: ReadonlyArray<readonly [string, string]> = [
      ["not json", "gh stack view --json output is not valid JSON"],
      ["{}", "gh stack view --json output has no branches array"],
      [
        viewJson([
          viewBranch("stack/queued", 11, "OPEN"),
          viewBranch("stack/open", 11, "OPEN"),
        ]),
        "gh stack view --json output contains duplicate pull requests",
      ],
      [
        viewJson([{ ...viewBranch("stack/open", 11, "OPEN"), pr: undefined }]),
        "gh stack view --json output branch stack/open has no pull request",
      ],
      [
        viewJson([viewBranch("stack/open", 11, "DRAFT")]),
        "gh stack view --json output has an unknown PR state for branch stack/open: DRAFT",
      ],
      [viewJson([]), "gh stack view --json output did not contain a stack"],
    ];
    for (const [view, expected] of cases) {
      const { stack, store } = await stackFixture({ view });
      await expect(store.frontier.set({ repo: stack.repo })).rejects.toThrow(
        expected
      );
    }
  });

  it("surfaces a failed gh stack view instead of guessing", async () => {
    const { stack, store } = await stackFixture({
      viewError: "exit status 2: not in a stack",
    });
    await expect(store.frontier.set({ repo: stack.repo })).rejects.toThrow(
      "gh stack view --json failed: exit status 2: not in a stack"
    );
  });

  it("treats a closed, unmerged PR at the bottom as the frontier because it blocks every PR above it", async () => {
    const api = JSON.stringify([
      {
        id: 1,
        number: 7,
        base: { ref: "main" },
        open: true,
        created_at: "2026-04-15T10:00:00Z",
        pull_requests: [
          restMember(301, "closed", null, "layer-a", "a".repeat(40)),
          restMember(302, "open", null, "layer-b", "b".repeat(40)),
        ],
      },
    ]);
    const { store } = await stackFixture({ api });

    const frontier = await store.frontier.set({
      pr: 302,
      slug: "octocat/hello-world",
    });

    expect(frontier.prs.map((row) => row.state)).toEqual(["CLOSED", "OPEN"]);
    expect(frontier.lowestUnmerged).toBe(301);
  });

  it("reads the stack from the stacks REST endpoint when given a PR number", async () => {
    const { calls, store } = await stackFixture({ api: stacksJson() });

    expect(
      await store.frontier.set({ pr: 102, slug: "octocat/hello-world" })
    ).toEqual({
      generation: 1,
      prs: [
        { pr: 102, branches: "user-api", sha: "b".repeat(40), state: "OPEN" },
        { pr: 103, branches: "user-ui", sha: "c".repeat(40), state: "OPEN" },
        {
          pr: 104,
          branches: "user-docs",
          sha: "d".repeat(40),
          state: "CLOSED",
        },
      ],
      lowestUnmerged: 102,
    });
    expect(calls).toEqual([
      {
        command: "gh",
        args: [
          "api",
          "-H",
          "X-GitHub-Api-Version: 2026-03-10",
          "repos/octocat/hello-world/stacks?pull_request=102",
        ],
        cwd: undefined,
      },
    ]);
    expect(
      (await store.frontier.set({ pr: 103, prs: [102, 103, 104] })).generation
    ).toBe(2);
    await expect(
      store.frontier.set({ pr: 103, prs: [103, 102, 104] })
    ).rejects.toThrow(
      "frontier pin mismatch: order differs: expected 103,102,104; gh stack 102,103,104"
    );
    await expect(
      store.frontier.set({ pr: 103, prs: [102, 103] })
    ).rejects.toThrow("extra in gh stack: 104");
  });

  it("defaults the REST slug to the current repository and rejects bad input", async () => {
    const { calls, stack, store } = await stackFixture({ api: stacksJson() });

    await store.frontier.set({ pr: 101 });
    expect(calls[0]?.args.at(-1)).toBe(
      "repos/{owner}/{repo}/stacks?pull_request=101"
    );
    await expect(store.frontier.set({ pr: 999 })).rejects.toThrow(
      "stacks API output has no stack containing PR #999"
    );
    await expect(
      store.frontier.set({ pr: 101, slug: "no slash" })
    ).rejects.toThrow("--slug must look like owner/repo");
    await expect(
      store.frontier.set({ repo: stack.repo, slug: "a/b" })
    ).rejects.toThrow("--slug requires --pr");
  });

  it("rejects ambiguous or malformed stacks REST payloads", async () => {
    const member = restMember(101, "open", null, "user-model", "a".repeat(40));
    const stack = { number: 1, pull_requests: [member] };
    const cases: ReadonlyArray<readonly [string, string]> = [
      ["{}", "stacks API output must be an array of stacks"],
      [
        JSON.stringify([stack, { ...stack, number: 2 }]),
        "stacks API output has multiple stacks containing PR #101",
      ],
      [
        JSON.stringify([{ pull_requests: [{ ...member, head: {} }] }]),
        "stacks API output has an invalid pull request row",
      ],
    ];
    for (const [api, expected] of cases) {
      const { store } = await stackFixture({ api });
      await expect(store.frontier.set({ pr: 101 })).rejects.toThrow(expected);
    }
  });

  it("rejects malformed TSV, verdict, frontier, and inbox data", async () => {
    const { directory, store } = await initializedStore();

    await writeFile(join(directory, "units.tsv"), "wrong\n");
    await expect(store.units.list()).rejects.toThrow(
      "units.tsv has an invalid header"
    );
    await writeFile(
      join(directory, "units.tsv"),
      "id\ttrack\tstate\tbranch\tpr\tsha\tbrief\nshort\trow\n"
    );
    await expect(store.units.list()).rejects.toThrow(
      "units.tsv has a malformed row"
    );

    await writeFile(
      join(directory, "ledger.tsv"),
      "pr\tsha\tverdict\tevidence\tverifier\tts\n1\tsha\tinvalid\treport\tme\tnow\n"
    );
    await expect(store.ledger.summary()).rejects.toThrow(
      "ledger.tsv has invalid verdict invalid"
    );

    await writeFile(join(directory, "frontier.json"), '{"generation":"1"}\n');
    await expect(store.frontier.show()).rejects.toThrow(
      "frontier.json has an invalid shape"
    );

    await writeFile(join(directory, "inbox", "bad.tsv"), "too\tshort\n");
    await expect(store.inbox.peek()).rejects.toThrow(
      "inbox pointer bad.tsv is malformed"
    );
  });

  it("rejects operations after close", async () => {
    const { store } = await initializedStore();
    await store.close();
    await expect(store.units.list()).rejects.toThrow("store is closed");
    await expect(store.status.render()).rejects.toBeInstanceOf(UserError);
  });
});

describe("orch CLI", () => {
  it("prints commander help and rejects invalid parsing with exit 1", async () => {
    const help = runCli(["--help"]);
    expect(help.code).toBe(0);
    expect(help.stdout).toContain("Commands:");
    expect(help.stdout).toContain("unit");
    expect(help.stdout).toContain("ledger");

    const frontierHelp = runCli(["frontier", "set", "--help"]);
    expect(frontierHelp.code).toBe(0);
    expect(frontierHelp.stdout).toContain("--repo <dir>");
    expect(frontierHelp.stdout).toContain("--prs <n,...>");

    const directory = await makeDirectory();
    const invalid = runCli(["--store", directory, "unit", "add", "u1"]);
    expect(invalid.code).toBe(1);
    expect(invalid.stderr).toContain("required option '--track <track>'");
  });

  it("accepts ORCH_STORE and emits complete JSON", async () => {
    const directory = await makeDirectory();
    const env = { ...process.env, ORCH_STORE: directory };
    expect(runCli(["init"], env).code).toBe(0);

    const added = runCli(
      ["unit", "add", "u1", "--track", "build", "--json"],
      env
    );
    expect(added.code).toBe(0);
    expect(JSON.parse(added.stdout)).toEqual({
      id: "u1",
      track: "build",
      state: "pending",
      branch: "",
      pr: "",
      sha: "",
      brief: "",
    });
  });

  it("maps user and not-found outcomes to the preserved exit codes", async () => {
    const directory = await makeDirectory();
    expect(runCli(["--store", directory, "init"]).code).toBe(0);

    const missingRepo = runCli([
      "--store",
      directory,
      "frontier",
      "set",
    ]);
    expect(missingRepo.code).toBe(1);
    expect(missingRepo.stderr).toContain(
      "set --repo <dir> or ORCH_REPO"
    );

    const userError = runCli([
      "--store",
      directory,
      "unit",
      "add",
      "",
      "--track",
      "build",
    ]);
    expect(userError.code).toBe(1);
    expect(userError.stderr).toContain("unit id must not be empty");

    const missingUnit = runCli([
      "--store",
      directory,
      "unit",
      "get",
      "missing",
    ]);
    expect(missingUnit.code).toBe(2);
    expect(missingUnit.stderr).toContain("unit missing not found");

    const missingLedger = runCli([
      "--store",
      directory,
      "--json",
      "ledger",
      "check",
      "184530",
      "abc123",
    ]);
    expect(missingLedger.code).toBe(2);
    expect(JSON.parse(missingLedger.stdout)).toEqual({
      pr: "184530",
      sha: "abc123",
      verdict: "NOT-VERIFIED",
    });
    expect(missingLedger.stderr).toBe("");
  });
});
