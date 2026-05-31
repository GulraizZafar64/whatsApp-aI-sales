/** Meta Graph API version for all server and SDK calls. */
export const META_GRAPH_VERSION = "v25.0";

export function metaGraphUrl(path: string): string {
  const p = path.replace(/^\//, "");
  return `https://graph.facebook.com/${META_GRAPH_VERSION}/${p}`;
}
