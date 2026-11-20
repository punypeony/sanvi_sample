import { useStageCover } from '../scroll/useStageCover';

// Mounted at the end of a page that covers the canvas, so its triggers are
// measured after the pins above it and die with the page.
export default function StageCover() {
  useStageCover();
  return null;
}
