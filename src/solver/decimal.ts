/**
 * 精确十进制数：value = coefficient × 10^exponent（coefficient 为任意精度整数）。
 *
 * 安装代价是逐位有意义的录入值，总代价的累计与比较必须按录入的十进制值进行：
 * 0.1 + 0.2 与 0.3 在十进制下相等，必须判为同成本；而 1e-10 与 0 这类
 * 极小但真实的十进制差额又必须保持严格有序。二进制浮点累加两者都做不到
 * （0.1+0.2 === 0.30000000000000004），因此代价的求和与比较全部在此
 * 十进制表示上完成，物理量（质量、力矩）不在此列，仍走浮点 + EPS。
 */
export interface Decimal {
  readonly coefficient: bigint;
  readonly exponent: number;
}

export const DECIMAL_ZERO: Decimal = { coefficient: 0n, exponent: 0 };

/** number 的最短往返十进制文本（String(x) 的输出格式）。 */
const DECIMAL_TEXT = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/;

/**
 * 以 number 的最短往返表示恢复其十进制值。录入文本经 Number() 解析后，
 * String() 会给出能往返同一双精度的最短十进制串，即录入的十进制值本身
 * （如 0.1 → "0.1"，1e-10 → "1e-10"）。
 */
export function decimalFromNumber(x: number): Decimal {
  if (!Number.isFinite(x)) throw new Error(`十进制代价须为有限数值: ${x}`);
  const m = DECIMAL_TEXT.exec(String(x));
  if (!m) throw new Error(`无法解析的十进制数值: ${String(x)}`);
  const [, sign, intPart, fracPart = '', expPart] = m;
  let coefficient = BigInt(intPart + fracPart);
  if (sign === '-') coefficient = -coefficient;
  const exponent = (expPart === undefined ? 0 : Number(expPart)) - fracPart.length;
  return normalize({ coefficient, exponent });
}

/** 去掉系数末尾的 0（并把零规范化为 0 × 10^0），保持表示紧凑。 */
function normalize(d: Decimal): Decimal {
  let { coefficient, exponent } = d;
  if (coefficient === 0n) return DECIMAL_ZERO;
  while (coefficient % 10n === 0n) {
    coefficient /= 10n;
    exponent += 1;
  }
  return { coefficient, exponent };
}

/** 精确加法（可交换、可结合，与求和次序无关）。 */
export function decimalAdd(a: Decimal, b: Decimal): Decimal {
  const exponent = Math.min(a.exponent, b.exponent);
  const coefficient =
    a.coefficient * 10n ** BigInt(a.exponent - exponent) +
    b.coefficient * 10n ** BigInt(b.exponent - exponent);
  return normalize({ coefficient, exponent });
}

/** 精确比较：a < b 返回 -1，a === b 返回 0，a > b 返回 1。 */
export function decimalCompare(a: Decimal, b: Decimal): number {
  const exponent = Math.min(a.exponent, b.exponent);
  const diff =
    a.coefficient * 10n ** BigInt(a.exponent - exponent) -
    b.coefficient * 10n ** BigInt(b.exponent - exponent);
  return diff < 0n ? -1 : diff > 0n ? 1 : 0;
}

/** 规范十进制文本（不带指数），供展示与精确转回双精度。 */
export function decimalToString(d: Decimal): string {
  if (d.coefficient === 0n) return '0';
  const negative = d.coefficient < 0n;
  const digits = (negative ? -d.coefficient : d.coefficient).toString();
  const point = digits.length + d.exponent;
  let text: string;
  if (d.exponent >= 0) {
    text = digits + '0'.repeat(d.exponent);
  } else if (point > 0) {
    text = `${digits.slice(0, point)}.${digits.slice(point)}`;
  } else {
    text = `0.${'0'.repeat(-point)}${digits}`;
  }
  return negative ? `-${text}` : text;
}

/** 转回双精度（经规范十进制文本解析，正确舍入到最近的双精度值）。 */
export function decimalToNumber(d: Decimal): number {
  return Number(decimalToString(d));
}
