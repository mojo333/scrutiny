export function celsiusToFahrenheit(celsiusTemp: number): number {
  return (celsiusTemp * 9) / 5 + 32;
}

/**
 * Format and convert temperature from Celsius to the specified unit.
 * All temperatures from the API are in Celsius, so this function handles conversion.
 */
export function formatTemperature(
  celsiusTemp: number,
  unit: string,
  includeUnits: boolean
): number | string {
  let temperature: number;
  let unitSuffix: string;

  switch (unit) {
    case 'fahrenheit':
      temperature = celsiusToFahrenheit(celsiusTemp);
      unitSuffix = '°F';
      break;
    case 'celsius':
    default:
      temperature = celsiusTemp;
      unitSuffix = '°C';
      break;
  }

  const formattedTemp = Math.round(temperature).toLocaleString('en-US');

  if (includeUnits) {
    return formattedTemp + unitSuffix;
  } else {
    return Number(formattedTemp);
  }
}
