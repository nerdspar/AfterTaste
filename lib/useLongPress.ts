import { useCallback, useRef } from 'react';

interface Point {
  clientX: number;
  clientY: number;
}

interface UseLongPressOptions {
  onLongPress: (point: Point) => void;
  delay?: number;
  moveThreshold?: number;
}

/**
 * Fires `onLongPress` after a press-and-hold (touch or mouse) or on right-click.
 * Returns handlers to spread onto the target. `onClickCapture` swallows the
 * click that follows a long-press so a wrapping <Link> doesn't also navigate.
 */
export function useLongPress({
  onLongPress,
  delay = 500,
  moveThreshold = 10,
}: UseLongPressOptions) {
  const timer = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      fired.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      const point = { clientX: e.clientX, clientY: e.clientY };
      timer.current = window.setTimeout(() => {
        fired.current = true;
        onLongPress(point);
      }, delay);
    },
    [delay, onLongPress],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!start.current) return;
      if (
        Math.abs(e.clientX - start.current.x) > moveThreshold ||
        Math.abs(e.clientY - start.current.y) > moveThreshold
      ) {
        cancel();
      }
    },
    [cancel, moveThreshold],
  );

  const onPointerUp = useCallback(() => cancel(), [cancel]);
  const onPointerLeave = useCallback(() => cancel(), [cancel]);

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onLongPress({ clientX: e.clientX, clientY: e.clientY });
    },
    [onLongPress],
  );

  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (fired.current) {
      e.preventDefault();
      e.stopPropagation();
      fired.current = false;
    }
  }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
    onContextMenu,
    onClickCapture,
  };
}
