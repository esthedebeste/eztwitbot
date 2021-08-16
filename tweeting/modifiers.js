class Modifier {
  /**
   * @param {String} total
   * @param {String} part
   */
  execute = (total, part) => total;
  /**
   * @param {RegExp} regex
   * @param {(total: String, part: String)=>String} executor
   */
  constructor(regex, executor) {
    this.regex = regex;
    this.execute = executor;
  }
}
/**
 * Modifier guidelines:
 * - Every modifier is a regex statement starting with ^ and ending with $
 * - Modifiers have no regex flags
 * - Modifiers can't start with anything \w
 */
export const modifiers = {
  slice: new Modifier(/^\[-?\d+,-?\d+\]$/, (total, part) => {
    const [start, end] = part
      .slice(1, -1) // Trim []
      .split(",") // 1,2 => ["1","2"]
      .slice(0, 2) // Limit to 2 just in case
      .map(a => parseInt(a.trim())); // ["1","2"] => [1,2]
    return total.slice(start, end);
  }),
};
