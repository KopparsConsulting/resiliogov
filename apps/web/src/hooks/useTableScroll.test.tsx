import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTableScroll } from './useTableScroll';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function ScrollHarness() {
  const { viewportRef, topScrollbarRef, scrollWidth, canScrollRight } = useTableScroll(true);
  return <>
    <div ref={topScrollbarRef} data-testid="top"><div style={{ width: scrollWidth }} /></div>
    <div ref={viewportRef} data-testid="viewport"><table><tbody /></table></div>
    <span>{canScrollRight ? 'right enabled' : 'right disabled'}</span>
  </>;
}

describe('useTableScroll', () => {
  it('measures overflow and synchronizes both directions and Shift+wheel', () => {
    let resize = () => {};
    const disconnect = vi.fn();
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: () => void) { resize = callback; }
      observe() {}
      disconnect = disconnect;
    });
    const { unmount } = render(<ScrollHarness />);
    const viewport = screen.getByTestId('viewport');
    const top = screen.getByTestId('top');
    Object.defineProperties(viewport, { clientWidth: { value: 600 }, scrollWidth: { value: 1800 } });
    act(() => resize());
    expect(top).toHaveStyle({ width: '600px' });
    expect(top.firstElementChild).toHaveStyle({ width: '1800px' });
    expect(screen.getByText('right enabled')).toBeInTheDocument();
    viewport.scrollLeft = 400;
    fireEvent.scroll(viewport);
    expect(top.scrollLeft).toBe(400);
    top.scrollLeft = 800;
    fireEvent.scroll(top);
    expect(viewport.scrollLeft).toBe(800);
    fireEvent.wheel(viewport, { shiftKey: true, deltaY: 200 });
    expect(viewport.scrollLeft).toBe(1000);
    fireEvent.wheel(viewport, { deltaY: 200 });
    expect(viewport.scrollLeft).toBe(1000);
    fireEvent.wheel(viewport, { shiftKey: true, deltaX: 100, deltaY: 0 });
    expect(viewport.scrollLeft).toBe(1000);
    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});