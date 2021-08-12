const random = array =>
  Array.isArray(array)
    ? array[Math.floor(Math.random() * array.length)]
    : array;
const generate = (startPoint, grammar) =>
  random(startPoint).replace(/<(\w+)>/g, (_, word) =>
    generate(random(grammar[word]), grammar)
  );
export { generate };
