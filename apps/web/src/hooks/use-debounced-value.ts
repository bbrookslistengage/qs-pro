import { useEffect, useState } from "react";

/**
 * Debounces a value by the specified delay.
 * Returns the debounced value that only updates after the delay period
 * has elapsed without any changes to the input value.
 *
 * @param value - The value to debounce
 * @param delay - The debounce delay in milliseconds (default: 150ms)
 * @returns The debounced value
 *
 * @example
 * const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
 *
 * useEffect(() => {
 *   // This will only run 300ms after the user stops typing
 *   fetchSearchResults(debouncedSearchTerm);
 * }, [debouncedSearchTerm]);
 */
export function useDebouncedValue<T>(value: T, delay = 150): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
