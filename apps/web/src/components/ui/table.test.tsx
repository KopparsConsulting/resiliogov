import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Table, TableBody, TableCell, TableRow } from './table';

afterEach(cleanup);

describe('Table scroll container', () => {
  it('preserves the default wrapper for existing callers', () => {
    render(<Table><TableBody><TableRow><TableCell>Krav</TableCell></TableRow></TableBody></Table>);
    expect(screen.getByRole('table').parentElement).toHaveClass('relative', 'w-full', 'overflow-auto');
  });

  it('lets constrained viewports opt out without passing the prop to the table', () => {
    render(<Table containerClassName="overflow-visible" className="min-w-full" aria-label="Kravlista"><TableBody /></Table>);
    const table = screen.getByRole('table', { name: 'Kravlista' });
    expect(table.parentElement).toHaveClass('relative', 'w-full', 'overflow-visible');
    expect(table.parentElement).not.toHaveClass('overflow-auto');
    expect(table).not.toHaveAttribute('containerClassName');
    expect(table).toHaveClass('min-w-full');
  });
});