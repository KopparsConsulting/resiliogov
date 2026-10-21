import { useParams } from 'react-router-dom';
import { DomainDetail } from '@/components/domain/DomainDetail';
import { ManagerChecklist } from '@/components/domain/ManagerChecklist';

const DomainPage = () => {
  const { slug } = useParams<{ slug: string }>();

  // Special case for manager checklist
  if (slug === 'manager-checklist') {
    return <ManagerChecklist />;
  }

  return <DomainDetail />;
};

export default DomainPage;
