import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  Grid,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  LinearProgress,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PendingIcon from '@mui/icons-material/Pending';
import CodeIcon from '@mui/icons-material/Code';
import DescriptionIcon from '@mui/icons-material/Description';
import BuildIcon from '@mui/icons-material/Build';
import CloudIcon from '@mui/icons-material/Cloud';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import ArticleIcon from '@mui/icons-material/Article';
import TimelineIcon from '@mui/icons-material/Timeline';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

// Mock Data
const mockData = {
  services: [
    {
      id: 1,
      name: 'Cofins.CustomerPortal',
      pullRequests: [
        {
          id: 26042,
          title: '#207229 : statü güncelleme aksiyonlarının dinamikleştirilmesi',
          author: 'Ahmet Yılmaz',
          date: '2025-12-26',
          status: 'completed',
          workItem: {
            id: 207229,
            title: 'Statü güncelleme aksiyonlarının dinamikleştirilmesi',
            releaseNotes: {
              status: 'generated',
              content: 'Statü güncelleme aksiyonları dinamik yapıya dönüştürüldü...'
            },
            codeChanges: {
              status: 'analyzed',
              filesChanged: 12,
              linesAdded: 245,
              linesDeleted: 89
            }
          },
          deployment: {
            prStatus: 'completed',
            prCompletedAt: '2025-12-26 10:15',
            pipeline: {
              status: 'succeeded',
              buildNumber: '20251226.1',
              url: 'https://dev.azure.com/...',
              startedAt: '2025-12-26 10:20',
              completedAt: '2025-12-26 10:35',
              duration: '15 dk'
            },
            testEnvironment: {
              imageDeployed: true,
              imageName: 'cofins.customerportal:20251226.1',
              status: 'running',
              deployedAt: '2025-12-26 10:40',
              healthCheck: 'healthy',
              replicas: '3/3'
            },
            prepRelease: {
              status: 'approved',
              approver: 'Mehmet Demir',
              approvalDate: '2025-12-26 14:30',
              releaseName: 'Release-1.0.20251226.1'
            },
            prepEnvironment: {
              imageDeployed: true,
              imageName: 'cofins.customerportal:20251226.1',
              status: 'running',
              deployedAt: '2025-12-26 15:00',
              healthCheck: 'healthy',
              replicas: '5/5'
            }
          }
        },
        {
          id: 26043,
          title: '#207230 : API timeout ayarlarının iyileştirilmesi',
          author: 'Ayşe Kaya',
          date: '2025-12-25',
          status: 'completed',
          workItem: {
            id: 207230,
            title: 'API timeout ayarlarının iyileştirilmesi',
            releaseNotes: {
              status: 'pending',
              content: ''
            },
            codeChanges: {
              status: 'analyzed',
              filesChanged: 5,
              linesAdded: 78,
              linesDeleted: 34
            }
          },
          deployment: {
            prStatus: 'completed',
            prCompletedAt: '2025-12-25 16:45',
            pipeline: {
              status: 'failed',
              buildNumber: '20251225.3',
              url: 'https://dev.azure.com/...',
              startedAt: '2025-12-25 16:50',
              completedAt: '2025-12-25 17:05',
              duration: '15 dk',
              errorMessage: 'Unit tests failed: 3 tests'
            },
            testEnvironment: {
              imageDeployed: false,
              imageName: '',
              status: 'not_deployed',
              deployedAt: '',
              healthCheck: 'unknown',
              replicas: '0/0'
            },
            prepRelease: {
              status: 'not_started',
              approver: '',
              approvalDate: '',
              releaseName: ''
            },
            prepEnvironment: {
              imageDeployed: false,
              imageName: '',
              status: 'not_deployed',
              deployedAt: '',
              healthCheck: 'unknown',
              replicas: '0/0'
            }
          }
        }
      ]
    },
    {
      id: 2,
      name: 'OBA.Cofins.Service.Api',
      pullRequests: [
        {
          id: 26386,
          title: '#209168 : backoffice firstForm listeleme fix',
          author: 'Can Öztürk',
          date: '2025-12-26',
          status: 'completed',
          workItem: {
            id: 209168,
            title: 'BackOffice firstForm listeleme hatası',
            releaseNotes: {
              status: 'generated',
              content: 'BackOffice form listeleme sorunu düzeltildi...'
            },
            codeChanges: {
              status: 'analyzed',
              filesChanged: 8,
              linesAdded: 156,
              linesDeleted: 67
            }
          },
          deployment: {
            prStatus: 'completed',
            prCompletedAt: '2025-12-26 09:30',
            pipeline: {
              status: 'succeeded',
              buildNumber: '20251226.1',
              url: 'https://dev.azure.com/...',
              startedAt: '2025-12-26 09:35',
              completedAt: '2025-12-26 09:48',
              duration: '13 dk'
            },
            testEnvironment: {
              imageDeployed: true,
              imageName: 'oba.cofins.service.api:20251226.1',
              status: 'running',
              deployedAt: '2025-12-26 09:55',
              healthCheck: 'healthy',
              replicas: '4/4'
            },
            prepRelease: {
              status: 'pending',
              approver: '',
              approvalDate: '',
              releaseName: 'Release-1.0.20251226.1',
              waitingFor: 'Product Owner Approval'
            },
            prepEnvironment: {
              imageDeployed: false,
              imageName: '',
              status: 'not_deployed',
              deployedAt: '',
              healthCheck: 'unknown',
              replicas: '0/0'
            }
          }
        }
      ]
    }
  ]
};

