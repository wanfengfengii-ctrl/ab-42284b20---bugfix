import { describe, expect, it } from 'vitest';
import {
  DECIMAL_ZERO,
  decimalAdd,
  decimalCompare,
  decimalFromNumber,
  decimalFromString,
  decimalToNumber,
  decimalToString,
} from './decimal';

const d = decimalFromNumber;
const s = decimalFromString;

describe('decimal · 精确十进制表示', () => {
  it('由录入值恢复十进制：0.1、1e-10、整数与科学计数法', () => {
    expect(decimalToString(d(0.1))).toBe('0.1');
    expect(decimalToString(d(0.3))).toBe('0.3');
    expect(decimalToString(d(1e-10))).toBe('0.0000000001');
    expect(decimalToString(d(4))).toBe('4');
    expect(decimalToString(d(0))).toBe('0');
    expect(decimalToString(d(1.5e-7))).toBe('0.00000015');
    expect(decimalToString(d(1e21))).toBe('1' + '0'.repeat(21));
    expect(decimalToString(d(0.1000000001))).toBe('0.1000000001');
  });

  it('非有限数值抛出错误', () => {
    expect(() => d(Number.NaN)).toThrow();
    expect(() => d(Number.POSITIVE_INFINITY)).toThrow();
  });

  it('十进制加法精确：0.1 + 0.2 严格等于 0.3', () => {
    // 二进制浮点下并不相等，这正是十进制累计要消除的误差来源
    expect(0.1 + 0.2 === 0.3).toBe(false);
    const sum = decimalAdd(d(0.1), d(0.2));
    expect(decimalCompare(sum, d(0.3))).toBe(0);
    expect(decimalToString(sum)).toBe('0.3');
    expect(decimalToNumber(sum)).toBe(0.3);
  });

  it('加法与次序无关：同一组代价任意次序求和结果逐位相同', () => {
    const terms = [0.1, 0.2, 0.3, 1e-10, 4, 0.0000000001];
    const forward = terms.reduce((acc, x) => decimalAdd(acc, d(x)), DECIMAL_ZERO);
    const reverse = terms.reduceRight((acc, x) => decimalAdd(acc, d(x)), DECIMAL_ZERO);
    expect(decimalCompare(forward, reverse)).toBe(0);
    expect(decimalToString(forward)).toBe('4.6000000002');
  });

  it('比较保持极小十进制差额：1e-10 与 0 严格有序', () => {
    expect(decimalCompare(d(1e-10), DECIMAL_ZERO)).toBe(1);
    expect(decimalCompare(DECIMAL_ZERO, d(1e-10))).toBe(-1);
    expect(decimalCompare(d(0.3000000001), d(0.3))).toBe(1);
    expect(decimalCompare(d(0.3), d(0.3))).toBe(0);
    // 四个 1e-10 的精确和为 4e-10，仍严格大于 0
    const four = decimalAdd(decimalAdd(d(1e-10), d(1e-10)), decimalAdd(d(1e-10), d(1e-10)));
    expect(decimalCompare(four, DECIMAL_ZERO)).toBe(1);
    expect(decimalToNumber(four)).toBe(4e-10);
  });

  it('转回双精度正确舍入，展示值与录入值一致', () => {
    expect(decimalToNumber(decimalAdd(d(0.1), d(0.2)))).toBe(0.3);
    expect(decimalToNumber(d(0))).toBe(0);
    expect(decimalToString(decimalAdd(d(0.1), d(0.2)))).toBe('0.3');
  });
});

describe('decimal · 录入原文的精确解析（decimalFromString）', () => {
  it('保留 Number() 会舍去的末尾有效位：0.10000000000000001 严格大于 0.1', () => {
    // 两者是同一双精度，经 number 往返必然丢失差额，必须按录入文本解析
    expect(Number('0.10000000000000001')).toBe(0.1);
    const dearer = s('0.10000000000000001');
    expect(decimalToString(dearer)).toBe('0.10000000000000001');
    expect(decimalCompare(dearer, s('0.1'))).toBe(1);
    expect(decimalCompare(s('0.1'), dearer)).toBe(-1);
    // 与数值恢复的结果严格区分：decimalFromNumber(0.1) 只是 0.1
    expect(decimalCompare(dearer, d(0.1))).toBe(1);
    // 差额是真实的 1e-17 级十进制差：总和也严格有序
    const sum = decimalAdd(dearer, DECIMAL_ZERO);
    expect(decimalCompare(sum, d(0.1))).toBe(1);
  });

  it('文本不同但十进制值相等：0.1 与 0.100 判为同成本', () => {
    expect(decimalCompare(s('0.1'), s('0.100'))).toBe(0);
    expect(decimalCompare(s('0.10000000000000001'), s('0.10000000000000001'))).toBe(0);
    expect(decimalCompare(s('1e-10'), s('0.0000000001'))).toBe(0);
  });

  it('支持符号、指数与首尾空白', () => {
    expect(decimalToString(s(' 0.1 '))).toBe('0.1');
    expect(decimalToString(s('-2.5'))).toBe('-2.5');
    expect(decimalToString(s('1.5e-7'))).toBe('0.00000015');
    expect(decimalToString(s('2e3'))).toBe('2000');
    expect(decimalToString(s('007'))).toBe('7');
  });

  it('非规范十进制文本抛出错误', () => {
    expect(() => s('')).toThrow();
    expect(() => s('abc')).toThrow();
    expect(() => s('0x10')).toThrow();
    expect(() => s('1.2.3')).toThrow();
  });

  it('decimalFromNumber 委托最短往返表示，行为不变', () => {
    expect(decimalToString(d(0.1))).toBe('0.1');
    expect(decimalToString(d(1e-10))).toBe('0.0000000001');
    expect(() => d(Number.NaN)).toThrow();
    expect(() => d(Number.POSITIVE_INFINITY)).toThrow();
  });
});
