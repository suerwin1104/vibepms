---
name: skill-creator
description: GUIDE user through the skill creation process. Use this skill when the user wants to create a new skill or modify an existing one. This skill provides the standard process and best practices for defining agent skills.
---

# Skill Creator

This skill provides guidance for creating effective skills.

## Core Principles

### Anatomy of a Skill

Every skill consists of a required `SKILL.md` file and optional bundled resources:

```
skill-name/ 
├── SKILL.md (required) 
│ ├── YAML frontmatter metadata (required) 
│ │ ├── name: (required) 
│ │ └── description: (required) 
│ └── Markdown instructions (required) 
└── Bundled Resources (optional) 
├── scripts/ - Executable code (Python/Bash/etc.) 
├── references/ - Documentation intended to be loaded into context as needed 
└── assets/ - Files used in output (templates, icons, fonts, etc.)
```

## Skill Creation Process

Follow these steps to create a high-quality skill:

### Step 1: Understanding the Skill with Concrete Examples

Skip this step only when the skill's usage patterns are already clearly understood.
To create an effective skill, clearly understand concrete examples of how the skill will be used.

- Ask: "What functionality should this skill support?"
- Ask: "Can you give some examples of how this skill would be used?"
- Ask: "What would a user say that should trigger this skill?"

### Step 2: Planning the Reusable Skill Contents

Analyze each example to identify reusable resources:

1. Identify how to execute the example from scratch.
2. Identify what `scripts/`, `references/`, and `assets/` would be helpful.

**Examples:**

- **PDF Editor**: Needs `scripts/rotate_pdf.py` to avoid rewriting code.
- **Webapp Builder**: Needs `assets/hello-world/` template for boilerplate.
- **BigQuery**: Needs `references/schema.md` for table definitions.

### Step 3: Initializing the Skill (Manual Implementation)

Since you are an agent, you will manually create the skill structure:

1. Create directory: `.agent/skills/<skill-name>/`
2. Create `SKILL.md` with:
   - Frontmatter (YAML): `name` and `description`.
   - Body (Markdown): Instructions.
3. Create subdirectories `scripts/`, `references/`, `assets/` if planned.

### Step 4: Edit the Skill

Include information beneficial and non-obvious to the agent.

- **Design Patterns**: Use established patterns for workflows or outputs.
- **Reusable Contents**: specific implementations for scripts/assets.
- **Update SKILL.md**:
  - **Frontmatter**: `name` (skill name) and `description` (when to use, specific triggers).
  - **Body**: Imperative instructions for using the skill.

### Step 5: Packaging / Validation

Ensure:

- YAML frontmatter is valid.
- Directory structure is correct.
- Description provided in frontmatter is comprehensive (it's the only thing read for triggering).
- No extraneous files (README, etc).

### Step 6: Iterate

Refine based on usage.
