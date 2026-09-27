import { describe, expect, it } from 'vitest';
import { adjudicate } from './solver/adjudicate';
import { parseDraft, type Draft } from './draft';

/** 任务场景草稿：两条零力臂导轨，4 块单位质量配重，b1 两位置代价仅差末尾有效位。 */
const tinyDiffDraft = (): Draft => ({
  rails: [
    { id: 'r1', name: 'Z1', coordinate: '0' },
    { id: 'r2', name: 'Z2', coordinate: '0' },
  ],
  blocks: [
    {
      id: 'b1',
      name: 'b1',
      mass: '1',
      options: [
        { railId: 'r1', cost: '0.10000000000000001' },
        { railId: 'r2', cost: '0.1' },
      ],
    },
    { id: 'b2', name: 'b2', mass: '1', options: [{ railId: 'r1', cost: '0' }, { railId: 'r2', cost: '0' }] },
    { id: 'b3', name: 'b3', mass: '1', options: [{ railId: 'r1', cost: '0' }, { railId: 'r2', cost: '0' }] },
    { id: 'b4', name: 'b4', mass: '1', options: [{ railId: 'r1', cost: '0' }, { railId: 'r2', cost: '0' }] },
  ],
  maxLoad: '4',
  minTorque: '-1',
  maxTorque: '1',
});

describe('draft · 草稿解析与裁决的衔接', () => {
  it('代价录入原文随场景保留（Number() 会丢失末尾有效位）', () => {
    expect(Number('0.10000000000000001')).toBe(0.1); // 双精度无法区分两者
    const parsed = parseDraft(tinyDiffDraft());
    expect('scenario' in parsed).toBe(true);
    if (!('scenario' in parsed)) return;
    expect(parsed.scenario.blocks[0].options.map((o) => o.costText)).toEqual([
      '0.10000000000000001',
      '0.1',
    ]);
  });

  it('录入路径端到端：极细小十进制差异须返回 1,0,0,0（b1 选代价 0.1 的 #2）', () => {
    const parsed = parseDraft(tinyDiffDraft());
    expect('scenario' in parsed).toBe(true);
    if (!('scenario' in parsed)) return;
    const outcome = adjudicate(parsed.scenario);
    expect(outcome.feasible).toBe(true);
    if (!outcome.feasible) return;
    expect(outcome.plan.steps.map((s) => s.optionIndex)).toEqual([1, 0, 0, 0]);
    expect(outcome.plan.totalCost).toBe(0.1);
    expect(outcome.plan.minTorqueMargin).toBe(1);
    expect(outcome.plan.finalMass).toBe(4);
  });

  it('非规范十进制文本（如 0x10）回退到数值恢复，裁决不受影响', () => {
    const draft = tinyDiffDraft();
    draft.blocks[0].options = [
      { railId: 'r1', cost: '0x10' }, // Number() 可解析为 16，但不是规范十进制文本
      { railId: 'r2', cost: '0.1' },
    ];
    const parsed = parseDraft(draft);
    expect('scenario' in parsed).toBe(true);
    if (!('scenario' in parsed)) return;
    expect(parsed.scenario.blocks[0].options[0].cost).toBe(16);
    const outcome = adjudicate(parsed.scenario);
    expect(outcome.feasible).toBe(true);
    if (!outcome.feasible) return;
    // #1 代价 16 远贵于 #2 的 0.1：仍须选 1,0,0,0
    expect(outcome.plan.steps.map((s) => s.optionIndex)).toEqual([1, 0, 0, 0]);
    expect(outcome.plan.totalCost).toBe(0.1);
  });
});
