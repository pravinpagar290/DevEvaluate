import chalk from "chalk";
import { ENV } from "./env.js";

const levels = {
  info: chalk.blue("INFO"),
  success: chalk.green("SUCCESS"),
  warn: chalk.yellow("WARN"),
  error: chalk.red("ERROR"),
  debug: chalk.magenta("DEBUG"),
};

const getTimestamp = () => {
  return chalk.gray(`[${new Date().toISOString()}]`);
};

export const logger = {
  info: (message, ...args) => {
    console.log(`${getTimestamp()} ${levels.info}: ${message}`, ...args);
  },
  success: (message, ...args) => {
    console.log(`${getTimestamp()} ${levels.success}: ${message}`, ...args);
  },
  warn: (message, ...args) => {
    console.warn(`${getTimestamp()} ${levels.warn}: ${message}`, ...args);
  },
  error: (message, error, ...args) => {
    console.error(`${getTimestamp()} ${levels.error}: ${message}`);
    if (error) {
      if (error.stack) {
        console.error(chalk.red(error.stack));
      } else {
        console.error(chalk.red(JSON.stringify(error, null, 2)));
      }
    }
    if (args.length > 0) {
      console.error(...args);
    }
  },
  debug: (message, ...args) => {
    if (ENV.NODE_ENV !== "production") {
      console.log(`${getTimestamp()} ${levels.debug}: ${message}`, ...args);
    }
  },
};