const PRDetailedAnalyze = () => {
  const [expandedServices, setExpandedServices] = useState({});
  const [expandedPRs, setExpandedPRs] = useState({});

  const toggleService = (serviceId) => {
    setExpandedServices(prev => ({
      ...prev,
      [serviceId]: !prev[serviceId]
    }));
  };

  const togglePR = (prId) => {
    setExpandedPRs(prev => ({
      ...prev,
      [prId]: !prev[prId]
    }));
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'succeeded':
      case 'completed':
      case 'approved':
      case 'generated':
      case 'analyzed':
      case 'running':
        return <CheckCircleIcon fontSize="small" />;
      case 'failed':
      case 'rejected':
      case 'error':
        return <ErrorIcon fontSize="small" />;
      case 'pending':
      case 'not_started':
      case 'not_deployed':
        return <PendingIcon fontSize="small" />;
      default:
        return <PendingIcon fontSize="small" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'succeeded':
      case 'completed':
      case 'approved':
      case 'generated':
      case 'analyzed':
      case 'running':
        return 'success';
      case 'failed':
      case 'rejected':
      case 'error':
        return 'error';
      case 'pending':
      case 'not_started':
      case 'not_deployed':
        return 'warning';
      default:
        return 'default';
    }
  };

  const renderStepChip = (label, status, icon) => (
    <Chip
      icon={icon || getStatusIcon(status)}
      label={label}
      size="small"
      color={getStatusColor(status)}
      sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}
    />
  );

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TimelineIcon color="primary" />
          <Typography variant="h6">
            PR Detaylı Analiz
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box>
          {mockData.services.map((service) => (
            <Paper
              key={service.id}
              sx={{
                mb: 2,
                border: '1px solid #e0e0e0',
                boxShadow: 'none'
              }}
            >
              <Box
                onClick={() => toggleService(service.id)}
                sx={{
                  p: 2,
                  bgcolor: '#f5f5f5',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  '&:hover': { bgcolor: '#eeeeee' }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CodeIcon color="primary" />
                  <Typography variant="h6" fontWeight="bold">
                    {service.name}
                  </Typography>
                  <Chip
                    label={`${service.pullRequests.length} PR`}
                    size="small"
                    color="primary"
                  />
                </Box>
                <ExpandMoreIcon
                  sx={{
                    transform: expandedServices[service.id] ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s'
                  }}
                />
              </Box>

              {expandedServices[service.id] && (
                <Box sx={{ p: 2 }}>
                  {service.pullRequests.map((pr) => (
                    <Card
                      key={pr.id}
                      sx={{
                        mb: 2,
                        border: '2px solid #e3f2fd',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    >
                      <CardContent>
                        {/* PR Header */}
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Chip
                              label={`PR #${pr.id}`}
                              size="small"
                              color="primary"
                              sx={{ fontWeight: 'bold' }}
                            />
                            <Typography variant="body2" fontWeight="bold" sx={{ flex: 1 }}>
                              {pr.title}
                            </Typography>
                            <Chip
                              label={pr.status}
                              size="small"
                              color={getStatusColor(pr.status)}
                            />
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            by {pr.author} • {pr.date}
                          </Typography>
                        </Box>

                        <Grid container spacing={2}>
                          {/* Sol Taraf - İçerik/Dokümantasyon */}
                          <Grid item xs={12} md={6}>
                            <Paper
                              sx={{
                                p: 2,
                                bgcolor: '#f9fbe7',
                                border: '1px solid #dce775',
                                height: '100%'
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <ArticleIcon color="primary" fontSize="small" />
                                <Typography variant="subtitle2" fontWeight="bold">
                                  İçerik & Dokümantasyon
                                </Typography>
                              </Box>

                              {/* Work Item */}
                              <Box sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                  <Box
                                    sx={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: '50%',
                                      bgcolor: 'primary.main'
                                    }}
                                  />
                                  <Typography variant="caption" fontWeight="bold">
                                    Work Item #{pr.workItem.id}
                                  </Typography>
                                </Box>
                                <Box sx={{ ml: 2, pl: 2, borderLeft: '2px solid #1976d2' }}>
                                  <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
                                    {pr.workItem.title}
                                  </Typography>

                                  {/* Release Notes */}
                                  <Box sx={{ mb: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                      <DescriptionIcon sx={{ fontSize: 14, color: '#757575' }} />
                                      <Typography variant="caption" fontWeight="bold">
                                        Release Notes:
                                      </Typography>
                                    </Box>
                                    <Box sx={{ ml: 2.5 }}>
                                      {renderStepChip(
                                        pr.workItem.releaseNotes.status,
                                        pr.workItem.releaseNotes.status
                                      )}
                                    </Box>
                                  </Box>

                                  {/* Code Changes */}
                                  <Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                      <CodeIcon sx={{ fontSize: 14, color: '#757575' }} />
                                      <Typography variant="caption" fontWeight="bold">
                                        Code Analysis:
                                      </Typography>
                                    </Box>
                                    <Box sx={{ ml: 2.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                      {renderStepChip(
                                        pr.workItem.codeChanges.status,
                                        pr.workItem.codeChanges.status
                                      )}
                                      <Chip
                                        label={`${pr.workItem.codeChanges.filesChanged} files`}
                                        size="small"
                                        variant="outlined"
                                        sx={{ fontSize: '0.65rem' }}
                                      />
                                      <Chip
                                        label={`+${pr.workItem.codeChanges.linesAdded}`}
                                        size="small"
                                        variant="outlined"
                                        color="success"
                                        sx={{ fontSize: '0.65rem' }}
                                      />
                                      <Chip
                                        label={`-${pr.workItem.codeChanges.linesDeleted}`}
                                        size="small"
                                        variant="outlined"
                                        color="error"
                                        sx={{ fontSize: '0.65rem' }}
                                      />
                                    </Box>
                                  </Box>
                                </Box>
                              </Box>
                            </Paper>
                          </Grid>

                          {/* Sağ Taraf - Deployment Pipeline */}
                          <Grid item xs={12} md={6}>
                            <Paper
                              sx={{
                                p: 2,
                                bgcolor: '#e3f2fd',
                                border: '1px solid #90caf9',
                                height: '100%',
                                overflow: 'hidden'
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <RocketLaunchIcon color="primary" fontSize="small" />
                                <Typography variant="subtitle2" fontWeight="bold">
                                  Deployment Pipeline
                                </Typography>
                              </Box>

                              {/* Horizontal Pipeline Flow */}
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: 1,
                                  overflowX: 'auto',
                                  pb: 1,
                                  '&::-webkit-scrollbar': {
                                    height: 6,
                                  },
                                  '&::-webkit-scrollbar-track': {
                                    bgcolor: '#f0f0f0',
                                    borderRadius: 3,
                                  },
                                  '&::-webkit-scrollbar-thumb': {
                                    bgcolor: '#1976d2',
                                    borderRadius: 3,
                                  }
                                }}
                              >
                                {/* 1. PR Completed */}
                                <Box sx={{ minWidth: 140, flex: '0 0 auto' }}>
                                  <Paper
                                    elevation={2}
                                    sx={{
                                      p: 1,
                                      bgcolor: pr.deployment.prStatus === 'completed' ? '#e8f5e9' : '#fff',
                                      border: pr.deployment.prStatus === 'completed' ? '2px solid #4caf50' : '1px solid #ddd',
                                      cursor: 'pointer',
                                      height: '100%',
                                      '&:hover': { boxShadow: 3 }
                                    }}
                                  >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                      {getStatusIcon(pr.deployment.prStatus)}
                                      <Typography variant="caption" fontWeight="bold" sx={{ fontSize: '0.7rem' }}>
                                        PR
                                      </Typography>
                                    </Box>
                                    <Chip
                                      label={pr.deployment.prStatus}
                                      size="small"
                                      color={getStatusColor(pr.deployment.prStatus)}
                                      sx={{ height: 18, fontSize: '0.6rem', mb: 0.5 }}
                                    />
                                    {pr.deployment.prCompletedAt && (
                                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', display: 'block' }}>
                                        {pr.deployment.prCompletedAt}
                                      </Typography>
                                    )}
                                  </Paper>
                                </Box>

                                {/* Arrow */}
                                <Box sx={{ display: 'flex', alignItems: 'center', pt: 3 }}>
                                  <ArrowForwardIcon sx={{ fontSize: 20, color: '#1976d2' }} />
                                </Box>

                                {/* 2. Build Pipeline */}
                                <Box sx={{ minWidth: 160, flex: '0 0 auto' }}>
                                  <Paper
                                    elevation={2}
                                    onClick={() => window.open(pr.deployment.pipeline.url, '_blank')}
                                    sx={{
                                      p: 1,
                                      bgcolor: pr.deployment.pipeline.status === 'succeeded' ? '#e8f5e9' : 
                                               pr.deployment.pipeline.status === 'failed' ? '#ffebee' : '#fff',
                                      border: pr.deployment.pipeline.status === 'succeeded' ? '2px solid #4caf50' : 
                                              pr.deployment.pipeline.status === 'failed' ? '2px solid #f44336' : '1px solid #ddd',
                                      cursor: 'pointer',
                                      height: '100%',
                                      '&:hover': { boxShadow: 3 }
                                    }}
                                  >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                      <BuildIcon sx={{ fontSize: 14 }} color="primary" />
                                      <Typography variant="caption" fontWeight="bold" sx={{ fontSize: '0.7rem' }}>
                                        Build
                                      </Typography>
                                    </Box>
                                    <Chip
                                      label={pr.deployment.pipeline.status}
                                      size="small"
                                      color={getStatusColor(pr.deployment.pipeline.status)}
                                      sx={{ height: 18, fontSize: '0.6rem', mb: 0.5 }}
                                    />
                                    <Chip
                                      label={pr.deployment.pipeline.buildNumber}
                                      size="small"
                                      variant="outlined"
                                      sx={{ fontFamily: 'monospace', fontSize: '0.55rem', height: 16, mb: 0.5 }}
                                    />
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', display: 'block' }}>
                                      {pr.deployment.pipeline.duration}
                                    </Typography>
                                    {pr.deployment.pipeline.errorMessage && (
                                      <Typography variant="caption" color="error" sx={{ fontSize: '0.55rem', display: 'block', mt: 0.5 }}>
                                        ⚠️ {pr.deployment.pipeline.errorMessage}
                                      </Typography>
                                    )}
                                  </Paper>
                                </Box>

                                {/* Arrow */}
                                {pr.deployment.pipeline.status === 'succeeded' && (
                                  <>
                                    <Box sx={{ display: 'flex', alignItems: 'center', pt: 3 }}>
                                      <ArrowForwardIcon sx={{ fontSize: 20, color: '#1976d2' }} />
                                    </Box>

                                    {/* 3. Test Environment */}
                                    <Box sx={{ minWidth: 160, flex: '0 0 auto' }}>
                                      <Paper
                                        elevation={2}
                                        sx={{
                                          p: 1,
                                          bgcolor: pr.deployment.testEnvironment.status === 'running' ? '#e8f5e9' : '#fff',
                                          border: pr.deployment.testEnvironment.status === 'running' ? '2px solid #4caf50' : '1px solid #ddd',
                                          cursor: 'pointer',
                                          height: '100%',
                                          '&:hover': { boxShadow: 3 }
                                        }}
                                      >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                          <CloudIcon sx={{ fontSize: 14 }} color="primary" />
                                          <Typography variant="caption" fontWeight="bold" sx={{ fontSize: '0.7rem' }}>
                                            Test
                                          </Typography>
                                        </Box>
                                        <Chip
                                          label={pr.deployment.testEnvironment.status}
                                          size="small"
                                          color={getStatusColor(pr.deployment.testEnvironment.status)}
                                          sx={{ height: 18, fontSize: '0.6rem', mb: 0.5 }}
                                        />
                                        {pr.deployment.testEnvironment.imageDeployed && (
                                          <>
                                            <Chip
                                              label={pr.deployment.testEnvironment.replicas}
                                              size="small"
                                              color="success"
                                              sx={{ fontSize: '0.55rem', height: 16, mb: 0.5 }}
                                            />
                                            <Chip
                                              label={pr.deployment.testEnvironment.healthCheck}
                                              size="small"
                                              color="success"
                                              icon={<CheckCircleOutlineIcon />}
                                              sx={{ fontSize: '0.55rem', height: 16 }}
                                            />
                                          </>
                                        )}
                                      </Paper>
                                    </Box>
                                  </>
                                )}

                                {/* Arrow */}
                                {pr.deployment.testEnvironment.status === 'running' && (
                                  <>
                                    <Box sx={{ display: 'flex', alignItems: 'center', pt: 3 }}>
                                      <ArrowForwardIcon sx={{ fontSize: 20, color: '#1976d2' }} />
                                    </Box>

                                    {/* 4. Prep Release */}
                                    <Box sx={{ minWidth: 160, flex: '0 0 auto' }}>
                                      <Paper
                                        elevation={2}
                                        sx={{
                                          p: 1,
                                          bgcolor: pr.deployment.prepRelease.status === 'approved' ? '#e8f5e9' : 
                                                   pr.deployment.prepRelease.status === 'pending' ? '#fff3e0' : '#fff',
                                          border: pr.deployment.prepRelease.status === 'approved' ? '2px solid #4caf50' : 
                                                  pr.deployment.prepRelease.status === 'pending' ? '2px solid #ff9800' : '1px solid #ddd',
                                          cursor: 'pointer',
                                          height: '100%',
                                          '&:hover': { boxShadow: 3 }
                                        }}
                                      >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                          <CheckCircleIcon sx={{ fontSize: 14 }} color="primary" />
                                          <Typography variant="caption" fontWeight="bold" sx={{ fontSize: '0.7rem' }}>
                                            Release
                                          </Typography>
                                        </Box>
                                        <Chip
                                          label={pr.deployment.prepRelease.status}
                                          size="small"
                                          color={getStatusColor(pr.deployment.prepRelease.status)}
                                          sx={{ height: 18, fontSize: '0.6rem', mb: 0.5 }}
                                        />
                                        {pr.deployment.prepRelease.status === 'approved' && (
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <PersonIcon sx={{ fontSize: 10, color: '#757575' }} />
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem' }}>
                                              {pr.deployment.prepRelease.approver}
                                            </Typography>
                                          </Box>
                                        )}
                                        {pr.deployment.prepRelease.waitingFor && (
                                          <Typography variant="caption" color="warning.main" sx={{ fontSize: '0.55rem', display: 'block', mt: 0.5 }}>
                                            ⏳ {pr.deployment.prepRelease.waitingFor}
                                          </Typography>
                                        )}
                                      </Paper>
                                    </Box>
                                  </>
                                )}

                                {/* Arrow */}
                                {pr.deployment.prepRelease.status === 'approved' && (
                                  <>
                                    <Box sx={{ display: 'flex', alignItems: 'center', pt: 3 }}>
                                      <ArrowForwardIcon sx={{ fontSize: 20, color: '#1976d2' }} />
                                    </Box>

                                    {/* 5. Prep Environment */}
                                    <Box sx={{ minWidth: 160, flex: '0 0 auto' }}>
                                      <Paper
                                        elevation={2}
                                        sx={{
                                          p: 1,
                                          bgcolor: pr.deployment.prepEnvironment.status === 'running' ? '#e8f5e9' : '#fff',
                                          border: pr.deployment.prepEnvironment.status === 'running' ? '2px solid #4caf50' : '1px solid #ddd',
                                          cursor: 'pointer',
                                          height: '100%',
                                          '&:hover': { boxShadow: 3 }
                                        }}
                                      >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                          <CloudIcon sx={{ fontSize: 14 }} color="secondary" />
                                          <Typography variant="caption" fontWeight="bold" sx={{ fontSize: '0.7rem' }}>
                                            Prep
                                          </Typography>
                                        </Box>
                                        <Chip
                                          label={pr.deployment.prepEnvironment.status}
                                          size="small"
                                          color={getStatusColor(pr.deployment.prepEnvironment.status)}
                                          sx={{ height: 18, fontSize: '0.6rem', mb: 0.5 }}
                                        />
                                        {pr.deployment.prepEnvironment.imageDeployed && (
                                          <>
                                            <Chip
                                              label={pr.deployment.prepEnvironment.replicas}
                                              size="small"
                                              color="success"
                                              sx={{ fontSize: '0.55rem', height: 16, mb: 0.5 }}
                                            />
                                            <Chip
                                              label={pr.deployment.prepEnvironment.healthCheck}
                                              size="small"
                                              color="success"
                                              icon={<CheckCircleOutlineIcon />}
                                              sx={{ fontSize: '0.55rem', height: 16 }}
                                            />
                                          </>
                                        )}
                                      </Paper>
                                    </Box>
                                  </>
                                )}
                              </Box>
                            </Paper>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
            </Paper>
          ))}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export default PRDetailedAnalyze;
