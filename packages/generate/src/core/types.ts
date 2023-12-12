export type HookResult = Promise<void> | void;

export interface WatchEvent {
  id: string;
  event: "create" | "update" | "delete";
}

export interface PluginHooks {
  /**
   * Called when the unplugin buildStart hook is triggered.
   * @param context The configured Context object
   * @returns Promise
   */
  "generate:routes": (params: { clean?: boolean }) => HookResult;
}
