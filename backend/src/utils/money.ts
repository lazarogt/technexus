import { AppError } from "./errors";

export const roundCurrency = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export const parsePrice = (value: unknown, fieldName: string): number => {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    throw new AppError(
      400,
      "INVALID_NUMBER",
      `${fieldName} must be a valid non-negative number.`
    );
  }

  return roundCurrency(numericValue);
};

export const parseNonNegativeInt = (value: unknown, fieldName: string): number => {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isInteger(numericValue) || numericValue < 0) {
    throw new AppError(
      400,
      "INVALID_INTEGER",
      `${fieldName} must be a valid non-negative integer.`
    );
  }

  return numericValue;
};
