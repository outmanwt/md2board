#!/usr/bin/env node

/**
 * md2board 回归测试
 * 直接跑：node scripts/verify.js
 * 覆盖：标题清洗、代码块忽略、diff 解析、缩进回写、模板结构、生成器转义。
 * 用法：改完 template.html / generate_deck.js 后跑一遍，全 PASS 再交付。
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SKILL_DIR = path.resolve(__dirname, '..');
const TPL = path.join(SKILL_DIR, 'assets', 'template.html');
const GEN = path.join(SKILL_DIR, 'scripts', 'generate_deck.js');
const tpl = fs.readFileSync(TPL, 'utf8');

const start = tpl.indexOf('function uid(');
const end = tpl.indexOf('function escapeHtml(');
if (start < 0 || end < 0) {
  console.error('无法从 template.html 抽取解析器函数，模板结构可能已变更。');
  process.exit(2);
}
const mod = new Function(
  tpl.slice(start, end) + '\nreturn {uid, cleanTitle, parseMarkdown, countTasks, pct};'
)();

let pass = 0, fail = 0;
const check = (name, cond, detail) => {
  console.log((cond ? 'PASS' : 'FAIL') + ' | ' + name + (detail ? ' | ' + detail : ''));
  cond ? pass++ : fail++;
};

console.log('=== A. cleanTitle 编号清洗 ===');
['01. 需求定义', '1-1 需求定义', '2.3 需求定义', '1、需求定义'].forEach(t =>
  check(t, mod.cleanTitle(t) === '需求定义', mod.cleanTitle(t)));
check('无编号标题不被误伤', mod.cleanTitle('3D 渲染管线') === '3D 渲染管线');

console.log('\n=== B. 非 diff 代码块整体忽略 ===');
const mdCode = ['# Demo', '## P1', '### C1', '#### S1', '> goal', '- [x] 真任务A',
  '```bash', '# 这是 shell 注释，不是标题', '## 注释里的二级标题', '- [ ] 脚本待办', '```',
  '- [ ] 真任务B'].join('\n');
const p1 = mod.parseMarkdown(mdCode);
check('项目标题不被代码注释顶替', p1.title === 'Demo', p1.title);
check('阶段数 1', p1.phases.length === 1);
check('章节数 1', p1.phases[0].chapters.length === 1);
check('小节数 1', p1.phases[0].chapters[0].sections.length === 1);
check('验收项只有 2 个', p1.phases[0].chapters[0].sections[0].tasks.length === 2);

console.log('\n=== B2. diff 块仍正常解析 ===');
const p2 = mod.parseMarkdown('# D\n## P\n### C\n#### S\n- [ ] a\n```diff\n+ add\n- del\n```\n- [ ] b\n');
const s2 = p2.phases[0].chapters[0].sections[0];
check('diff 内容挂到小节', s2.diff === '+ add\n- del', JSON.stringify(s2.diff));
check('diff 块外验收项保留', s2.tasks.length === 2);

console.log('\n=== C. 缩进验收项回写 ===');
const line = '  - [ ] 缩进两格';
check('回写保留缩进', line.replace(/^(\s*)-\s*\[[ xX]\]/, '$1- [x]') === '  - [x] 缩进两格');
check('遥测标签去前缀', line.replace(/^\s*-\s*\[[ xX]\]\s*/, '') === '缩进两格');
check('非验收行可检测为失败', '不是清单'.replace(/^(\s*)-\s*\[[ xX]\]/, '$1- [x]') === '不是清单');

console.log('\n=== D. 模板结构 ===');
check('无 Google Fonts 外链（离线自包含）', !tpl.includes('fonts.googleapis'));
check('存储 key 按内容哈希隔离', tpl.includes('hashSeed(initialMarkdown)'));
check('代码块状态位 inCode 存在', /inCode = true/.test(tpl));
check('缩进回写正则保留空白', tpl.includes('(\\s*)-\\s*\\[[ xX]\\]'));
check('导航渲染有兜底', tpl.includes('setTimeout(commit, 250)'));
check('导出 Markdown 按钮', tpl.includes('exportSpecBtn'));
check('进度分解卡', tpl.includes('breakdown-card'));

console.log('\n=== E. 生成器转义 ===');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pd-verify-'));
const md = path.join(tmp, 'in.md');
const out = path.join(tmp, 'out.html');
fs.writeFileSync(md,
  '# X\n## P\n### C\n#### S\n- [ ] 闭合 </script><img src=x onerror=alert(1)>\n- [ ] 反引号 `code` 与 ${tpl} 与反斜杠 \\\n',
  'utf8');
execFileSync(process.execPath, [GEN, md, '--output', out]);
const html = fs.readFileSync(out, 'utf8');
const inj = html.slice(html.indexOf('initialMarkdown'), html.indexOf('DECISION_PRINCIPLES'));
check('注入区无字面 </script>', !inj.includes('</script>'));
check('产物 </script> 只出现 1 次', (html.match(/<\/script>/g) || []).length === 1);
check('反引号 / ${} / 反斜杠已转义', inj.includes('\\`') && inj.includes('\\$') && inj.includes('\\\\'));
fs.rmSync(tmp, { recursive: true, force: true });

console.log('\n=== F. 内联看板片段 ===');
const INLINE = path.join(SKILL_DIR, 'assets', 'inline-board.html');
check('inline-board.html 存在', fs.existsSync(INLINE));
if (fs.existsSync(INLINE)) {
  const ib = fs.readFileSync(INLINE, 'utf8');
  check('不含 DOCTYPE / html / head / body 标签', !/<!DOCTYPE|<html|<head|<body/i.test(ib));
  check('有读屏用摘要 h2', ib.includes('clip:rect(0 0 0 0)'));
  check('数据对象 PD 可按四级结构替换', /var PD = \{[\s\S]*?phases:/.test(ib));
  check('勾选后重算全局百分比', ib.includes("'stroke-dasharray'") && ib.includes('pdPct'));
  check('折叠下钻按 .pd-open 切换', ib.includes(".pd-open>.pd-kids{display:block}"));
  check('阶段徽章含进行中/已完成两态', ib.includes("'已完成'") && ib.includes("'进行中'"));
}

console.log(`\n结果: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
