import { AgentPlugin } from "../plugin-types";
import { calendarPlugin } from "./calendar";
import { tasksPlugin } from "./tasks";
import { memoryPlugin } from "./memory";
import { a2aPlugin } from "./a2a";

export const allPlugins: AgentPlugin[] = [
  calendarPlugin,
  tasksPlugin,
  memoryPlugin,
  a2aPlugin,
];

export const defaultPlugins = allPlugins;

