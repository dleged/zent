import { useCallback, useEffect, useRef } from 'react';

import getViewportSize from '../dom/getViewportSize';
import WindowEventHandler from './WindowEventHandler';
import { useRunOnceInNextFrame } from '../nextFrame';

const RESIZE_OPTIONS = {
  passive: true,
};

export interface IWindowResizeHandlerDelta {
  deltaX: number;
  deltaY: number;
}

export interface IWindowResizeHandlerProps {
  onResize(e: UIEvent, delta: IWindowResizeHandlerDelta): void;
  disableThrottle?: boolean;
}

/**
 * Register a resize event on Window
 *
 * The event handler got a second parameter: {deltaX, deltaY}.
 * The `onResize` callback is throttled to run only once in a frame, you don't need to throttle the callback.
 */
export const WindowResizeHandler: React.FC<
  React.PropsWithChildren<IWindowResizeHandlerProps>
> = ({ disableThrottle = false, onResize: onResizeProp }) => {
  const prevViewportSize = useRef<{
    width: number;
    height: number;
  }>(null);

  const cb = useRef(onResizeProp);
  cb.current = onResizeProp;

  const onResizeCallback = useCallback((evt: UIEvent) => {
    const viewportSize = getViewportSize();

    if (!prevViewportSize.current) {
      prevViewportSize.current = viewportSize;
    }

    const prev = prevViewportSize.current;

    const delta = {
      deltaX: viewportSize.width - prev.width,
      deltaY: viewportSize.height - prev.height,
    };

    if (delta.deltaX === 0 && delta.deltaY === 0) {
      return;
    }

    cb.current(evt, delta);
    prevViewportSize.current = viewportSize;
  }, []);

  const onResize = useRunOnceInNextFrame(onResizeCallback, disableThrottle);

  useEffect(() => {
    prevViewportSize.current = getViewportSize();
    return onResize.cancel;
  }, [onResize]);

  return (
    <WindowEventHandler
      eventName="resize"
      listener={onResize}
      options={RESIZE_OPTIONS}
    />
  );
};
