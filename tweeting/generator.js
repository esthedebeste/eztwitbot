const partRegex = /<(\w+)>/g;
const keyRegex = /^\w+$/;
const random = array =>
  Array.isArray(array)
    ? array[Math.floor(Math.random() * array.length)]
    : array;
const generate = (startPoint, grammar) =>
  random(startPoint).replace(partRegex, (_, word) =>
    generate(random(grammar[word]), grammar)
  );
export { generate, partRegex, keyRegex };
