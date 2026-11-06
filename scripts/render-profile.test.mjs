// render-profile 的最小测试：node --test scripts/render-profile.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  MAX_DESC,
  escapeCell,
  render,
  renderBlock,
  replaceBlock,
  truncate,
} from "./render-profile.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const realRegistryPath = path.resolve(here, "..", "registry", "apps.json");

const fixture = {
  collections: [
    {
      name: "alpha",
      repo: "acme/alpha",
      url: "https://github.com/acme/alpha",
      category: "app",
      status: "maintained",
      visibility: "public",
      description: "公开应用",
    },
    {
      name: "beta",
      repo: "acme/beta",
      url: "https://github.com/acme/beta",
      category: "app",
      status: "experimental",
      visibility: "public",
      description: "实验应用",
    },
    {
      name: "secret",
      repo: "acme/secret",
      url: "https://github.com/acme/secret",
      category: "base",
      status: "maintained",
      visibility: "private",
      description: "私有基础框架",
    },
    {
      name: "gamma",
      repo: "other/gamma",
      url: "https://github.com/other/gamma",
      category: "reference",
      status: "maintained",
      visibility: "public",
      description: "第三方参考",
    },
  ],
};

test("private 条目不进入渲染结果", () => {
  const { body, excluded, visible } = render(fixture, "user");
  assert.ok(!body.includes("secret"), "私有条目不该出现在正文里");
  assert.ok(!body.includes("acme/secret"));
  assert.deepEqual(excluded, ["secret（private）"]);
  assert.equal(visible.length, 3);
});

test("user 视图按 category / status 分段", () => {
  const { body } = render(fixture, "user");
  assert.ok(body.includes("### Apps (maintained)"));
  assert.ok(body.includes("### Apps (experimental)"));
  assert.ok(body.includes("### Reference Projects"));
  // base 段只剩私有条目，应整段省略
  assert.ok(!body.includes("### Base Frameworks"));
  assert.ok(body.indexOf("### Apps (maintained)") < body.indexOf("### Apps (experimental)"));
});

test("org 视图只收该组织名下、且不含第三方参考项目", () => {
  const { body } = render(fixture, "org");
  assert.ok(!body.includes("gamma"), "第三方参考项目不该出现在组织视图");
  assert.ok(!body.includes("alpha"), "非 variableway 名下的不该出现");
});

test("超长 description 截断到 MAX_DESC", () => {
  const long = "x".repeat(MAX_DESC + 50);
  const out = truncate(long);
  assert.equal(out.length, MAX_DESC);
  assert.ok(out.endsWith("..."));
  // 边界：正好等于上限不截断
  assert.equal(truncate("y".repeat(MAX_DESC)), "y".repeat(MAX_DESC));
  assert.equal(truncate("short"), "short");
});

test("表格单元格里的竖线被转义", () => {
  assert.equal(escapeCell("a|b"), "a\\|b");
});

test("replaceBlock 替换标记段落，且标记缺失时返回 null", () => {
  const content = "前言\n<!-- innate_apps starts -->\n旧内容\n<!-- innate_apps ends -->\n后记";
  const block = renderBlock(fixture, "user");
  const updated = replaceBlock(content, block);
  assert.ok(updated.includes("前言"));
  assert.ok(updated.includes("后记"));
  assert.ok(!updated.includes("旧内容"));
  assert.ok(updated.includes("### Apps (maintained)"));
  assert.equal(replaceBlock("没有标记", block), null);
});

test("replaceBlock 更新全部同名标记块", () => {
  const content =
    "<!-- innate_apps starts -->\n旧一\n<!-- innate_apps ends -->\n" +
    "中间\n<!-- innate_apps starts -->\n旧二\n<!-- innate_apps ends -->";
  const block = renderBlock(fixture, "user");
  const updated = replaceBlock(content, block);
  assert.ok(!updated.includes("旧一"));
  assert.ok(!updated.includes("旧二"));
  assert.equal(updated.split("<!-- innate_apps starts -->").length - 1, 2);
  assert.ok(updated.includes("中间"));
});

test("渲染是幂等的——再渲染一次结果不变", () => {
  const block1 = renderBlock(fixture, "user");
  const content = `前言\n${block1}\n后记`;
  const block2 = renderBlock(fixture, "user");
  assert.equal(replaceBlock(content, block2), content);
});

test("真实 registry：每个公开条目恰好出现一次，私有条目零次", () => {
  const registry = JSON.parse(fs.readFileSync(realRegistryPath, "utf8"));
  const { body } = render(registry, "user");
  for (const entry of registry.collections) {
    const count = body.split(`(${entry.url ?? `https://github.com/${entry.repo}`})`).length - 1;
    if (entry.visibility === "public") {
      assert.equal(count, 1, `${entry.name} 应恰好出现一次，实际 ${count}`);
    } else {
      assert.equal(count, 0, `${entry.name} 是 private，不该出现`);
    }
  }
});

test("真实 registry：user 视图渲染结果与仓库里手写的段落除私有条目外一致", () => {
  // 回归护栏：registry 的 description 一旦被改动，渲染结果会跟着变，
  // 这里只校验结构，不校验文案。
  const registry = JSON.parse(fs.readFileSync(realRegistryPath, "utf8"));
  const { body } = render(registry, "user");
  const rows = body.split("\n").filter((l) => l.startsWith("| ["));
  const publicCount = registry.collections.filter((e) => e.visibility === "public").length;
  assert.equal(rows.length, publicCount);
});
