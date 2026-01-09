import React, { memo } from 'react';
import './Dashboard.css';
import NewDashboardOverview from '../../components/dashboard/NewDashboardOverview';

const Dashboard: React.FC = memo(() => {
  return (
    <div className='dashboard-container'>
      <NewDashboardOverview />
    </div>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;
