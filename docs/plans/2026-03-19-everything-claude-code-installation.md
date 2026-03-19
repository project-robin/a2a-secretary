# everything-claude-code Installation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Install the `everything-claude-code` plugin and rules to enhance Claude Code with 100+ components.

**Architecture:** Use the native Claude Code plugin marketplace for agents, skills, and commands, with a manual rule installation for TypeScript and common rules.

**Tech Stack:** Claude Code CLI v2.1.0+, Node.js, Git.

---

### Task 1: Verify Prerequisites

**Files:**
- N/A

**Step 1: Verify Claude Code version**

Run: `claude --version`
Expected: `2.1.0` or higher (Current: `2.1.79`)

**Step 2: Verify existing directories**

Run: `mkdir -p ~/.claude/rules ~/.claude/agents ~/.claude/skills ~/.claude/commands`

**Step 3: Commit**

```bash
# No files to commit, just skip to next task.
```

---

### Task 2: Add Marketplace Source

**Files:**
- Modify: `~/.claude/settings.json`

**Step 1: Add marketplace via command**

Run: `/plugin marketplace add affaan-m/everything-claude-code`
Expected: `Added marketplace: affaan-m/everything-claude-code`

**Step 2: Verify settings.json**

Run: `grep -A 5 "extraKnownMarketplaces" ~/.claude/settings.json`
Expected: `everything-claude-code` present with source `github` and repo `affaan-m/everything-claude-code`.

---

### Task 3: Install ECC Plugin

**Files:**
- Modify: `~/.claude/settings.json`

**Step 1: Install plugin via command**

Run: `/plugin install everything-claude-code@everything-claude-code`
Expected: `Installed plugin: everything-claude-code@everything-claude-code`

**Step 2: Verify plugin status**

Run: `/plugin list everything-claude-code@everything-claude-code`
Expected: `everything-claude-code@everything-claude-code` is enabled with agents, skills, and commands.

---

### Task 4: Clone ECC Repository (Temporary)

**Files:**
- Create: `temp-ecc/` (temporary)

**Step 1: Clone the repository**

Run: `git clone https://github.com/affaan-m/everything-claude-code.git temp-ecc`
Expected: `Cloning into 'temp-ecc'...`

---

### Task 5: Install Common Rules

**Files:**
- Modify: `~/.claude/rules/`

**Step 1: Copy common rules**

Run: `cp -r temp-ecc/rules/common/*.md ~/.claude/rules/`
Expected: Files copied successfully.

**Step 2: Verify files**

Run: `ls ~/.claude/rules/`
Expected: `agents.md`, `coding-style.md`, `development-workflow.md`, `git-workflow.md`, `hooks.md`, `patterns.md`, `performance.md`, `security.md`, `testing.md` present.

---

### Task 6: Install TypeScript Rules

**Files:**
- Modify: `~/.claude/rules/`

**Step 1: Copy TypeScript rules**

Run: `cp -r temp-ecc/rules/typescript/*.md ~/.claude/rules/`
Expected: Files copied successfully.

**Step 2: Verify files**

Run: `ls ~/.claude/rules/typescript.md`
Expected: `typescript.md` present (if it exists as a single file or a directory).
*Note: Based on wiki, it might be in `rules/typescript/`.*

---

### Task 7: Cleanup Temporary Files

**Files:**
- Delete: `temp-ecc/`

**Step 1: Remove temporary clone**

Run: `rm -rf temp-ecc`
Expected: Directory removed.

---

### Task 8: Verification & Configuration

**Files:**
- N/A

**Step 1: Run verification checklist**

Run: `/everything-claude-code:help`
Expected: Show ECC help content.

**Step 2: Launch interactive wizard**

Run: `/everything-claude-code:configure-ecc`
Expected: Interactive wizard starts. Follow prompts to verify rules and optimize setup.
