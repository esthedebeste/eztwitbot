import { dirname, join } from "path";
import { fileURLToPath } from "url";
export const maindir = join(dirname(fileURLToPath(import.meta.url)), "..");
