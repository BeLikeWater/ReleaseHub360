import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Card,
  CardContent,
  Divider,
  IconButton,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  HourglassEmpty as PendingIcon,
  Build as BuildIcon,
  CloudUpload as DeployIcon,
  BugReport as BugIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayArrowIcon,
  ArrowForward as ArrowForwardIcon,
  Timeline as SimulationIcon,
} from '@mui/icons-material';

const PipelineStatus = () => {
  const navigate = useNavigate();

  // Mock pipeline data
  const [selectedVersion, setSelectedVersion] = useState('release/v1.0.0');
  const [pipelineData, setPipelineData] = useState({
    'release/v1.0.0': {
      branches: [
        {
          name: 'release/v1.0.0',
          stages: [
            { id: 1, name: 'release/v1.0.0-beta-1', status: 'success', type: 'tag' },
            { id: 2, name: 'Azure Pipeline', status: 'success', type: 'deploy' },
            { id: 3, name: 'Docker Image', status: 'success', type: 'build' },
            { id: 4, name: 'K8s Test', status: 'success', type: 'deploy' },
            { id: 5, name: 'Test ortamında bir bug oluştu', status: 'bug', type: 'bug' },
          ]
        },
        {
          name: 'release/v1.0.0-beta-2',
          stages: [
            { id: 6, name: 'release/v1.0.0-beta-2', status: 'success', type: 'tag' },
            { id: 7, name: 'Azure Pipeline', status: 'success', type: 'deploy' },
          ]
        },
        {
          name: 'release/v1.0.0-rc-1',
          stages: [
            { id: 8, name: 'release/v1.0.0-rc-1', status: 'success', type: 'tag' },
            { id: 9, name: 'Azure Pipeline', status: 'success', type: 'deploy' },
            { id: 10, name: 'Docker Image', status: 'success', type: 'build' },
            { id: 11, name: 'K8s PreProd', status: 'success', type: 'deploy' },
          ]
        },
        {
          name: 'release/v1.0.0-rc-2',
          stages: [
            { id: 13, name: 'release/v1.0.0-rc-2', status: 'success', type: 'tag' },
            { id: 14, name: 'Azure Pipeline', status: 'success', type: 'deploy' },
          ]
        },
      ],
      bugFix: {
        status: 'bug',
        number: 'BugFix',
        description: 'Bug tespit edildi',
        showAfterStage: 11
      },
      hotfix: {
        branch: 'release/v1.0.1',
        stages: [
          { id: 13, name: 'release/v1.0.1-rc-1', status: 'success', type: 'tag' },
          { id: 14, name: 'Azure Pipeline', status: 'success', type: 'deploy' },
          { id: 15, name: 'Docker Image', status: 'success', type: 'build' },
          { id: 16, name: 'K8s PreProd', status: 'success', type: 'deploy' },
        ]
      },
      environments: [
        {
          name: 'Environment Per Version',
          subEnv: 'release/v1.0.1-beta-1',
          stages: [
            { name: 'Azure Pipeline', status: 'success' },
            { name: 'Docker Image', status: 'success' },
            { name: 'K8s PreProd-v1.0.0', status: 'success' },
          ]
        }
      ]
    },
    'release/v2.0.0': {
      branches: [
        {
          name: 'release/v2.0.0',
          stages: [
            { id: 1, name: 'release/v2.0.0-beta-1', status: 'success', type: 'tag' },
            { id: 2, name: 'Azure Pipeline', status: 'running', type: 'deploy' },
            { id: 3, name: 'Docker Image', status: 'pending', type: 'build' },
            { id: 4, name: 'K8s Test', status: 'pending', type: 'deploy' },
          ]
        },
      ],
      bugFix: null,
      hotfix: null,
      environments: []
    }
  });

  const versions = ['release/v1.0.0', 'release/v2.0.0'];
  const currentPipeline = pipelineData[selectedVersion];

  // Status için renk ve icon getirme
  const getStatusInfo = (status) => {
    switch (status) {
      case 'success':
        return { color: 'success', icon: <CheckCircleIcon />, label: 'Başarılı', bgColor: '#4caf50' };
      case 'failed':
        return { color: 'error', icon: <CancelIcon />, label: 'Başarısız', bgColor: '#f44336' };
      case 'running':
        return { color: 'warning', icon: <RefreshIcon className="rotating" />, label: 'Çalışıyor', bgColor: '#ff9800' };
      case 'pending':
        return { color: 'default', icon: <PendingIcon />, label: 'Bekliyor', bgColor: '#9e9e9e' };
      case 'bug':
        return { color: 'error', icon: <BugIcon />, label: 'Bug', bgColor: '#d32f2f' };
      default:
        return { color: 'default', icon: <PendingIcon />, label: 'Bilinmiyor', bgColor: '#757575' };
    }
  };

  // Stage tipi için icon
  const getStageIcon = (type) => {
    switch (type) {
      case 'tag':
        return <PlayArrowIcon fontSize="small" />;
      case 'build':
        return <BuildIcon fontSize="small" />;
      case 'deploy':
        return <DeployIcon fontSize="small" />;
      default:
        return <BuildIcon fontSize="small" />;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <style>
        {`
          @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .rotating {
            animation: rotate 2s linear infinite;
          }
        `}
      </style>

      {/* Header */}
      <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" color="primary.main" gutterBottom>
              Versiyon Yaşam Döngüsü
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Release sürecini görüntüleyin
            </Typography>
          </Box>
          <BuildIcon sx={{ fontSize: 64, color: 'primary.main', opacity: 0.7 }} />
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant="contained"
            startIcon={<SimulationIcon />}
            onClick={() => navigate('/version-lifecycle')}
            color="secondary"
          >
            Simülasyon
          </Button>
        </Box>
      </Paper>

      {/* Main Pipeline Flow */}
      <Paper elevation={3} sx={{ p: 4, mb: 3, borderRadius: 2, bgcolor: '#f5f5f5' }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
          Master Branch Pipeline
        </Typography>

        {/* Master Branch */}
        <Box sx={{ mb: 4 }}>
          <Card sx={{ mb: 2, bgcolor: 'white', border: '2px solid #1976d2' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold">
                Master Branch
              </Typography>
            </CardContent>
          </Card>

          {/* Release Branches */}
          {currentPipeline.branches.map((branch, branchIndex) => {
            // Check if this is a text alert
            if (branch.type === 'text-alert') {
              return (
                <Box key={branchIndex} sx={{ ml: 4, mb: 3, position: 'relative' }}>
                  {/* Connecting Line */}
                  <Box
                    sx={{
                      position: 'absolute',
                      left: -24,
                      top: 20,
                      width: 24,
                      height: 2,
                      bgcolor: '#1976d2',
                    }}
                  />
                  
                  {/* Text Alert Box */}
                  <Card sx={{ bgcolor: '#fff3e0', border: '2px solid #ff9800' }}>
                    <CardContent sx={{ py: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BugIcon sx={{ color: 'error.main', fontSize: 32 }} />
                        <Typography variant="h6" color="error.main" fontWeight="bold">
                          {branch.message}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              );
            }

            // Determine which process group this branch belongs to
            const firstStageId = branch.stages?.[0]?.id;
            const isTestProcess = firstStageId >= 1 && firstStageId <= 7;
            const isPreProdProcess = firstStageId >= 8 && firstStageId <= 14;
            const processGroupLabel = isTestProcess ? 'Test Geçiş Süreci' : isPreProdProcess ? 'PreProd Geçiş Süreci' : '';
            
            // Check if this is the first branch in a new group
            const prevBranch = branchIndex > 0 ? currentPipeline.branches[branchIndex - 1] : null;
            const prevFirstStageId = prevBranch?.stages?.[0]?.id;
            const isNewGroup = !prevBranch || prevBranch.type === 'text-alert' || 
                              (isTestProcess && (prevFirstStageId < 1 || prevFirstStageId > 7)) ||
                              (isPreProdProcess && (prevFirstStageId < 8 || prevFirstStageId > 14));
            
            // Check if next branch is in same group (to remove spacing)
            const nextBranch = branchIndex < currentPipeline.branches.length - 1 ? currentPipeline.branches[branchIndex + 1] : null;
            const nextFirstStageId = nextBranch?.stages?.[0]?.id;
            const nextInSameGroup = nextBranch && nextBranch.type !== 'text-alert' && 
                                   ((isTestProcess && nextFirstStageId >= 1 && nextFirstStageId <= 7) ||
                                    (isPreProdProcess && nextFirstStageId >= 8 && nextFirstStageId <= 14));

            return (
              <Box key={branchIndex}>
                {/* Process Group Label - Only on first branch of group */}
                {isNewGroup && processGroupLabel && (
                  <Box sx={{ ml: 4, mb: 1, mt: branchIndex > 0 ? 3 : 0 }}>
                    <Chip 
                      label={processGroupLabel} 
                      color={isTestProcess ? 'primary' : 'success'} 
                      variant="outlined"
                      sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}
                    />
                  </Box>
                )}

                <Box 
                  sx={{ 
                    ml: 4,
                    mb: nextInSameGroup ? 0 : 3,
                    p: 2,
                    borderRadius: isNewGroup ? '8px 8px 0 0' : nextInSameGroup ? 0 : '0 0 8px 8px',
                    bgcolor: isTestProcess ? '#e3f2fd' : isPreProdProcess ? '#e8f5e9' : 'transparent',
                    borderLeft: isTestProcess ? '2px solid #2196f3' : isPreProdProcess ? '2px solid #4caf50' : 'none',
                    borderRight: isTestProcess ? '2px solid #2196f3' : isPreProdProcess ? '2px solid #4caf50' : 'none',
                    borderTop: isNewGroup && (isTestProcess || isPreProdProcess) ? '2px solid' : 'none',
                    borderBottom: !nextInSameGroup && (isTestProcess || isPreProdProcess) ? '2px solid' : 'none',
                    borderColor: isTestProcess ? '#2196f3' : '#4caf50',
                    position: 'relative',
                  }}
                >
                {/* Connecting Line */}
                <Box
                  sx={{
                    position: 'absolute',
                    left: -24,
                    top: 20,
                    width: 24,
                    height: 2,
                    bgcolor: '#1976d2',
                  }}
                />

                {/* Branch Name */}
                <Card sx={{ mb: 2, bgcolor: branch.name.includes('beta') ? '#e3f2fd' : branch.name.includes('prod') ? '#e8f5e9' : 'white' }}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {branch.name}
                    </Typography>
                  </CardContent>
                </Card>

                {/* Stages */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', ml: 2 }}>
                  {branch.stages.map((stage, stageIndex) => {
                  const statusInfo = getStatusInfo(stage.status);
                  
                  // Special rendering for bug type stages
                  if (stage.type === 'bug') {
                    return (
                      <React.Fragment key={stage.id}>
                        {/* Line break before bug - move to new row */}
                        <Box sx={{ flexBasis: '100%', height: 0 }} />
                        
                        {/* Arrow before bug */}
                        <ArrowForwardIcon sx={{ color: 'text.secondary', ml: 2 }} />
                        
                        {/* Stage Number Badge */}
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            bgcolor: 'error.main',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '0.875rem',
                          }}
                        >
                          {stage.id}
                        </Box>

                        {/* Bug Alert Card - Smaller */}
                        <Card
                          sx={{
                            minWidth: 200,
                            bgcolor: '#fff3e0',
                            border: `2px solid #ff9800`,
                            cursor: 'pointer',
                          }}
                        >
                          <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <BugIcon sx={{ fontSize: 20, color: 'error.main' }} />
                              <Typography variant="body2" fontWeight="medium" color="error.main">
                                {stage.name}
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      </React.Fragment>
                    );
                  }
                  
                  return (
                    <React.Fragment key={stage.id}>
                      {/* Stage Number Badge */}
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '0.875rem',
                        }}
                      >
                        {stage.id}
                      </Box>

                      {/* Stage Card */}
                      <Tooltip title={statusInfo.label}>
                        <Card
                          sx={{
                            minWidth: 160,
                            bgcolor: 'white',
                            border: `2px solid ${statusInfo.bgColor}`,
                            cursor: 'pointer',
                            '&:hover': {
                              boxShadow: 3,
                            },
                          }}
                        >
                          <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {getStageIcon(stage.type)}
                              <Typography variant="body2" fontWeight="medium">
                                {stage.name}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                              {statusInfo.icon}
                              <Typography variant="caption" color={statusInfo.color}>
                                {statusInfo.label}
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      </Tooltip>

                      {/* Arrow */}
                      {stageIndex < branch.stages.length - 1 && (
                        <ArrowForwardIcon sx={{ color: 'text.secondary' }} />
                      )}

                      {/* Special explanation after stage 7 */}
                      {stage.id === 7 && (
                        <>
                          <ArrowForwardIcon sx={{ color: 'info.main', fontSize: 32 }} />
                          <Card sx={{ bgcolor: '#e3f2fd', border: '2px solid #2196f3', maxWidth: 300 }}>
                            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                              <Typography variant="body2" color="info.main" fontWeight="medium">
                                Buradan 3.cü adıma devam eder. Tüm sorunlar çözülene kadar bu şekilde devam eder
                              </Typography>
                            </CardContent>
                          </Card>
                        </>
                      )}

                      {/* Special explanation after stage 14 */}
                      {stage.id === 14 && (
                        <>
                          <ArrowForwardIcon sx={{ color: 'info.main', fontSize: 32 }} />
                          <Card sx={{ bgcolor: '#e3f2fd', border: '2px solid #2196f3', maxWidth: 300 }}>
                            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                              <Typography variant="body2" color="info.main" fontWeight="medium">
                                Buradan 10.cu adıma devam eder. Tüm sorunlar çözülene kadar bu şekilde devam eder
                              </Typography>
                            </CardContent>
                          </Card>
                        </>
                      )}
                    </React.Fragment>
                  );
                })}
              </Box>

              {/* BugFix Indicator - Show after 11th stage */}
              {currentPipeline.bugFix && 
               branch.stages && 
               branch.stages.length > 0 && 
               branch.stages[branch.stages.length - 1].id === currentPipeline.bugFix.showAfterStage && (
                <Box sx={{ mt: 2, ml: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      icon={<BugIcon />}
                      label={currentPipeline.bugFix.number}
                      color="error"
                      variant="filled"
                    />
                    <ArrowForwardIcon sx={{ color: 'error.main' }} />
                    <Typography variant="body2" color="error.main" fontWeight="medium">
                      {currentPipeline.bugFix.description}
                    </Typography>
                  </Box>

                  {/* Decision Diamond */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                    <Box
                      sx={{
                        width: 80,
                        height: 80,
                        bgcolor: 'warning.light',
                        transform: 'rotate(45deg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                      }}
                    >
                      <Typography
                        sx={{
                          transform: 'rotate(-45deg)',
                          fontSize: '0.65rem',
                          textAlign: 'center',
                          fontWeight: 'bold',
                        }}
                      >
                        Versiyon<br />yayınlandı<br />mı?
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Bug
                      </Typography>
                    </Box>
                  </Box>

                  {/* Decision Paths */}
                  <Box sx={{ display: 'flex', gap: 4, mt: 2 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        No → BugFix
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label="1.1" size="small" color="error" />
                      </Box>
                    </Box>

                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Yes → Hotfix
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label="12" size="small" color="success" />
                      </Box>
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
            );
          })}

          {/* Hotfix Branch */}
          {currentPipeline.hotfix && (
            <Box sx={{ ml: 4, mt: 3, p: 2, bgcolor: '#fff3e0', borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" color="warning.main" gutterBottom>
                Hotfix: {currentPipeline.hotfix.branch}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', ml: 2 }}>
                {currentPipeline.hotfix.stages.map((stage, stageIndex) => {
                  const statusInfo = getStatusInfo(stage.status);
                  return (
                    <React.Fragment key={stage.id}>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          bgcolor: 'warning.main',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '0.875rem',
                        }}
                      >
                        {stage.id}
                      </Box>

                      <Tooltip title={statusInfo.label}>
                        <Card
                          sx={{
                            minWidth: 160,
                            bgcolor: 'white',
                            border: `2px solid ${statusInfo.bgColor}`,
                          }}
                        >
                          <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {getStageIcon(stage.type)}
                              <Typography variant="body2" fontWeight="medium">
                                {stage.name}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                              {statusInfo.icon}
                              <Typography variant="caption" color={statusInfo.color}>
                                {statusInfo.label}
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      </Tooltip>

                      {stageIndex < currentPipeline.hotfix.stages.length - 1 && (
                        <ArrowForwardIcon sx={{ color: 'text.secondary' }} />
                      )}
                    </React.Fragment>
                  );
                })}
              </Box>
            </Box>
          )}
        </Box>

        {/* Environment Per Version */}
        {currentPipeline.environments.length > 0 && (
          <Box sx={{ mt: 4, p: 3, bgcolor: 'white', borderRadius: 2, border: '2px dashed #1976d2' }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              {currentPipeline.environments[0].name}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
              {currentPipeline.environments[0].subEnv}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              {currentPipeline.environments[0].stages.map((stage, index) => {
                const statusInfo = getStatusInfo(stage.status);
                return (
                  <React.Fragment key={index}>
                    <Card
                      sx={{
                        minWidth: 140,
                        bgcolor: 'white',
                        border: `2px solid ${statusInfo.bgColor}`,
                      }}
                    >
                      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="body2" fontWeight="medium">
                          {stage.name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                          {statusInfo.icon}
                          <Typography variant="caption" color={statusInfo.color}>
                            {statusInfo.label}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                    {index < currentPipeline.environments[0].stages.length - 1 && (
                      <ArrowForwardIcon sx={{ color: 'text.secondary' }} />
                    )}
                  </React.Fragment>
                );
              })}
            </Box>
          </Box>
        )}

        {/* End Node */}
        <Box sx={{ mt: 4, ml: 4 }}>
          <Card sx={{ maxWidth: 200, bgcolor: 'white', border: '2px solid #1976d2' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold">
                release/v2.0.0
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Paper>

      {/* Legend */}
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Durum Göstergeleri
        </Typography>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {[
            { status: 'success', label: 'Başarılı' },
            { status: 'failed', label: 'Başarısız' },
            { status: 'running', label: 'Çalışıyor' },
            { status: 'pending', label: 'Bekliyor' },
            { status: 'bug', label: 'Bug Tespit Edildi' },
          ].map((item) => {
            const info = getStatusInfo(item.status);
            return (
              <Box key={item.status} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: info.bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                  }}
                >
                  {info.icon}
                </Box>
                <Typography variant="body2">{item.label}</Typography>
              </Box>
            );
          })}
        </Box>
      </Paper>
    </Container>
  );
};

export default PipelineStatus;
