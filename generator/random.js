let rBytes;
if (typeof window === "undefined")
  rBytes = (await import("crypto")).randomBytes;
else rBytes = a => crypto.getRandomValues(new Uint8Array(a));

const calculateParameters = range => {
  let bitsNeeded = 0;
  let bytesNeeded = 0;
  let mask = 1;

  while (range > 0) {
    if (bitsNeeded % 8 === 0) bytesNeeded++;
    bitsNeeded++;
    mask = (mask << 1) | 1;
    range >>>= 1;
  }

  return { bitsNeeded, bytesNeeded, mask };
};

const randomInclusive = (minimum, maximum) => {
  if (maximum === minimum) return maximum;
  if (maximum < minimum)
    throw new Error("The maximum value must be higher than the minimum value.");
  const range = maximum - minimum;
  let randomValue = 0;
  while (true) {
    const { bytesNeeded, mask } = calculateParameters(range);
    const randomBytes = rBytes(bytesNeeded);
    for (let i = 0; i < bytesNeeded; i++)
      randomValue |= randomBytes[i] << (8 * i);
    randomValue &= mask;

    if (randomValue <= range) return minimum + randomValue;
    else randomValue = 0;
  }
};

const choice = array => array[randomInclusive(0, array.length - 1)];
export { randomInclusive, choice };
