/**
 * Helper para converter qNum do Qlik de forma segura.
 * O Qlik pode retornar NaN como string em alguns casos.
 *
 * @param value - Valor retornado do Qlik (qNum)
 * @param defaultValue - Valor padrão caso seja inválido (default: 0)
 * @returns Número válido ou o valor padrão
 */
export const safeQNum = (value: unknown, defaultValue = 0): number =>
  Number(value) || defaultValue;
