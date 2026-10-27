# Git workflow

- Treat `staging` as the base branch for new work. Before starting a change, fetch the latest remote state and create a new `codex/` feature branch from `origin/staging`.
- Make commits on the feature branch and push that branch to `origin`. Never commit or push task changes directly to `staging` or `main`.
- Leave the feature branch available for the user to open a pull request into `staging` when ready. Create that pull request only if the user asks for it.
- Promotion to `main` happens through a separate pull request from `staging` to `main`, initiated by the user. Do not merge or push directly to `main`.
- If work begins in an existing checkout with uncommitted changes, preserve those changes while establishing the feature branch; do not discard or overwrite them.
