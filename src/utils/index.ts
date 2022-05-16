export function generateRandomNumber(n: number) {
  return (
    Math.floor(Math.random() * (9 * Math.pow(10, n - 1))) + Math.pow(10, n - 1)
  );
}
