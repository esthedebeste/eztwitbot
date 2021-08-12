import randomInclusive from "./evenmorerandom.js";

const partRegex = /<(\w+)>/g;
const keyRegex = /^\w+$/;
const random = array =>
  Array.isArray(array) ? array[randomInclusive(0, array.length - 1)] : array;
const generate = (startPoint, grammar) =>
  random(startPoint).replace(partRegex, (_, word) =>
    generate(random(grammar[word]), grammar)
  );
export { generate, partRegex, keyRegex };
