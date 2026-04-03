/**
 * Date validation utilities for database operations.
 * Prevents Invalid Date errors when parsing user input or API data.
 */

/**
 * Check if a Date object is valid (not Invalid Date)
 */
export function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Parse a date string into a Date object.
 * Returns null if the input is empty, undefined, or results in an invalid date.
 *
 * @param value - The date string to parse (ISO format, YYYY-MM-DD, etc.)
 * @returns Valid Date object or null
 */
export function parseDate(value: string | undefined | null): Date | null {
  if (!value || value.trim() === "") {
    return null;
  }

  const date = new Date(value);

  if (!isValidDate(date)) {
    console.warn(`[date-utils] Invalid date value: "${value}"`);
    return null;
  }

  return date;
}

/**
 * Parse a date string that is required. Throws an error if invalid.
 * Use this for fields that must have a valid date.
 *
 * @param value - The date string to parse
 * @param fieldName - Name of the field (for error message)
 * @throws Error if the date is invalid or missing
 * @returns Valid Date object
 */
export function parseDateRequired(value: string | undefined | null, fieldName: string): Date {
  if (!value || value.trim() === "") {
    throw new Error(`${fieldName} is required but was not provided`);
  }

  const date = new Date(value);

  if (!isValidDate(date)) {
    throw new Error(`${fieldName} has an invalid date format: "${value}"`);
  }

  return date;
}

/**
 * Parse a date with a fallback default value.
 * Returns the default if the input is invalid.
 *
 * @param value - The date string to parse
 * @param defaultValue - Default Date to use if parsing fails
 * @returns Parsed Date or the default value
 */
export function parseDateWithDefault(value: string | undefined | null, defaultValue: Date): Date {
  const parsed = parseDate(value);
  return parsed ?? defaultValue;
}

/**
 * Validate multiple date fields and collect errors.
 * Returns an object with valid dates and any validation errors.
 *
 * @param fields - Object mapping field names to date strings
 * @returns Object with parsed dates and errors array
 */
export function validateDateFields(
  fields: Record<string, { value: string | undefined | null; required?: boolean }>
): { dates: Record<string, Date | null>; errors: string[] } {
  const dates: Record<string, Date | null> = {};
  const errors: string[] = [];

  for (const [fieldName, config] of Object.entries(fields)) {
    const { value, required } = config;

    if (required) {
      try {
        dates[fieldName] = parseDateRequired(value, fieldName);
      } catch (e) {
        errors.push(e instanceof Error ? e.message : `Invalid ${fieldName}`);
        dates[fieldName] = null;
      }
    } else {
      dates[fieldName] = parseDate(value);
    }
  }

  return { dates, errors };
}