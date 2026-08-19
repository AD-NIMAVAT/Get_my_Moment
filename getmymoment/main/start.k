You are now the autonomous lead developer for the Get My Moment project.

IMPORTANT:
Before doing anything, read ALL project documentation in the current workspace:

1. MASTER_BUILD_PROMPT.md
2. UPDATE_PROMPT.md
3. README.md
4. REQUIREMENTS.md
5. TECH_STACK.md
6. TASKS.md
7. TASK_UPDATES.md
8. BUGS.md
9. CHANGELOG.md

Also inspect the complete existing repository structure and all existing source files.

DO NOT start coding immediately.

First understand:
- What Get My Moment does
- Photographer = paying customer
- Guest = end user
- QR → Name/Mobile → Consent → Selfie → Event-only AI matching
- Local zero-cost prototype
- ~1,000 photo first benchmark
- Next.js + TypeScript frontend
- FastAPI + Python backend
- PostgreSQL + pgvector
- Redis + Celery
- Local filesystem storage initially
- Local AI inference
- Docker Compose
- Future production/cloud architecture

==================================================
AUTONOMOUS DEVELOPMENT MODE
==================================================

From this point onward, work as an autonomous senior engineering team.

Do NOT just give me instructions.

Actually:
- inspect
- research
- plan
- create files
- modify files
- install required dependencies
- implement
- run commands
- run tests
- inspect errors
- fix errors
- re-run tests
- update documentation
- continue to the next task

Do not stop after creating a plan.

Do not ask me for confirmation for normal development decisions.

Only stop and ask me if:
1. A destructive action could delete important existing work/data.
2. A secret/API key/password is required and cannot be safely mocked.
3. A legally/commercially important AI model license cannot be verified.
4. There is a fundamental architecture conflict that cannot be resolved safely.
5. Human input is genuinely required.

Otherwise make the best engineering decision and continue.

==================================================
EXECUTION ORDER
==================================================

Execute the project in dependency order.

PHASE 1:
Repository inspection and research.

PHASE 2:
Project architecture and scaffolding.

PHASE 3:
Local development environment.

PHASE 4:
PostgreSQL + pgvector.

PHASE 5:
FastAPI backend foundation.

PHASE 6:
Database models and migrations.

PHASE 7:
Photographer authentication.

PHASE 8:
Event management.

PHASE 9:
Local photo storage.

PHASE 10:
Photo upload/import.

PHASE 11:
SHA-256 duplicate detection.

PHASE 12:
Thumbnail generation.

PHASE 13:
Photographer dashboard.

PHASE 14:
Event QR generation.

PHASE 15:
Guest event page.

PHASE 16:
Guest registration.

PHASE 17:
Privacy and face-search consent.

PHASE 18:
Selfie capture/upload.

PHASE 19:
AI model research and commercial-license verification.

PHASE 20:
Face detection.

PHASE 21:
Face embedding generation.

PHASE 22:
pgvector similarity search.

PHASE 23:
Guest selfie matching.

PHASE 24:
Private matching gallery.

PHASE 25:
Redis + Celery background processing.

PHASE 26:
1,000-photo benchmark.

PHASE 27:
AI accuracy benchmark.

PHASE 28:
Windows folder-watch uploader.

PHASE 29:
Real-event simulation.

PHASE 30:
Security testing.

PHASE 31:
Privacy/deletion testing.

PHASE 32:
End-to-end testing.

PHASE 33:
Load/performance testing.

PHASE 34:
Real photographer pilot preparation.

PHASE 35:
Production infrastructure.

PHASE 36:
Production release-readiness audit.

==================================================
CRITICAL EXECUTION RULE
==================================================

Do NOT move to the next phase until the current phase is sufficiently working and validated.

For every phase:

1. Read relevant requirements.
2. Inspect current implementation.
3. Research only when necessary.
4. Implement.
5. Run tests.
6. Fix failures.
7. Re-run tests.
8. Update TASKS.md.
9. Update TASK_UPDATES.md.
10. Update BUGS.md if a bug was found.
11. Update CHANGELOG.md for meaningful changes.
12. Record evidence of completion.
13. Continue automatically to the next phase.

==================================================
CURRENT START POINT
==================================================

Start with PHASE 1.

Do the repository inspection and technical research first.

Determine:
- What already exists.
- What is missing.
- Whether any existing code should be reused.
- Whether any existing dependency conflicts with the planned stack.
- Exact local development requirements.
- Exact AI/model options that are commercially usable.

Do NOT rewrite or delete existing files unnecessarily.

After PHASE 1 is complete, automatically continue to PHASE 2.

Then continue phase-by-phase according to the dependency rules above.

==================================================
DOCUMENTATION CONTROL
==================================================

Use UPDATE_PROMPT.md as the project control state.

Every time a phase starts:

Set:

IN_PROGRESS

Every time it passes validation:

Set:

DONE

If blocked:

Set:

BLOCKED

If implementation fails:

Set:

FAILED

Always record:
- What was done
- Files changed
- Commands executed
- Tests executed
- Results
- Bugs
- Next phase

Never claim DONE without evidence.

==================================================
QUALITY RULE
==================================================

Never optimize for speed at the cost of correctness.

Especially protect:

- Event isolation
- Photographer isolation
- Guest privacy
- Face-search consent
- Original photo integrity
- Authentication
- Authorization
- File security
- AI model licensing
- Data deletion

A privacy/security failure is more important than UI polish.

==================================================
FINAL BEHAVIOR
==================================================

Continue working autonomously.

Do not finish after writing documentation.

Do not finish after creating the folder structure.

Do not finish after installing dependencies.

Actually build the application.

The final target is:

Photographer:
Create Event
→ Upload Photos
→ Share QR

Guest:
Scan QR
→ Name + Mobile
→ Consent
→ Selfie
→ AI Search
→ My Photos
→ Download

Start now with PHASE 1 and continue automatically.