import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Layout from './components/Layout';
import ProcessFlow from './components/ProcessFlow';
import CustomerDashboard from './components/CustomerDashboard';
import Releases from './components/Releases';
import TodoList from './components/TodoList';
import ChangeTracking from './components/ChangeTracking';
import ReportIssue from './components/ReportIssue';
import ReleaseNotes from './components/ReleaseNotes';
import HotfixManagement from './components/HotfixManagement';
import UrgentChanges from './components/UrgentChanges';
import ReleaseCalendar from './components/ReleaseCalendar';
import ReleaseHealthCheck from './components/ReleaseHealthCheck';
import PipelineStatus from './components/PipelineStatus';
import BetaTagRequest from './components/BetaTagRequest';
import HotfixRequest from './components/HotfixRequest';
import HotfixRequestApproval from './components/HotfixRequestApproval';
import VersionLifecycle from './components/VersionLifecycle';
import ServiceVersionMatrix from './components/ServiceVersionMatrix';
import CustomerReleaseTrack from './components/CustomerReleaseTrack';
import CustomerServiceMapping from './components/CustomerServiceMapping';
import CustomerManagement from './components/CustomerManagement';
import ProductManagement from './components/ProductManagement';
import ReleaseTodoManagement from './components/ReleaseTodoManagement';
import UrgentChangesManagement from './components/UrgentChangesManagement';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          scrollbarGutter: 'stable',
        },
        body: {
          scrollbarGutter: 'stable',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f1f1',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#c1c1c1',
            borderRadius: '4px',
            '&:hover': {
              background: '#a8a8a8',
            },
          },
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<ProcessFlow />} />
            <Route path="/customer-dashboard" element={<CustomerDashboard />} />
            <Route path="/releases" element={<Releases />} />
            <Route path="/todo-list" element={<TodoList />} />
            <Route path="/change-tracking" element={<ChangeTracking />} />
            <Route path="/report-issue" element={<ReportIssue />} />
            <Route path="/release-notes" element={<ReleaseNotes />} />
            <Route path="/hotfix-management" element={<HotfixManagement />} />
            <Route path="/urgent-changes" element={<UrgentChanges />} />
            <Route path="/release-calendar" element={<ReleaseCalendar />} />
            <Route path="/release-health-check" element={<ReleaseHealthCheck />} />
            <Route path="/pipeline-status" element={<PipelineStatus />} />
            <Route path="/beta-tag-request" element={<BetaTagRequest />} />
            <Route path="/hotfix-request" element={<HotfixRequest />} />
            <Route path="/hotfix-request-approval" element={<HotfixRequestApproval />} />
            <Route path="/version-lifecycle" element={<VersionLifecycle />} />
        <Route path="/service-version-matrix" element={<ServiceVersionMatrix />} />
        <Route path="/customer-release-track" element={<CustomerReleaseTrack />} />
        <Route path="/customer-service-mapping" element={<CustomerServiceMapping />} />
        <Route path="/customer-management" element={<CustomerManagement />} />
        <Route path="/product-management" element={<ProductManagement />} />
        <Route path="/release-todo-management" element={<ReleaseTodoManagement />} />
        <Route path="/urgent-changes-management" element={<UrgentChangesManagement />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;
