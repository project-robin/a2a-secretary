import { allPlugins } from "./plugins";

/**
 * Checks if a tool should be automatically handled by the agent.
 */
export function isAutoHandled(toolName: string): boolean {
  for (const plugin of allPlugins) {
    if (plugin.autonomyRules.autoHandle.includes(toolName)) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if a tool requires user confirmation.
 */
export function requiresConfirmation(toolName: string): boolean {
  for (const plugin of allPlugins) {
    if (plugin.autonomyRules.requireConfirmation.includes(toolName)) {
      return true;
    }
  }
  // Default to requiring confirmation for unknown tools in plugins
  return false;
}

/**
 * Gets the confirmation message/template for a tool if defined.
 * (Optional extension for better UI)
 */
export function getToolDescription(toolName: string): string {
  for (const plugin of allPlugins) {
    const tool = plugin.tools[toolName];
    if (tool) {
      return tool.description || toolName;
    }
  }
  return toolName;
}
