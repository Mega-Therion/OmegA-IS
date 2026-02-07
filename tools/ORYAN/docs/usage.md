# ORYAN Usage

## Initialize

```bash
./oryan init
```

## Create a task

```bash
./oryan task create --agent codex --prompt "Summarize README.md"
```

## List tasks

```bash
./oryan task list
./oryan task list --status pending
```

## Show a task

```bash
./oryan task show 1
```

## Run a task

```bash
./oryan run 1
./oryan run 1 --dry-run
./oryan run 1 --approve
```

## Context

```bash
./oryan context set project_name ORYAN
./oryan context get project_name
```

## Prompt interpolation

Use `{{key}}` in a task prompt. The value is pulled from context at run time.

```bash
./oryan task create --agent gemini --prompt "Write a summary for {{project_name}}"
```

## Chain tasks

```bash
./oryan chain --agent claude --prompt "Step 1" --prompt "Step 2"
```

## History and logs

```bash
./oryan history
./oryan log 1
```
