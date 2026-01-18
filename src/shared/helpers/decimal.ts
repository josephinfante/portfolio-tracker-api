import Decimal from "decimal.js";

export const D = (value: string | number | Decimal) => new Decimal(value);
export const toFixed = (value: Decimal, decimals = 8) => value.toFixed(decimals);
