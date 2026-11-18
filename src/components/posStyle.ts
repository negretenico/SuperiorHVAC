import type { CSSProperties } from "react";

/** Sets --pos (0 = ember/warm … 1 = ice/cool) for spectrum-colored elements. */
export const posStyle = (pos: number) => ({ "--pos": pos }) as CSSProperties;
