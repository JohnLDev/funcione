# Repository Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for this sequential Git migration. Do not use parallel agents for the push/branch operations because the steps mutate the same remote repository.

**Goal:** Preserve the existing `JohnLDev/funcione` remote `main` as `old-main`, then publish the current Funcione project as the new remote `main`.

**Architecture:** Treat the GitHub repository as the canonical destination. First create a remote backup branch from the current remote `main`, then commit the current local workspace state, then replace remote `main` using `--force-with-lease`.

**Tech Stack:** git, GitHub CLI, npm workspaces.

## Global Constraints

- Do not use destructive local commands such as `git reset --hard` or `git checkout --`.
- Preserve existing local workspace changes by committing them before publishing.
- Verify the remote backup branch exists before replacing `main`.
- Use `--force-with-lease`, not plain `--force`.

---

### Task 1: Prepare Remote Context

**Files:** none.

- [x] **Step 1: Re-check local and remote state**

Run: `git status --short --branch`, `git remote -v`, `git ls-remote --heads https://github.com/JohnLDev/funcione.git`.

Expected: local branch is `main`; remote has `refs/heads/main`; workspace has existing changes to preserve.

- [x] **Step 2: Add or update origin**

If no `origin` remote exists, run: `git remote add origin https://github.com/JohnLDev/funcione.git`.
If origin exists with another URL, stop and ask before changing it.

- [x] **Step 3: Fetch target remote**

Run: `git fetch origin main`.

Expected: `origin/main` points to the current remote project.

### Task 2: Preserve Old Remote Main

**Files:** none.

- [x] **Step 1: Confirm `old-main` does not already exist**

Run: `git ls-remote --heads origin old-main`.

Expected: no output. If it exists, stop and ask whether to use `old-main-YYYYMMDD` instead.

- [x] **Step 2: Push backup branch**

Run: `git push origin refs/remotes/origin/main:refs/heads/old-main`.

Expected: remote branch `old-main` is created.

- [x] **Step 3: Verify backup branch**

Run: `git ls-remote --heads origin old-main main`.

Expected: `old-main` hash matches the original `main` hash observed before replacement.

### Task 3: Commit Current Project State

**Files:** all current project changes.

- [x] **Step 1: Run full verification**

Run: `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build`.

Expected: all commands exit 0.

- [x] **Step 2: Stage current project**

Run: `git add -A`.

Expected: all intended project changes are staged.

- [x] **Step 3: Commit current project**

Run: `git commit -m "feat: prepare funcione monorepo"`.

Expected: a new local commit exists on `main`.

### Task 4: Replace Remote Main

**Files:** none.

- [x] **Step 1: Push local main over remote main safely**

Run: `git push --force-with-lease=refs/heads/main:<original-main-hash> origin main:main`.

Expected: remote `main` now points to the local Funcione project commit.

- [x] **Step 2: Verify remote branches**

Run: `git ls-remote --heads origin main old-main` and `gh repo view JohnLDev/funcione --json defaultBranchRef,url,pushedAt`.

Expected: `main` points to the new commit, `old-main` points to the preserved old project, and default branch remains `main`.
