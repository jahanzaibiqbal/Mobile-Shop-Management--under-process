import React from 'react';
import { SaleLog, UserRole } from '../types';
import { SalesReportDashboard } from './SalesReportDashboard';

interface SalesHistoryProps {
  logs: SaleLog[];
  currentUser: UserRole;
  onCancelSale: (saleId: string) => void;
}

export const SalesHistory: React.FC<SalesHistoryProps> = ({
  logs,
  currentUser,
  onCancelSale,
}) => {
  return (
    <SalesReportDashboard
      logs={logs}
      currentUser={currentUser}
      onCancelSale={onCancelSale}
    />
  );
};

