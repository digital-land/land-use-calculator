import { readdir } from "fs/promises";
import path from "path";

export async function GET() {
  const dir = path.resolve("static/data/geographies");
  const files = await readdir(dir);
  const bins = files.filter(f => f.endsWith(".bin"));
  return new Response(JSON.stringify(bins), {
    headers: { "Content-Type": "application/json" },
  });
}
