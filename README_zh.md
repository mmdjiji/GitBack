# GitBack

基于 Git 的代码备份系统，支持定时自动备份 GitHub、GitLab、CNB 及任意 Git 仓库，并通过 cgit 提供 Web 浏览界面。

## 功能特性

- 支持 GitHub / GitHub Enterprise
- 支持 GitLab / GitLab 自部署
- 支持 CNB.cool
- 支持任意 Git 仓库地址
- 定时自动备份（cron 表达式）
- 内置 cgit Web 界面浏览备份仓库

## 快速开始

### 1. 克隆仓库

```bash
git clone https://cnb.cool/mmdjiji/GitBack
cd GitBack
```

### 2. 创建配置文件

```bash
cp config.yaml.example config.yaml
```

### 3. 编辑配置文件

根据需要编辑 `config.yaml`，填入你的访问令牌并配置备份源：

```yaml
# 触发器
on:
  cron: 0 0 * * *  # 每天凌晨执行备份

# GitHub 备份配置
github:
  type: github
  access_token: your_github_token  # 需要 read:org, repo 权限（如果是 Fine-granted tokens 就至少包含 Contents 和 Metadata 的只读权限）
  owned: true          # 备份自己拥有的仓库
  starred: true        # 备份加星标的仓库
  collaborator: true   # 备份作为协作者的仓库
  org_member: true     # 备份所属组织的仓库

# GitLab 备份配置
gitlab:
  type: gitlab
  access_token: your_gitlab_token  # 需要 api 权限
  owned: true          # 备份自己拥有的仓库
  starred: true        # 备份加星标的仓库
  member: true         # 备份所属团队的仓库

# CNB 备份配置
cnb:
  type: cnb
  access_token: your_cnb_token  # 需要 repo-code:r, repo-basic-info:r, account-engage:r 权限
  owned: true          # 备份自己拥有的仓库
  starred: true        # 备份加星标的仓库
  member: true         # 备份所属团队的仓库

# 直接指定仓库地址
repo:
  type: repo
  include:
    - https://example.com/some-repo.git
```

各平台令牌创建地址：

- GitHub: https://github.com/settings/tokens/new?scopes=repo,read:org
- GitLab: https://gitlab.com/-/profile/personal_access_tokens
- CNB: https://docs.cnb.cool/en/guide/access-token.html

### 4. 启动服务

```bash
docker compose up -d
```

启动后：

- **gitback** 容器将按照 cron 表达式定时备份仓库到 `./repos` 目录
- **cgit** 容器提供 Web 界面，访问 http://localhost:8787 浏览备份的仓库

## cgit Web 界面

通过 `compose.yaml` 中的环境变量配置 cgit：

```yaml
environment:
  - CGIT_TITLE=GitBack           # 页面标题
  - CGIT_DESC=描述信息            # 页面描述
  # - BASIC_AUTH_USER=admin      # 基本认证用户名（可选）
  # - BASIC_AUTH_PASS=12345678   # 基本认证密码（可选）
```

## 许可证

MIT
