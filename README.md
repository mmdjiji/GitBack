# GitBack

> The primary repository is hosted at [cnb.cool/mmdjiji/GitBack](https://cnb.cool/mmdjiji/GitBack) — please submit all issues and pull requests there. The GitHub repository is a read-only mirror.

**English** | [简体中文](./README_zh.md)

A Git-based code backup system that supports scheduled automatic backups from GitHub, GitLab, CNB, and any Git repository, with a built-in CGit web interface for browsing.

## Features

- GitHub / GitHub Enterprise
- GitLab / Self-hosted GitLab
- CNB.cool
- Any Git repository URL
- Scheduled automatic backup (cron expressions)
- Stateless, one-command Docker deployment
- Built-in CGit web interface for browsing backups

## Quick Start

### 1. Clone the repository

```bash
git clone https://cnb.cool/mmdjiji/GitBack
cd GitBack
```

### 2. Create the configuration file

```bash
cp config.yaml.example config.yaml
```

### 3. Edit the configuration file

Edit `config.yaml` to add your access tokens and configure backup sources. Note that the top-level YAML key names correspond to the backup folder names.

```yaml
# Trigger
on:
  cron: 0 0 * * *  # Run backup daily at midnight

# GitHub backup configuration
github:
  type: github
  access_token: your_github_token  # Requires read:org, repo scopes (for Fine-grained tokens, at least Contents and Metadata read-only)
  owned: true          # Back up repos you own
  starred: true        # Back up repos you starred
  collaborator: true   # Back up repos you collaborate on
  org_member: true     # Back up repos from your organizations

# GitLab backup configuration
gitlab:
  type: gitlab
  access_token: your_gitlab_token  # Requires api scope
  owned: true          # Back up repos you own
  starred: true        # Back up repos you starred
  member: true         # Back up repos from your teams

# CNB backup configuration
cnb:
  type: cnb
  access_token: your_cnb_token  # Requires repo-code:r, repo-basic-info:r, account-engage:r scopes
  owned: true          # Back up repos you own
  starred: true        # Back up repos you starred
  member: true         # Back up repos from your teams

# Specify repository URLs directly
repo:
  type: repo
  include:
    - https://example.com/some-repo.git
```

Token creation links:

- GitHub: https://github.com/settings/tokens/new?scopes=repo,read:org
- GitLab: https://gitlab.com/-/profile/personal_access_tokens
- CNB: https://docs.cnb.cool/en/guide/access-token.html

### 4. Start the service

```bash
docker compose up -d
```

Once started:

- The **gitback** container will back up repositories to `./repos` on the configured cron schedule
- The **cgit** container provides a web interface at http://localhost:8787 for browsing backups

## Rate Limiting

To avoid triggering platform limits (e.g., GitHub's CPU quota: connections are dropped if operations consume more than 90 seconds of CPU time within a 60-second window), GitBack has two levels of built-in rate limiting:

### Interval Limiting

A minimum gap is enforced between consecutive git operations:

| Domain | Max Concurrency | Min Interval |
|--------|----------------|-------------|
| github.com | 1 | 10s |
| gitlab.com | 1 | 8s |
| cnb.cool | 1 | 8s |
| Self-hosted / other | 3 | 2s |

### Sliding Window Limiting

On top of interval limiting, a per-minute sliding window prevents excessive requests when backing up large numbers of repositories:

| Domain | Window Duration | Max Operations per Window |
|--------|----------------|--------------------------|
| github.com | 60s | 5 |
| gitlab.com | 60s | 6 |
| cnb.cool | 60s | 6 |
| Self-hosted / other | 60s | 20 |

When the sliding window limit is reached, subsequent tasks are automatically queued until the window expires.

Rate limiting is built-in and requires no additional configuration.

## CGit Web Interface

Configure CGit via environment variables in `compose.yaml`:

```yaml
environment:
  - CGIT_TITLE=GitBack           # Page title
  - CGIT_DESC=Git backup system  # Page description
  # - BASIC_AUTH_USER=admin      # Basic auth username (optional)
  # - BASIC_AUTH_PASS=12345678   # Basic auth password (optional)
```

## License

MIT
