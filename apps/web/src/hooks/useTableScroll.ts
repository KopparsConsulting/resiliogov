import { useLayoutEffect, useRef, useState } from 'react';

/** Keeps a top scrollbar aligned with the table's single scrolling viewport. */
export function useTableScroll(enabled: boolean) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const topScrollbarRef = useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [scrollPosition, setScrollPosition] = useState({ left: 0, maximum: 0 });

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const topScrollbar = topScrollbarRef.current;
    if (!enabled || !viewport || !topScrollbar) return;

    const measure = () => {
      // Match the usable widths, including the reserved vertical scrollbar gutter.
      topScrollbar.style.width = `${viewport.clientWidth}px`;
      setScrollWidth(viewport.scrollWidth);
      setScrollPosition({ left: viewport.scrollLeft, maximum: viewport.scrollWidth - viewport.clientWidth });
      topScrollbar.scrollLeft = viewport.scrollLeft;
    };
    const syncFromViewport = () => {
      if (topScrollbar.scrollLeft !== viewport.scrollLeft) topScrollbar.scrollLeft = viewport.scrollLeft;
      setScrollPosition({ left: viewport.scrollLeft, maximum: viewport.scrollWidth - viewport.clientWidth });
    };
    const syncFromTop = () => {
      if (viewport.scrollLeft !== topScrollbar.scrollLeft) viewport.scrollLeft = topScrollbar.scrollLeft;
    };
    const shiftWheel = (event: WheelEvent) => {
      if (!event.shiftKey || event.deltaX !== 0 || event.deltaY === 0 || viewport.scrollWidth <= viewport.clientWidth) return;
      event.preventDefault();
      viewport.scrollLeft += event.deltaY;
    };
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    const table = viewport.querySelector('table');
    if (table) observer.observe(table);
    viewport.addEventListener('scroll', syncFromViewport);
    topScrollbar.addEventListener('scroll', syncFromTop);
    viewport.addEventListener('wheel', shiftWheel, { passive: false });
    topScrollbar.addEventListener('wheel', shiftWheel, { passive: false });
    measure();
    return () => {
      observer.disconnect();
      viewport.removeEventListener('scroll', syncFromViewport);
      topScrollbar.removeEventListener('scroll', syncFromTop);
      viewport.removeEventListener('wheel', shiftWheel);
      topScrollbar.removeEventListener('wheel', shiftWheel);
    };
  }, [enabled]);

  const scrollBy = (distance: number) => {
    viewportRef.current?.scrollBy({
      left: distance,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  };

  return { viewportRef, topScrollbarRef, scrollWidth, scrollBy,
    canScrollLeft: scrollPosition.left > 0,
    canScrollRight: scrollPosition.left < scrollPosition.maximum - 1 };
}