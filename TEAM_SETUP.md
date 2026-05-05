# Agency‑Agents Team Setup Guide

## Overview
This project now includes the **Agency‑Agents** library, providing a ready‑to‑use AI team of specialist agents (Project Manager, Backend Architect, Frontend Developer, Growth Hacker, Rapid Prototyper, Reality Checker, etc.). All agents are installed under `./.opencode/agents/` and can be invoked directly in OpenCode conversations using the `@` syntax.

## Verification
```bash
# Verify the agents are present
ls .opencode/agents | wc -l   # should show ~180 agents
```
If you see the list of markdown files, the installation succeeded.

## Core Team Members
| Role | Agent file | Brief purpose |
|------|------------|----------------|
| **Senior Project Manager** | `senior-project-manager.md` | Converts specs into realistic task lists, remembers previous projects. |
| **Backend Architect** | `backend-architect.md` | Designs scalable micro‑service architecture, produces OpenAPI specs. |
| **Frontend Developer** | `frontend-developer.md` | Generates UI component code (FluxUI, Laravel Blade, Alpine.js). |
| **Growth Hacker** | `growth-hacker.md` | Creates acquisition A/B tests, KPI dashboards. |
| **Rapid Prototyper** | `rapid-prototyper.md` | Builds high‑fidelity clickable prototypes. |
| **Reality Checker** | `reality-checker.md` | Performs risk, security and performance assessments before launch. |
| **Other specialists** | See the full list in `.opencode/agents/` for UI‑Designer, Data‑Engineer, DevOps‑Automator, etc. |

## How to Invoke an Agent
In any OpenCode interaction, type `@Agent Name` (case‑insensitive). OpenCode will load the corresponding markdown definition and let the agent respond.

**Example:**
```
@Senior Project Manager
We need a simple MVP for a SaaS landing page with a signup form and admin dashboard.
```
The Project Manager will return a task list with acceptance criteria, then you can forward each task to the appropriate specialist:
```
@Backend Architect
Please design the API for the signup flow (POST /signup) and admin data endpoints.
```
```
@Frontend Developer
Create the landing page UI using FluxUI components based on the API spec.
```
Continue until all tasks are completed, then ask the Reality Checker to review the final product.

## Example End‑to‑End MVP Workflow
1. **Project Initiation** – `@Senior Project Manager` receives the product brief and produces a task list.
2. **Backend Design** – `@Backend Architect` outputs OpenAPI 3.1 docs.
3. **Frontend Implementation** – `@Frontend Developer` writes Blade templates, CSS and Alpine.js logic.
4. **Growth Planning** – `@Growth Hacker` drafts acquisition experiments and KPI tracking.
5. **Prototyping** – `@Rapid Prototyper` supplies a clickable prototype for stakeholder review.
6. **Final QA** – `@Reality Checker` delivers a risk & performance checklist.

After the agents finish, the Project Manager can ask you to compile the outputs into a single MVP execution report.

## Quick Commands Recap
```bash
# Re‑run conversions (if you add new agents)
sh ./scripts/convert.sh --tool opencode
# Re‑install to the project root
sh ./scripts/install.sh --tool opencode --no-interactive
```

Now you can start collaborating with your AI team! Feel free to add or remove agents by copying or deleting the markdown files in `.opencode/agents/`.
