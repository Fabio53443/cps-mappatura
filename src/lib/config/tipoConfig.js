// Client-side only tipo configuration
// We manually define the enum values here instead of importing from server schema

// Manually define the enum values with EXACT CASE matching the server schema
export const tipoValues = [
  'Biblioteca/Aula Studio', 
  'Centro di Aggregazione Giovanile', 
  'Centro Famiglia', 
  'Altro'
];

// Predefined color palette for consistent assignment
export const colorPalette = [
  '#10b981', // Green
  '#f59e0b', // Orange/Yellow
  '#8b5cf6', // Purple
  '#ec4899', // Pink
];

export const defaultColor = '#6b7280'; // Gray for unknown tipos

// Generate a mapping of tipo values to colors
export const tipoColorMap = {};
tipoValues.forEach((tipo, index) => {
  // Store both the original case and lowercase versions as keys
  tipoColorMap[tipo] = colorPalette[index % colorPalette.length];
  tipoColorMap[tipo.toLowerCase()] = colorPalette[index % colorPalette.length];
});

// Function to get color based on tipo - case insensitive
export function getColorForTipo(tipo) {
  if (!tipo) return defaultColor;
  
  // Try exact match first, then lowercase
  return tipoColorMap[tipo] || tipoColorMap[tipo.toLowerCase()] || defaultColor;
}
