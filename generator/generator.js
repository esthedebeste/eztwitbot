import { modifiers } from "./modifiers.js";
import { choice } from "./random.js";
const partRegex = new RegExp(
  `<((\\w+)((?:${Object.values(modifiers)
    .map(a => a.regex.source.slice(1, -1))
    .join("|")})+))>`,
  "g"
);
const keyRegex = /^\w+$/;
const random = array => (Array.isArray(array) ? choice(array) : array);

const applyModifiers = (str, mods) => {
  if (typeof mods !== "string") return str;
  mods = mods.split(".");
  if (mods[0] === "") mods = mods.slice(1);
  for (const part of mods)
    for (const modifier in modifiers)
      if (modifiers[modifier].regex.test(part))
        str = modifier.execute(str, part);
  return str;
};
const generate = (startPoint, grammar) =>
  random(startPoint).replace(partRegex, (_, total, word, modifiers) =>
    applyModifiers(generate(random(grammar[word]), grammar), modifiers)
  );
export { generate, partRegex, keyRegex };
