// Builds the standalone interactive demo (an imagined 10 x 10 bedroom) from demo/template.html.
// The shared paint, cost, time, repair and task code is inlined so the page runs on its own,
// with no server. Output goes to demo/dist/, next to a copy of the color catalog.
//
// Usage: node scripts/build-demo.mjs
// Then publish demo/dist/bedroom-demo.html with demo/dist/colors/*.json alongside it.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from "node:fs";

const MODULES = [
  ["PaintCalc", "shared/paintCalc.js"],
  ["Costs", "shared/costs.js"],
  ["Hours", "shared/hours.js"],
  ["Repairs", "shared/repairs.js"],
  ["Tasks", "shared/tasks.js"],
];

// Wrap each shared module so its exports become properties of one global (e.g. Hours.formatHours).
function wrap(name, file) {
  let src = readFileSync(file, "utf8");
  const names = [...src.matchAll(/^export (?:function|const) (\w+)/gm)].map((m) => m[1]);
  src = src.replace(/^export /gm, "");
  return `const ${name} = (() => {\n${src}\nreturn { ${names.join(", ")} };\n})();\n`;
}

const shared = MODULES.map(([name, file]) => wrap(name, file)).join("");
const page = readFileSync("demo/template.html", "utf8").replace("/*SHARED*/", () => shared);

// Fail early if the inlined script doesn't parse.
new Function(page.split("<script>")[1].split("</script>")[0]);

mkdirSync("demo/dist/colors", { recursive: true });
writeFileSync("demo/dist/bedroom-demo.html", page);
for (const f of readdirSync("public/colors")) copyFileSync(`public/colors/${f}`, `demo/dist/colors/${f}`);
console.log("Built demo/dist/bedroom-demo.html");
