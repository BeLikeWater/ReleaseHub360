import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Card,
  CardContent,
  Chip,
  Fade,
  Grow,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as PendingIcon,
  Build as BuildIcon,
  CloudUpload as DeployIcon,
  BugReport as BugIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayArrowIcon,
  ArrowForward as ArrowForwardIcon,
  Timeline as TimelineIcon,
  CloudUpload,
} from '@mui/icons-material';

const VersionLifecycle = () => {
  const navigate = useNavigate();

  // Visibility states
  const [visibleSteps, setVisibleSteps] = useState({
    masterBranch: true,
    testLabel: false,
    testProcess: false,
    branch1: false,
    branch2: false,
    preProdLabel: false,
    preProdProcess: false,
    branch3: false,
    decisionDiamond: false,
    bugfixBranch: false, // release/v1.0.0-rc-2 (stage 13-14)
    hotfixBranch: false, // Hotfix: release/v1.0.1 (stage 13-16)
    nextVersion: false, // release/v2.0.0 - next version card
    environmentPerVersion: false, // Environment Per Version section
  });

  // Stage status tracking
  const [stageStatus, setStageStatus] = useState({});

  const handleMasterBranchClick = () => {
    if (!visibleSteps.testLabel) {
      setVisibleSteps(prev => ({ ...prev, testLabel: true }));
    }
  };

  const handleTestLabelClick = () => {
    if (!visibleSteps.testProcess) {
      setVisibleSteps(prev => ({ ...prev, testProcess: true, branch1: true }));
    }
  };

  const handleStageClick = (stageId, currentBranch, nextBranch) => {
    const currentStatus = stageStatus[stageId];
    
    if (currentStatus === 'success' && nextBranch && !visibleSteps[nextBranch]) {
      setVisibleSteps(prev => ({ ...prev, [nextBranch]: true }));
    } else if (!currentStatus || currentStatus === 'pending') {
      setStageStatus(prev => ({ ...prev, [stageId]: 'running' }));
      setTimeout(() => {
        setStageStatus(prev => ({ ...prev, [stageId]: 'success' }));
        
        // Stage 7 başarılı olunca PreProd Label'ı göster
        if (stageId === 7) {
          setVisibleSteps(prev => ({ ...prev, preProdLabel: true }));
        }
        
        // Stage 16 başarılı olunca Next Version ve Environment Per Version'ı göster
        if (stageId === 16) {
          setTimeout(() => {
            setVisibleSteps(prev => ({ ...prev, nextVersion: true }));
            setTimeout(() => {
              setVisibleSteps(prev => ({ ...prev, environmentPerVersion: true }));
            }, 800);
          }, 500);
        }
      }, 2000);
    }
  };

  const handleBranchClick = (branchKey, nextKey) => {
    if (branchKey === 'branch3' && nextKey === 'decisionDiamond') {
      // Bug kartına tıklanınca decision diamond'ı göster
      if (visibleSteps[branchKey] && !visibleSteps[nextKey]) {
        setVisibleSteps(prev => ({ ...prev, [nextKey]: true }));
      }
    } else if (visibleSteps[branchKey] && !visibleSteps[nextKey]) {
      setVisibleSteps(prev => ({ ...prev, [nextKey]: true }));
    }
  };

  const handleDecisionClick = (path) => {
    if (path === 'bugfix') {
      // No path - show bugfix branch (release/v1.0.0-rc-2)
      setVisibleSteps(prev => ({ ...prev, bugfixBranch: true }));
    } else if (path === 'hotfix') {
      // Yes path - show hotfix branch (Hotfix: release/v1.0.1)
      setVisibleSteps(prev => ({ ...prev, hotfixBranch: true }));
    }
  };

  const handleReset = () => {
    setVisibleSteps({
      masterBranch: true,
      testLabel: false,
      testProcess: false,
      branch1: false,
      branch2: false,
      preProdLabel: false,
      preProdProcess: false,
      branch3: false,
      decisionDiamond: false,
      bugfixBranch: false,
      hotfixBranch: false,
      nextVersion: false,
      environmentPerVersion: false,
    });
    setStageStatus({});
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'success':
        return { color: 'success', icon: <CheckCircleIcon />, label: 'Başarılı', bgColor: '#4caf50' };
      case 'running':
        return { color: 'warning', icon: <RefreshIcon className="rotating" />, label: 'Çalışıyor', bgColor: '#ff9800' };
      case 'pending':
      default:
        return { color: 'default', icon: <PendingIcon />, label: 'Bekliyor', bgColor: '#9e9e9e' };
    }
  };

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

  const pipelineData = {
    branches: [
      {
        key: 'branch1',
        name: 'release/v1.0.0',
        visible: visibleSteps.branch1,
        processGroup: 'test',
        stages: [
          { id: 1, name: 'release/v1.0.0-beta-1', type: 'tag' },
          { id: 2, name: 'Azure Pipeline', type: 'deploy' },
          { id: 3, name: 'Docker Image', type: 'build' },
          { id: 4, name: 'K8s Test', type: 'deploy' },
          { id: 5, name: 'Test ortamında bir bug oluştu', type: 'bug' },
        ]
      },
      {
        key: 'branch2',
        name: 'release/v1.0.0-beta-2',
        visible: visibleSteps.branch2,
        processGroup: 'test',
        stages: [
          { id: 6, name: 'release/v1.0.0-beta-2', type: 'tag' },
          { id: 7, name: 'Azure Pipeline', type: 'deploy' },
        ]
      },
      {
        key: 'branch3',
        name: 'release/v1.0.0-rc-1',
        visible: visibleSteps.branch3,
        processGroup: 'preprod',
        stages: [
          { id: 8, name: 'release/v1.0.0-rc-1', type: 'tag' },
          { id: 9, name: 'Azure Pipeline', type: 'deploy' },
          { id: 10, name: 'Docker Image', type: 'build' },
          { id: 11, name: 'K8s PreProd', type: 'deploy' },
          { id: 12, name: 'PreProd ortamında bir bug oluştu', type: 'bug' },
        ]
      },
      {
        key: 'bugfixBranch',
        name: 'release/v1.0.0-rc-2',
        visible: visibleSteps.bugfixBranch,
        processGroup: 'preprod',
        stages: [
          { id: 13, name: 'release/v1.0.0-rc-2', type: 'tag' },
          { id: 14, name: 'Azure Pipeline', type: 'deploy' },
        ]
      },
      {
        key: 'hotfixBranch',
        name: 'Hotfix: release/v1.0.1',
        visible: visibleSteps.hotfixBranch,
        processGroup: 'hotfix',
        stages: [
          { id: 13, name: 'release/v1.0.1-rc-1', type: 'tag' },
          { id: 14, name: 'Azure Pipeline', type: 'deploy' },
          { id: 15, name: 'Docker Image', type: 'build' },
          { id: 16, name: 'K8s PreProd', type: 'deploy' },
        ]
      },
    ]
  };

  const renderStages = (stages, branchKey) => {
    return stages.map((stage, stageIndex) => {
      const status = stageStatus[stage.id] || 'pending';
      const statusInfo = getStatusInfo(status);
      
      if (stage.type === 'bug') {
        return (
          <React.Fragment key={stage.id}>
            <Box sx={{ flexBasis: '100%', height: 0 }} />
            <ArrowForwardIcon sx={{ color: 'text.secondary', ml: 2 }} />
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
            <Card
              sx={{
                minWidth: 200,
                bgcolor: '#fff3e0',
                border: '2px solid #ff9800',
                cursor: 'pointer',
                '&:hover': { boxShadow: 3 },
              }}
              onClick={() => {
                if (branchKey === 'branch1') {
                  handleBranchClick('branch1', 'branch2');
                } else if (branchKey === 'branch3') {
                  handleBranchClick('branch3', 'decisionDiamond');
                }
              }}
            >
              <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <BugIcon sx={{ fontSize: 20, color: 'error.main' }} />
                  <Typography variant="body2" fontWeight="medium" color="error.main">
                    {stage.name}
                  </Typography>
                </Box>
                {((branchKey === 'branch1' && !visibleSteps.branch2) || 
                  (branchKey === 'branch3' && !visibleSteps.decisionDiamond)) && (
                  <Typography variant="caption" color="text.secondary">
                    👆 Tıklayın
                  </Typography>
                )}
              </CardContent>
            </Card>
          </React.Fragment>
        );
      }
      
      const isLastStage = stageIndex === stages.length - 1;
      
      return (
        <React.Fragment key={stage.id}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              bgcolor: branchKey === 'hotfixBranch' ? '#ff9800' : (branchKey === 'branch3' || branchKey === 'bugfixBranch' ? 'success.main' : 'primary.main'),
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
                cursor: 'pointer',
                '&:hover': { boxShadow: 3 },
              }}
              onClick={() => {
                handleStageClick(stage.id, branchKey, null);
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

          {stageIndex < stages.length - 1 && (
            <ArrowForwardIcon sx={{ color: 'text.secondary' }} />
          )}

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

          {stage.id === 14 && branchKey === 'bugfixBranch' && (
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
    });
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

      <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/')}
              variant="outlined"
              size="small"
            >
              Geri
            </Button>
            <Box>
              <Typography variant="h4" fontWeight="bold" color="primary.main" gutterBottom>
                Versiyon Yaşam Döngüsü
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Release sürecini adım adım görüntüleyin
              </Typography>
            </Box>
          </Box>
          <TimelineIcon sx={{ fontSize: 64, color: 'primary.main', opacity: 0.7 }} />
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={handleReset}
          >
            Baştan Başlat
          </Button>
          <Typography variant="caption" color="text.secondary">
            💡 Her kutuya tıklayarak süreci ilerletin
          </Typography>
        </Box>
      </Paper>

      <Paper elevation={3} sx={{ p: 4, mb: 3, borderRadius: 2, bgcolor: '#f5f5f5' }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
          Master Branch Pipeline
        </Typography>

        <Box sx={{ mb: 4 }}>
          <Fade in={visibleSteps.masterBranch} timeout={500}>
            <Card 
              sx={{ 
                mb: 2, 
                bgcolor: 'white', 
                border: '2px solid #1976d2',
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                  boxShadow: 6,
                  transform: 'scale(1.02)',
                }
              }}
              onClick={handleMasterBranchClick}
            >
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold">
                  Master Branch
                </Typography>
                {!visibleSteps.testLabel && (
                  <Typography variant="caption" color="text.secondary">
                    👆 Tıklayın
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Fade>

          <Fade in={visibleSteps.testLabel} timeout={800}>
            <Box sx={{ ml: 4, mb: 1 }}>
              <Chip 
                label="Test Geçiş Süreci" 
                color="primary" 
                variant="outlined"
                sx={{ 
                  fontWeight: 'bold', 
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  '&:hover': { boxShadow: 3 }
                }}
                onClick={handleTestLabelClick}
              />
              {!visibleSteps.testProcess && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  👆 Tıklayın
                </Typography>
              )}
            </Box>
          </Fade>

          {visibleSteps.testProcess && (
            <Fade in={visibleSteps.testProcess} timeout={500}>
              <Box 
                sx={{ 
                  ml: 4,
                  p: 2,
                  borderRadius: '8px',
                  bgcolor: '#e3f2fd',
                  border: '2px solid #2196f3',
                }}
              >
                {pipelineData.branches[0].visible && (
                  <Grow in={pipelineData.branches[0].visible} timeout={800}>
                    <Box sx={{ mb: 2 }}>
                      <Box
                        sx={{
                          position: 'relative',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            left: -24,
                            top: 20,
                            width: 24,
                            height: 2,
                            bgcolor: '#1976d2',
                          }
                        }}
                      >
                        <Card sx={{ mb: 2, bgcolor: '#e3f2fd' }}>
                          <CardContent sx={{ py: 1.5 }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {pipelineData.branches[0].name}
                            </Typography>
                          </CardContent>
                        </Card>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', ml: 2 }}>
                          {renderStages(pipelineData.branches[0].stages, 'branch1')}
                        </Box>
                      </Box>
                    </Box>
                  </Grow>
                )}

                {pipelineData.branches[1].visible && (
                  <Grow in={pipelineData.branches[1].visible} timeout={800}>
                    <Box sx={{ mb: 0 }}>
                      <Box
                        sx={{
                          position: 'relative',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            left: -24,
                            top: 20,
                            width: 24,
                            height: 2,
                            bgcolor: '#1976d2',
                          }
                        }}
                      >
                        <Card sx={{ mb: 2, bgcolor: '#e3f2fd' }}>
                          <CardContent sx={{ py: 1.5 }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {pipelineData.branches[1].name}
                            </Typography>
                          </CardContent>
                        </Card>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', ml: 2 }}>
                          {renderStages(pipelineData.branches[1].stages, 'branch2')}
                        </Box>
                      </Box>
                    </Box>
                  </Grow>
                )}
              </Box>
            </Fade>
          )}

          <Fade in={visibleSteps.preProdLabel} timeout={800}>
            <Box sx={{ ml: 4, mb: 1, mt: 3 }}>
              <Chip 
                label="PreProd Geçiş Süreci" 
                color="success" 
                variant="outlined"
                sx={{ 
                  fontWeight: 'bold', 
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  '&:hover': { boxShadow: 3 }
                }}
                onClick={() => {
                  if (!visibleSteps.preProdProcess) {
                    setVisibleSteps(prev => ({ ...prev, preProdProcess: true, branch3: true }));
                  }
                }}
              />
              {!visibleSteps.preProdProcess && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  👆 Tıklayın
                </Typography>
              )}
            </Box>
          </Fade>

          {visibleSteps.preProdProcess && (
            <Fade in={visibleSteps.preProdProcess} timeout={500}>
              <Box 
                sx={{ 
                  ml: 4,
                  p: 2,
                  borderRadius: '8px',
                  bgcolor: '#e8f5e9',
                  border: '2px solid #4caf50',
                }}
              >
                {pipelineData.branches[2].visible && (
                  <Grow in={pipelineData.branches[2].visible} timeout={800}>
                    <Box sx={{ mb: 2 }}>
                      <Box
                        sx={{
                          position: 'relative',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            left: -24,
                            top: 20,
                            width: 24,
                            height: 2,
                            bgcolor: '#1976d2',
                          }
                        }}
                      >
                        <Card sx={{ mb: 2, bgcolor: '#e8f5e9' }}>
                          <CardContent sx={{ py: 1.5 }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {pipelineData.branches[2].name}
                            </Typography>
                          </CardContent>
                        </Card>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', ml: 2 }}>
                          {renderStages(pipelineData.branches[2].stages, 'branch3')}
                        </Box>
                      </Box>
                    </Box>
                  </Grow>
                )}
              </Box>
            </Fade>
          )}

          {/* Decision Diamond - After branch3 bug */}
          {visibleSteps.decisionDiamond && (
            <Fade in={visibleSteps.decisionDiamond} timeout={800}>
              <Box sx={{ ml: 6, mt: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Chip
                    icon={<BugIcon />}
                    label="BugFix"
                    color="error"
                    variant="filled"
                  />
                  <ArrowForwardIcon sx={{ color: 'error.main' }} />
                  <Typography variant="body2" color="error.main" fontWeight="medium">
                    Bug tespit edildi
                  </Typography>
                </Box>

                {/* Decision Diamond */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
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

                  <Typography variant="caption" color="text.secondary">
                    Karar Noktası
                  </Typography>
                </Box>

                {/* Decision Paths */}
                <Box sx={{ display: 'flex', gap: 4 }}>
                  <Card
                    sx={{
                      p: 2,
                      bgcolor: '#e8f5e9',
                      border: '2px solid #4caf50',
                      cursor: 'pointer',
                      '&:hover': { boxShadow: 4 },
                    }}
                    onClick={() => handleDecisionClick('bugfix')}
                  >
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      No → BugFix
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label="1.1" size="small" color="success" />
                      <Typography variant="caption">
                        Betadan devam edilecek
                      </Typography>
                    </Box>
                    {!visibleSteps.bugfixBranch && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        👆 Tıklayın
                      </Typography>
                    )}
                  </Card>

                  <Card
                    sx={{
                      p: 2,
                      bgcolor: '#fff3e0',
                      border: '2px solid #ff9800',
                      cursor: 'pointer',
                      '&:hover': { boxShadow: 4 },
                    }}
                    onClick={() => handleDecisionClick('hotfix')}
                  >
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Yes → Hotfix
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label="13" size="small" sx={{ bgcolor: '#ff9800', color: 'white' }} />
                      <Typography variant="caption">
                        Hotfix uygula
                      </Typography>
                    </Box>
                    {!visibleSteps.hotfixBranch && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        👆 Tıklayın
                      </Typography>
                    )}
                  </Card>
                </Box>
              </Box>
            </Fade>
          )}

          {/* BugFix Branch (release/v1.0.0-rc-2 - stage 13-14) */}
          {pipelineData.branches[3].visible && (
            <Grow in={pipelineData.branches[3].visible} timeout={800}>
              <Box sx={{ ml: 4, mb: 2 }}>
                <Box
                  sx={{
                    position: 'relative',
                    p: 2,
                    borderRadius: '8px',
                    bgcolor: '#e8f5e9',
                    border: '2px solid #4caf50',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: -24,
                      top: 20,
                      width: 24,
                      height: 2,
                      bgcolor: '#1976d2',
                    }
                  }}
                >
                  <Card sx={{ mb: 2, bgcolor: '#e8f5e9' }}>
                    <CardContent sx={{ py: 1.5 }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {pipelineData.branches[3].name}
                      </Typography>
                    </CardContent>
                  </Card>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', ml: 2 }}>
                    {renderStages(pipelineData.branches[3].stages, 'bugfixBranch')}
                  </Box>
                </Box>
              </Box>
            </Grow>
          )}

          {/* Hotfix Branch (Hotfix: release/v1.0.1 - stage 13-16) */}
          {pipelineData.branches[4].visible && (
            <Grow in={pipelineData.branches[4].visible} timeout={800}>
              <Box sx={{ ml: 4, mb: 0 }}>
                <Box
                  sx={{
                    position: 'relative',
                    p: 2,
                    borderRadius: '8px',
                    bgcolor: '#fff3e0',
                    border: '2px solid #ff9800',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: -24,
                      top: 20,
                      width: 24,
                      height: 2,
                      bgcolor: '#1976d2',
                    }
                  }}
                >
                  <Card sx={{ mb: 2, bgcolor: '#fff3e0' }}>
                    <CardContent sx={{ py: 1.5 }}>
                      <Typography variant="subtitle2" fontWeight="bold" color="#e65100">
                        {pipelineData.branches[4].name}
                      </Typography>
                    </CardContent>
                  </Card>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', ml: 2 }}>
                    {renderStages(pipelineData.branches[4].stages, 'hotfixBranch')}
                  </Box>
                </Box>
              </Box>
            </Grow>
          )}

          {/* Next Version - release/v2.0.0 */}
          {visibleSteps.nextVersion && (
            <Fade in={visibleSteps.nextVersion} timeout={800}>
              <Box sx={{ ml: 4, mt: 4 }}>
                <Card
                  sx={{
                    bgcolor: 'white',
                    border: '2px solid #2196f3',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    '&:hover': {
                      boxShadow: 6,
                      transform: 'scale(1.02)',
                    }
                  }}
                  onClick={() => {
                    alert('Süreç release/v2.0.0 için baştan başlar. Aynı adımlar takip edilir.');
                  }}
                >
                  <CardContent sx={{ py: 2, px: 3 }}>
                    <Typography variant="h6" fontWeight="bold" color="primary.main">
                      release/v2.0.0
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      👆 Tıklayın - Süreç tekrar eder
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Fade>
          )}
        </Box>
      </Paper>

      {/* Environment Per Version Section */}
      {visibleSteps.environmentPerVersion && (
        <Fade in={visibleSteps.environmentPerVersion} timeout={1000}>
          <Paper elevation={3} sx={{ p: 4, mb: 3, borderRadius: 2, bgcolor: '#f5f5f5' }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Environment Per Version
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Artık v1.0.0 versiyonu test ortamında yüklenemez. Her versiyon kendi ortamında çalışır.
              </Typography>
            </Box>

            <Box sx={{ ml: 4 }}>
              <Typography variant="subtitle2" fontWeight="medium" color="text.secondary" sx={{ mb: 2 }}>
                release/v1.0.1-beta-1
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Card sx={{ minWidth: 180, bgcolor: 'white', border: '2px solid #4caf50' }}>
                  <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CloudUpload sx={{ fontSize: 20, color: 'success.main' }} />
                      <Typography variant="body2" fontWeight="medium">
                        Azure Pipeline
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                      <Typography variant="caption" color="success">
                        Başarılı
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>

                <ArrowForwardIcon sx={{ color: 'text.secondary' }} />

                <Card sx={{ minWidth: 180, bgcolor: 'white', border: '2px solid #4caf50' }}>
                  <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BuildIcon sx={{ fontSize: 20, color: 'success.main' }} />
                      <Typography variant="body2" fontWeight="medium">
                        Docker Image
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                      <Typography variant="caption" color="success">
                        Başarılı
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>

                <ArrowForwardIcon sx={{ color: 'text.secondary' }} />

                <Card sx={{ minWidth: 200, bgcolor: 'white', border: '2px solid #4caf50' }}>
                  <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CloudUpload sx={{ fontSize: 20, color: 'success.main' }} />
                      <Typography variant="body2" fontWeight="medium">
                        K8s PreProd-v1.0.0
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                      <Typography variant="caption" color="success">
                        Başarılı
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Box>

              <Box sx={{ mt: 2, p: 2, bgcolor: '#e3f2fd', borderRadius: 1, border: '1px solid #2196f3' }}>
                <Typography variant="body2" color="info.main">
                  💡 <strong>Not:</strong> Her versiyon için ayrı Kubernetes namespace kullanılır. 
                  Bu sayede farklı versiyonlar aynı anda farklı ortamlarda çalışabilir.
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Fade>
      )}

      <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Durum Göstergeleri
        </Typography>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {[
            { status: 'success', label: 'Başarılı' },
            { status: 'running', label: 'Çalışıyor' },
            { status: 'pending', label: 'Bekliyor' },
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

export default VersionLifecycle;
