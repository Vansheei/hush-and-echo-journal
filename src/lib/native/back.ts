type BackHandler = () => boolean;
const handlers: BackHandler[] = [];
export function registerBackHandler(handler: BackHandler) {
  handlers.push(handler);
  return () => { const index = handlers.indexOf(handler); if (index >= 0) handlers.splice(index, 1); };
}
export async function handleNativeBack(options: { canGoBack: boolean; path: string; back: () => void; home: () => void; exit: () => Promise<void> }) {
  if ([...handlers].reverse().some(h => h())) return;
  if (options.canGoBack) options.back();
  else if (options.path !== "/") options.home();
  else await options.exit();
}