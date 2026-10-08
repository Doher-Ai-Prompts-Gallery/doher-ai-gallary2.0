export interface PlaceholderValue {
  key: string;
  value: string;
}

export const detectPlaceholders = (text: string): string[] => {
  const regex = /#([a-zA-Z0-9_]+)/g;
  const matches = text.match(regex);
  if (!matches) return [];
  // Return unique placeholders without the '#' prefix if needed, or keep it. 
  // User says "#name", "#company". Let's keep the '#' for consistency in the UI.
  return Array.from(new Set(matches));
};

export const replacePlaceholders = (text: string, values: Record<string, string>): string => {
  let result = text;
  Object.entries(values).forEach(([key, value]) => {
    // Escape special characters in key for regex
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedKey, 'g');
    result = result.replace(regex, value);
  });
  return result;
};

export const getStoredPlaceholderValues = (): Record<string, string> => {
  const stored = localStorage.getItem('doher_placeholders');
  return stored ? JSON.parse(stored) : {};
};

export const savePlaceholderValues = (values: Record<string, string>) => {
  const current = getStoredPlaceholderValues();
  const updated = { ...current, ...values };
  localStorage.setItem('doher_placeholders', JSON.stringify(updated));
};
