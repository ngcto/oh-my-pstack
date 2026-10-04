# Stack state over the API

Use this when there is no checkout (orchestrator, babysit polling, CI) or when you need live head SHAs. Everything here reads the same objects `gh stack view --json` is built from. Stacked PRs are a public preview, so expect 404 on repos without it.

Send `-H 'X-GitHub-Api-Version: 2026-03-10'` on stack calls. Stacks are addressed by **stack number**, the repo-scoped number shown in the UI. It is not a PR number, but the two never collide.

## Contents

- [gh stack view --json](#gh-stack-view---json)
- [REST](#rest)
- [GraphQL](#graphql)
- [Webhooks](#webhooks)
- [Actions](#actions)

## gh stack view --json

```
trunk           string
currentBranch   string
branches[]      name, head?, base?, isCurrent, isMerged, isQueued, needsRebase   bottom to top
branches[].pr   number, url, state ("OPEN" | "MERGED" | "QUEUED"), absent without a PR. A CLOSED PR is reported as OPEN
```

`head` is the saved tip SHA and is omitted until recorded. `base` is the saved parent SHA the branch was last known to contain and can be older than the parent's tip. `needsRebase` is true when the parent tip is no longer an ancestor. Frontier locally:

```bash
gh stack view --json | jq '[.branches[] | select(.isMerged | not) | {name, pr: ((.pr // {}) | .number), state: ((.pr // {}) | .state), sha: (.head // null)}]'
```

Use `git rev-parse <name>` for live SHAs. `view --json` cannot show a closed PR, so cross-check closed blockers with the REST frontier below or `gh pr view <n> --json state`.

## REST

| Call | Purpose |
|---|---|
| `GET /repos/{o}/{r}/stacks` | list, newest first. `?pull_request=N`, `per_page` (max 100), `page` |
| `GET /repos/{o}/{r}/stacks/{stack_number}` | one stack |
| `POST /repos/{o}/{r}/stacks` | create. Body `{"pull_requests":[101,102]}` bottom to top, 2 to 100, each base must equal the previous head. 201 |
| `POST /repos/{o}/{r}/stacks/{n}/add` | append the delta from the top up. 200 |
| `POST /repos/{o}/{r}/stacks/{n}/unstack` | remove unmerged PRs. 200 with the remainder, 204 if dissolved. Merged, merging, and queued PRs stay |

Mutating calls follow the single-topology-writer rule. Prefer `gh stack` for them.

```bash
H='X-GitHub-Api-Version: 2026-03-10'
gh api -H "$H" "repos/{owner}/{repo}/stacks?pull_request=102"      # the stack holding PR 102, as a one-element array
gh api -H "$H" repos/{owner}/{repo}/stacks/42
```

Stack resource: `id`, `number`, `node_id`, `url`, `base.ref`, `open` (any open PR), `created_at`, `pull_requests[]` ordered bottom to top. Each entry has `number`, `state` (`open|closed`), `draft`, `merged_at`, `head.ref`, `head.sha`.

Frontier (unmerged PRs, bottom to top, with head SHAs):

```bash
gh api -H "$H" "repos/{owner}/{repo}/stacks?pull_request=$PR" \
  --jq '.[0].pull_requests // [] | map(select(.merged_at == null) | {number, state, draft, ref: .head.ref, sha: .head.sha})'
```

Empty output means the PR is not in a stack. A `closed` entry blocks every PR above it. The first entry is the next to land.

Every PR resource (`GET /repos/{o}/{r}/pulls`, `.../pulls/{n}`) carries a `stack` object, `null` for standalone PRs:

```bash
gh api repos/{owner}/{repo}/pulls/42 --jq '.stack'
# {"id":123456,"number":50,"size":5,"position":2,"base":{"ref":"main","sha":"def456..."}}
```

`position` is 1-based from the bottom. The PR's own `base.ref` is its direct parent branch. `stack.base.ref` is the final target. They differ for every PR except the bottom one.

## GraphQL

Read-only. There are no stack mutations in GraphQL. Fields on `PullRequest`: `stack` (`PullRequestStack`: `id`, `number`, `size`, `baseRefName`, `entries`) and `stackEntry` (`PullRequestStackEntry`: `id`, `position`, `pullRequest`, `stack`). `entries` is a paginated connection with `totalCount`, `nodes`, `edges`, `pageInfo`.

```bash
gh api graphql -f query='
query($o:String!,$r:String!,$n:Int!){
  repository(owner:$o,name:$r){
    pullRequest(number:$n){
      number baseRefName
      stackEntry { position }
      stack { number size baseRefName
        entries(first:100){ totalCount nodes { position pullRequest { number state headRefName headRefOid } } } }
    }
  }
}' -f o=OWNER -f r=REPO -F n=102
```

Stacks cap at 100 PRs, so `first:100` covers one page.

## Webhooks

`pull_request` payloads include `pull_request.stack` (`id`, `number`, `size`, `position`, `base.ref`, `base.sha`) while the PR is in a stack. The `opened` action never has it, because a PR is created before it joins a stack. Listen for the `pull_request` action `stacked`, which also carries a top-level `stack` object identical to the nested one.

## Actions

Workflow triggers evaluate against the stack base, so a workflow on `pull_request` targeting `main` runs for every PR in the stack. Expressions, all guarded by `stack != null`:

| Expression | Meaning |
|---|---|
| `github.event.pull_request.stack.number` | stack number |
| `github.event.pull_request.stack.size` | PRs in the stack |
| `github.event.pull_request.stack.position` | 1 is the bottom |
| `github.event.pull_request.stack.base.ref` | final target branch |
| `github.event.pull_request.stack.base.sha` | tip SHA of the stack base |

Gate expensive jobs so a large stack does not multiply CI cost:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: lowest unmerged PR
        if: github.event.pull_request.stack != null && github.event.pull_request.stack.base.ref == github.event.pull_request.base.ref
        run: ./ci/expensive.sh
      - name: top PR (full change set)
        if: github.event.pull_request.stack != null && github.event.pull_request.stack.position == github.event.pull_request.stack.size
        run: ./ci/expensive.sh
```

When the bottom PR lands the next one is retargeted and becomes the lowest unmerged PR on its next run. Run cheap checks on every layer and expensive ones on the top or lowest. `position == 1` pins the original bottom. Gate steps inside a job rather than skipping a required job, since a required check that never reports can block merging.
