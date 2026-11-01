# Innate Agg

这个目录是一个 innate-apps 项目聚合的目录，主要包括了日常开发的工具、应用，还有参考项目。
当前主要想处理的问题是：
1. 把零散的项目汇总到一起
2. 统一更新和管理项目，然后把日常可能使用的 SKILL 也一起汇总在这个目录
3. 进行统一的开发框架管理和注册项目信息。

也就是形成一个类似 hub 的内容。

## 第一个想法

当前 innate-daily 项目中有 collections 的模块，因此先完成一个 collections 自动注册功能，
也就是把当前目录中确定已经一直在维护的项目进行一个注册到 innate-daily 的 cli 工具。所以先分析：
1. collections 接入的 structure 是什么
2. 获取目录和 github 信息然后进行转化
3. 这是一个 cli 命令的方式，需要支持 windows/linux/macos
4. 需要使用 task driven skill 进行开发
5. 目前有一个问题就是还不知道全局变量里面有多少 skill，因此需要 spark-cli 先要查找这些 skill，然后把这些 skill 列出来之后可以复制到指定位置
6. 所以其实需要实现两个事情：
    - 查找所有可能的 SKILL
    - 可以一个命令全部清空和复制出来
    - 或者已经有可替代的工具了，就说明是那几个
    - 给 innate-apps 扫描变成可以注册的项目信息给 innate-daily 使用

## Task： 当前项目状态 ✅ (issue#1)

1. [基础仓库](../../base) 目录中，前端和后端开发，还有一个基础的 innate-desktop 项目
2. 当前开发的 apps 目前维护中的有在本目录
   - innate-daily
   - innate-fe-example
   - innate-vytdl
   - innate-feeds
   - spark-cli

这些信息先作为 collections 的注册信息，同时声明维护中、公开或者私有。

### 实现方式：registry（非 git submodule）

项目信息以 registry 数据文件的方式记录在 [`registry/apps.json`](../../registry/apps.json)，
字段定义见 [`registry/schema.json`](../../registry/schema.json)，说明见 [`registry/README.md`](../../registry/README.md)。

registry 同步刷新到：
1. `qdriven/qdriven`（用户 profile 仓库）
2. `variableway/.github`（org profile 仓库）
3. 本仓库 README（标注基础框架 vs 应用开发）

docs 目录可以更新。开发时候 worktree 开发不需要复制启发项目，只需要查找信息的时候到 main
所在的目录进行查找就可以，所有需要查找的内容都是到 main 所在目录进行查找，相对目录都是从 main 所在目录的。

### Collections 注册信息（2026-11）

Apps（维护中，public）：

| name | repo |
|------|------|
| innate-daily | variableway/innate-daily |
| innate-fe-examples | qdriven/innate-fe-examples |
| innate-vytdl | qdriven/innate-vytdl |
| innate-feeds | variableway/innate-feeds |
| spark-cli | variableway/spark-cli |

Base（维护中，public）：

| name | repo |
|------|------|
| innate-fe | variableway/innate-fe |
| innate-backend | variableway/innate-backend |
| innate-desktop | qdriven/innate-susu |
