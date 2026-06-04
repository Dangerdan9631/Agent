# Quickstart: Cerebrate Workflows

## Prerequisites

- Complete baseline setup from `specs/001-current-application-state/quickstart.md`
- Build the workspace from `overmind/src`
- Start the service and start a cerebrate named `hello`

## 1. Add workflow config

Edit `cerebrates/hello/cerebrate-config.yaml`:

```yaml
states:
  - name: inspect
    command: run
    next: cleanup
    branches:
      - when:
          outputContains: "needs-validation"
        next: cleanup
      - when:
          outputContains: "skip"
        next: END
    onError: recover
  - name: cleanup
    command: shutdown
    next: END
  - name: recover
    command: shutdown
    next: END
workflows:
  - name: daily-review
    initialState: inspect
```

## 2. Observe service/global logs

```bash
node packages/overmind-cli/dist/bin.js attach --config-dir ../my-overmind-config
```

Expected: unnamed attach streams service/global logs.

## 3. Start workflow

```bash
node packages/overmind-cli/dist/bin.js start-workflow hello daily-review --config-dir ../my-overmind-config
```

Expected:

- CLI logs a line containing `hello:daily-review`, initial state `inspect`, and status `running`
- Service invokes `inspect` command through existing send-command behavior
- If a branch condition matches, the first matching branch target is selected
- If no branch matches, `next: cleanup` is selected
- If command fails, `onError: recover` is selected
- Transition entries appear in unnamed attach output with markers such as `[workflow:default]`, `[workflow:branch]`, `[workflow:error]`, `[workflow:failure]`, and `[workflow:completion]`

## 4. Validate failures

Try an unknown workflow:

```bash
node packages/overmind-cli/dist/bin.js start-workflow hello missing --config-dir ../my-overmind-config
```

Expected: clear service error and no workflow run starts.
