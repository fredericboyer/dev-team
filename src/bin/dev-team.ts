import { run } from "../init.js";
import { update } from "../update.js";
import { createAgent } from "../create-agent.js";
import { doctor } from "../doctor.js";
import { status } from "../status.js";
import { getPackageVersion } from "../files.js";

const args = process.argv.slice(2);
const command = args[0];

if (command === "--version" || command === "-v") {
  console.log(getPackageVersion());
  process.exit(0);
} else if (command === "init") {
  run(process.cwd(), args.slice(1)).catch((err: Error) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });
} else if (command === "update") {
  update(process.cwd()).catch((err: Error) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });
} else if (command === "create-agent") {
  createAgent(process.cwd(), args[1]);
} else if (command === "doctor") {
  doctor(process.cwd());
} else if (command === "status") {
  status(process.cwd());
} else {
  console.log("dev-team — Adversarial AI agent team for any project\n");
  console.log("Usage:");
  console.log("  npx dev-team init                    Interactive onboarding wizard");
  console.log("  npx dev-team init --all              Install everything with defaults");
  console.log("  npx dev-team init --force            Reinitialize (overwrites config)");
  console.log("  npx dev-team init --preset backend   Backend-heavy (API, security, architecture)");
  console.log("  npx dev-team init --preset fullstack  Full-stack (all agents)");
  console.log("  npx dev-team init --preset data       Data pipeline (backend, quality, tooling)");
  console.log("  npx dev-team update                  Update agents, hooks, and skills to latest");
  console.log("  npx dev-team create-agent <name>     Scaffold a new custom agent");
  console.log("  npx dev-team doctor                  Check installation health");
  console.log("  npx dev-team status                  Show installed agents, hooks, and memory");
  console.log("  npx dev-team --version               Print version");
  console.log("");
  process.exit(command === "--help" || command === "-h" ? 0 : 1);
}
