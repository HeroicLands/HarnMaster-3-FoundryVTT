#!/usr/bin/env sh
#
# Shared guard: refuse to create a commit while HEAD is on a protected branch.
#
# Sourced by the pre-commit and pre-merge-commit hooks, which are two hooks for
# one rule: git runs pre-merge-commit *instead of* pre-commit when the commit is
# a merge, so a repository that guards only pre-commit still lets a stray
# `git pull` on main write a merge commit.
#
# Why guard at commit time at all: `main` is protected on GitHub in every
# HeroicLands repository — changes land by pull request, squash-merged, never by
# a direct push. That protection fires at *push* time, by which point the commit
# already exists on the local branch and has to be moved off it. This moves the
# refusal forward to the point where the fix is still just "branch first".
#
# It is an accident guard, not a security control. `git commit --no-verify`
# bypasses it, and a repository that genuinely wants commits on its default
# branch opts out with `git config hooks.allowCommitOnMain true`.
#
# Known gap: `git cherry-pick` and `git revert` run neither hook, and a rebase
# replays commits with HEAD detached (deliberately allowed below).
#
# This file is copied verbatim into every HeroicLands repository, for the same
# reason the commit-msg hook is: a hook runs from your checkout, so it cannot be
# shared through a GitHub Action. Keep the copies identical.

guard_protected_branch() {
    # Per-repository opt-out.
    if [ "$(git config --bool hooks.allowCommitOnMain 2>/dev/null)" = "true" ]; then
        return 0
    fi

    # Detached HEAD — a rebase, a bisect, or an explicit checkout of a commit.
    # There is no branch to protect, and refusing here would break `git rebase`.
    branch="$(git symbolic-ref --quiet --short HEAD)" || return 0

    case "$branch" in
        main | master) ;;
        *) return 0 ;;
    esac

    cat >&2 <<EOF
$(basename "$0"): refusing to commit on the protected branch '$branch'.

'$branch' is protected on GitHub, so this commit could never be pushed from
here. Move it onto a branch first — this keeps everything you have staged:

    git switch -c <type>/<issue_#>_<slug>

To commit here anyway just this once, use 'git commit --no-verify'. To opt this
repository out permanently, 'git config hooks.allowCommitOnMain true'.
EOF
    return 1
}
