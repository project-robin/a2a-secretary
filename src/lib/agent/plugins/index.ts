import { AgentPlugin } from "../plugin-types";
import { calendarPlugin } from "./calendar";
import { tasksPlugin } from "./tasks";
import { memoryPlugin } from "./memory";
import { a2aPlugin } from "./a2a";
import { autonomyPlugin } from "./autonomy";

export const allPlugins: AgentPlugin[] = [
  calendarPlugin,
  tasksPlugin,
  memoryPlugin,
  a2aPlugin,
  autonomyPlugin,
];

export const defaultPlugins = allPlugins;

