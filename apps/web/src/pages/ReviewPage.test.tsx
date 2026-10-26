import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ReviewPage from './ReviewPage';

vi.mock('@/hooks/useReviewQueueCounts', () => ({
  useReviewQueueCounts: () => ({ requirements: 2, domains: 417, links: 316, total: 735 }),
}));
vi.mock('@/hooks/useRequirements', () => ({
  useRequirements: () => ({
    isLoading: false,
    data: [
      { id: 'a', repealed_at: null, source_name: 'MCFFS 2026:11', chapter_section: '3 kap. 1 §', description: 'Systematiskt säkerhetsarbete' },
      { id: 'b', repealed_at: null, source_name: 'MCFFS 2026:11', chapter_section: '3 kap. 2 §', description: 'Godkänt krav' },
      { id: 'c', repealed_at: '2026-10-01', source_name: 'MCFFS 2026:11', chapter_section: '9 kap. 1 §', description: 'Upphävt krav' },
    ],
  }),
}));
vi.mock('@/hooks/useRequirementReviews', () => ({
  useReviewStatus: () => ({ data: new Map([['b', { review_state: 'approved' }]]) }),
  needsReview: (s?: { review_state: string }) => !s || s.review_state !== 'approved',
}));
vi.mock('@/components/requirements/RequirementReviewActions', () => ({ ReviewStatusBadge: () => <span>status</span> }));
vi.mock('@/components/requirements/DomainSuggestionsCard', () => ({
  DomainSuggestionsCard: ({ layout }: { layout?: string }) => <div>domänkö {layout}</div>,
}));
vi.mock('@/components/requirements/RequirementLinkSuggestionsCard', () => ({
  RequirementLinkSuggestionsCard: ({ layout }: { layout?: string }) => <div>länkkö {layout}</div>,
}));

afterEach(cleanup);

const renderAt = (url: string) => render(<MemoryRouter initialEntries={[url]}><ReviewPage /></MemoryRouter>);

describe('ReviewPage', () => {
  it('visar krav att granska som standard, utan godkända och upphävda', () => {
    renderAt('/review');
    expect(screen.getByText('Systematiskt säkerhetsarbete')).toBeInTheDocument();
    expect(screen.queryByText('Godkänt krav')).not.toBeInTheDocument();
    expect(screen.queryByText('Upphävt krav')).not.toBeInTheDocument();
    expect(screen.getByText('417')).toBeInTheDocument();
    expect(screen.getByText('316')).toBeInTheDocument();
  });

  it('öppnar fliken från adressen och ger köerna hela sidan', () => {
    renderAt('/review?tab=lankar');
    expect(screen.getByText('länkkö page')).toBeInTheDocument();
    expect(screen.queryByText('Systematiskt säkerhetsarbete')).not.toBeInTheDocument();
  });

  it('domänfliken använder sidlayouten', () => {
    renderAt('/review?tab=domaner');
    expect(screen.getByText('domänkö page')).toBeInTheDocument();
  });
});
