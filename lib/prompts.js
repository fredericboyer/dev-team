'use strict';

const readline = require('readline');

/**
 * Creates a readline interface for a single question, then closes it.
 */
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Asks a yes/no question. Returns true for yes.
 */
async function confirm(question, defaultYes = true) {
  const rl = createInterface();
  const hint = defaultYes ? '[Y/n]' : '[y/N]';

  return new Promise((resolve) => {
    rl.question(`${question} ${hint} `, (answer) => {
      rl.close();
      const trimmed = answer.trim().toLowerCase();
      if (trimmed === '') {
        resolve(defaultYes);
      } else {
        resolve(trimmed === 'y' || trimmed === 'yes');
      }
    });
  });
}

/**
 * Asks a checkbox-style question. Returns array of selected labels.
 * Items: [{ label, description, defaultSelected }]
 */
async function checkbox(question, items) {
  const rl = createInterface();

  console.log(`\n${question}`);
  items.forEach((item, i) => {
    const checked = item.defaultSelected ? 'x' : ' ';
    console.log(`  ${i + 1}. [${checked}] ${item.label} — ${item.description}`);
  });

  return new Promise((resolve) => {
    rl.question('\nEnter numbers to toggle (e.g., 1 3 4), or press Enter for defaults: ', (answer) => {
      rl.close();
      const trimmed = answer.trim();

      if (trimmed === '') {
        // Use defaults
        resolve(items.filter((item) => item.defaultSelected).map((item) => item.label));
        return;
      }

      const toggled = new Set(
        trimmed.split(/[\s,]+/).map(Number).filter((n) => n >= 1 && n <= items.length)
      );

      const selected = items
        .filter((item, i) => {
          const isDefault = item.defaultSelected;
          const wasToggled = toggled.has(i + 1);
          return isDefault ? !wasToggled : wasToggled;
        })
        .map((item) => item.label);

      resolve(selected);
    });
  });
}

/**
 * Asks a single-choice question. Returns the selected label.
 * Options: [{ label, description }]
 */
async function select(question, options) {
  const rl = createInterface();

  console.log(`\n${question}`);
  options.forEach((opt, i) => {
    console.log(`  ${i + 1}. ${opt.label} — ${opt.description}`);
  });

  return new Promise((resolve) => {
    rl.question('\nEnter number (default: 1): ', (answer) => {
      rl.close();
      const trimmed = answer.trim();

      if (trimmed === '') {
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
async function input(question, defaultValue = '') {
  const rl = createInterface();
  const hint = defaultValue ? ` [${defaultValue}]` : '';

  return new Promise((resolve) => {
    rl.question(`${question}${hint}: `, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

module.exports = { confirm, checkbox, select, input };
