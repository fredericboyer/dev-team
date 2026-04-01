import readline from "readline";

export interface CheckboxItem {
  label: string;
  description: string;
  defaultSelected: boolean;
}

export interface SelectOption {
  label: string;
  description: string;
}

function createInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Asks a yes/no question. Returns true for yes.
 */
export async function confirm(question: string, defaultYes: boolean = true): Promise<boolean> {
  const rl = createInterface();
  const hint = defaultYes ? "[Y/n]" : "[y/N]";

  return new Promise((resolve) => {
    rl.question(`${question} ${hint} `, (answer) => {
      rl.close();
      const trimmed = answer.trim().toLowerCase();
      if (trimmed === "") {
        resolve(defaultYes);
      } else {
        resolve(trimmed === "y" || trimmed === "yes");
      }
    });
  });
}

/**
 * Asks a checkbox-style question. Returns array of selected labels.
 */
export async function checkbox(question: string, items: CheckboxItem[]): Promise<string[]> {
  if (items.length === 0) {
    throw new Error("checkbox requires at least one option");
  }
  const rl = createInterface();

  console.log(`\n${question}`);
  items.forEach((item, i) => {
    const checked = item.defaultSelected ? "x" : " ";
    console.log(`  ${i + 1}. [${checked}] ${item.label} — ${item.description}`);
  });

  return new Promise((resolve) => {
    rl.question(
      "\nEnter numbers to toggle (e.g., 1 3 4), or press Enter for defaults: ",
      (answer) => {
        rl.close();
        const trimmed = answer.trim();

        if (trimmed === "") {
          resolve(items.filter((item) => item.defaultSelected).map((item) => item.label));
          return;
        }

        const toggled = new Set(
          trimmed
            .split(/[\s,]+/)
            .map(Number)
            .filter((n) => n >= 1 && n <= items.length),
        );

        const selected = items
          .filter((_item, i) => {
            const isDefault = items[i].defaultSelected;
            const wasToggled = toggled.has(i + 1);
            return isDefault ? !wasToggled : wasToggled;
          })
          .map((item) => item.label);

        resolve(selected);
      },
    );
  });
}

/**
 * Asks a single-choice question. Returns the selected label.
 */
export async function select(question: string, options: SelectOption[]): Promise<string> {
  if (options.length === 0) {
    throw new Error("select requires at least one option");
  }
  const rl = createInterface();

  console.log(`\n${question}`);
  options.forEach((opt, i) => {
    console.log(`  ${i + 1}. ${opt.label} — ${opt.description}`);
  });

  return new Promise((resolve) => {
    rl.question("\nEnter number (default: 1): ", (answer) => {
      rl.close();
      const trimmed = answer.trim();

      if (trimmed === "") {
        resolve(options[0].label);
        return;
      }

      const idx = Number(trimmed) - 1;
      if (idx >= 0 && idx < options.length) {
        resolve(options[idx].label);
      } else {
        resolve(options[0].label);
      }
    });
  });
}

/**
 * Asks for free-text input.
 */
export async function input(question: string, defaultValue: string = ""): Promise<string> {
  const rl = createInterface();
  const hint = defaultValue ? ` [${defaultValue}]` : "";

  return new Promise((resolve) => {
    rl.question(`${question}${hint}: `, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}
