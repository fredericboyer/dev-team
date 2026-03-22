import { run } from "../init";
import { update } from "../update";

const args = process.argv.slice(2);
const command = args[0];

if (command === "init") {
  run(process.cwd(), args.slice(1)).catch((err: Error) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });
} else if (command === "update") {
  update(process.cwd()).catch((err: Error) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });
} else {
  console.log("dev-team — Adversarial AI agent team for any project\n");
  console.log("Usage:");
  console.log("  npx dev-team init          Interactive onboarding wizard");
  console.log("  npx dev-team init --all    Install everything with defaults");
  console.log("  npx dev-team update        Update agents, hooks, and skills to latest");
  console.log("");
  process.exit(command === "--help" || command === "-h" ? 0 : 1);
}
