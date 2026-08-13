# AITI — AI Interaction Type Indicator

> MBTI 测你是什么人，AITI 测你如何与 AI 相处。

AITI 是一个中文互联网娱乐型人格测试。用户通过 24 个真实 AI 使用情境，得到一种 AI 互动人格、MBTI 式偏好码、九维行为分析，以及相邻人格结果。

![AITI preview](./public/og.png)

## 功能

- 24 道逐题情境测试，支持数字键快速作答
- 15 种常规人格、3 种隐藏人格和 1 种兜底结果
- MBTI 式 E/I、S/N、T/F、J/P 偏好分析
- 追新、信任、委托、身份投射、使用强度五个 AI 专属维度
- 结果解释、优势、盲点及相邻人格
- 19 种人格图鉴与详情页
- 复制分享文案和下载 1:1 结果卡
- 移动端响应式布局

## 本地运行

需要 Node.js `>=22.13.0`。

```bash
npm install
npm run dev
```

访问 `http://localhost:3000`。

生产构建：

```bash
npm run build
```

## 项目结构

```text
app/
  AitiApp.tsx       页面与交互
  scoring.ts        九维计分与人格匹配
  data/             Profile 与题目数据
public/profiles/    Web 优化后的人格图片
scripts/            内容同步脚本
```

上游原始题库和高清 Profile 图片位于父项目的 `test/` 与 `profiles/` 目录；当前仓库包含运行网站需要的同步副本。

## 测试模型

AITI 使用九维向量：

- MBTI 式四维：`EI`、`SN`、`TF`、`JP`
- AI 行为五维：`NV` 追新、`TR` 信任、`AG` 委托、`ID` 身份投射、`IN` 使用强度

选项得分会先按题目中心化，再与 15 个主人格原型进行加权余弦相似度匹配。隐藏人格需要特殊答案与全卷倾向同时成立。

这里的 MBTI 仅作为通俗的偏好语言，不代表正式心理测量结论。AITI 不用于心理诊断、招聘或重要决策。

## 内容与图片

AITI 的人格名称、文案、题目和人物图片为项目原创内容。未经许可，请勿将图片或人格素材作为独立素材包再分发或用于商业训练数据。
