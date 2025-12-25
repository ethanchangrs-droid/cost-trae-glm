---
alwaysApply: false
description: 所有git提交都必须遵守此规范；如果不执行git提交任务，则无需遵守此规范
---
# Git 使用规范

## Commit 格式
- 使用约定式提交格式：<type>(<scope>): <subject>
- type 类型：feat（新功能）、fix（修复）、docs（文档）、style（格式）、refactor（重构）、test（测试）、chore（构建/工具）
- subject 使用祈使句，首字母小写，不超过50字符，结尾不加句号

## Commit 原则
- 原子性：一个 commit 只做一件事
- 完整性：每个 commit 应是可工作的状态
- 频繁提交：小步快走，不要积累大量改动

## 分支命名
- feature/*：功能分支，如 feature/B-001-user-auth
- bugfix/*：缺陷修复，如 bugfix/B-045-login-error
- hotfix/*：紧急修复，如 hotfix/fix-crash


## Git 工作流
1. **开发前**：拉取最新代码，创建功能分支
2. **开发中**：频繁提交，保持 commit 原子性
3. **开发后**：推送分支，创建 PR，进行代码审查
4. **合并后**：删除功能分支，更新本地 main 分支