# Design: Everything Claude Code Installation

**Date**: 2026-03-19
**Topic**: Installing `everything-claude-code` plugin and rules.

## Overview
Install the `everything-claude-code` (ECC) system to enhance Claude Code with specialized agents, skills, commands, and rules. The goal is to provide a full installation with TypeScript-specific and common rules.

## Approach: Native Plugin Marketplace
The recommended approach is to use the native Claude Code plugin marketplace system for agents, skills, commands, and hooks, supplemented by a manual rule installation.

### Components
- **Agents**: 14+ specialized agents (e.g., `planner`, `code-reviewer`).
- **Skills**: 56+ workflow definitions.
- **Commands**: 33+ slash commands.
- **Hooks**: Auto-loaded lifecycle hooks for pattern detection and continuous learning.
- **Rules**: Common and TypeScript-specific rules for project consistency.

### Data Flow
1.  **Marketplace**: `affaan-m/everything-claude-code` registered in `~/.claude/settings.json`.
2.  **Plugin Runtime**: Files distributed from GitHub to `~/.claude/` subdirectories.
3.  **Hooks**: Auto-loaded by Claude Code v2.1.0+ from the plugin directory.
4.  **Rules**: Manually copied from source to `~/.claude/rules/`.

## Success Criteria
- [ ] `/plugin list everything-claude-code@everything-claude-code` shows enabled status.
- [ ] `/plan` and `/tdd` commands are available and functional.
- [ ] TypeScript and common rules are present in `~/.claude/rules/`.
- [ ] No duplicate hook errors on startup.

## Risk Assessment
- **Hook Conflicts**: Version 2.1.0+ auto-loads hooks; explicit declarations in `plugin.json` must be avoided (ECC handles this).
- **Context Overhead**: Too many tools can reduce context window. Mitigated by `disabledMcpServers` and selective activation.
- **Rule Distribution**: Rules cannot be distributed via plugins; manual cloning and copying is required.
