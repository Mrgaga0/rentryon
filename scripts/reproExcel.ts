import path from "path";
import { readFileSync } from "fs";
import { parseProductsFromExcel } from "../server/gemini";

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error("Usage: tsx scripts/reproExcel.ts <path-to-excel>");
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), fileArg);
  const buffer = readFileSync(filePath);
  const fileName = path.basename(filePath);

  try {
    const result = await parseProductsFromExcel(buffer, fileName);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("parseProductsFromExcel failed:", error);
    process.exitCode = 1;
  }
}

main();