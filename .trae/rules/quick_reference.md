# 快速参考指南

## 文件职责快速参考

| 文件 | 职责 | 查询时机 | 使用命令 |
|------|------|---------|---------|
| **feature_list.json** | 唯一任务清单 | 想知道"还有什么要做" | `cat feature_list.json` |
| claude-progress.txt | 会话历史日志 | 想知道"上次做了什么" | `cat claude-progress.txt` |
| PRD/SPEC/UI | 需求与设计说明 | 想知道"功能怎么定义" | 查看 docs/ 目录 |
| README.md | 项目说明文档 | 想知道"项目怎么用" | `cat README.md` |

## 记住口诀
- 📋 **查任务** → feature_list.json
- 📝 **查进度** → claude-progress.txt  
- 📖 **查需求** → PRD/SPEC/UI


## 文档结构速查

```
.trae/rules/                           # 开发规范目录
├── coding_standards.md               # 代码编写规范
├── git_standards.md                  # Git使用规范
├── testing_standards.md              # 测试规范
├── bug_fix_standards.md              # Bug修复规范
├── project_management.md              # 项目管理流程
└── quick_reference.md                # 快速参考（本文件）

docs/                                  # 项目文档目录
├── README.md                          # 项目说明
├── 费用报销系统PRD_*.md               # 产品需求文档
├── 费用报销系统SPEC_*.md              # 技术规格文档
└── 费用报销系统UI设计_*.md            # UI设计文档

logs/                                  # 日志目录
└── *_日志_*.md                        # 各种任务日志

feature_list.json                      # 功能任务清单
claude-progress.txt                    # 会话进度记录
init.sh                               # 环境初始化脚本
```

## 开发规范文件对应关系

| 场景 | 规范文件 | 主要内容 |
|------|----------|----------|
| 编写代码 | coding_standards.md | 开发原则、代码规范、API集成 |
| 使用Git | git_standards.md | Commit格式、分支管理、工作流 |
| 进行测试 | testing_standards.md | 前后端测试方法、测试流程 |
| 修复Bug | bug_fix_standards.md | 修复流程、回退机制、预防措施 |
| 管理项目 | project_management.md | 开发流程、文件使用、进度管理 |
| 快速查阅 | quick_reference.md | 文件职责、常用命令、紧急处理 |