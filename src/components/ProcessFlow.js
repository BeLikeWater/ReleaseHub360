import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  LinearProgress,
  Card,
  CardContent,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Assignment as JiraIcon,
  CloudUpload as AzureIcon,
  Transform as MapperIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Schedule as ScheduleIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { keyframes } from '@emotion/react';

// Animasyon tanımları
const pulse = keyframes`
  0% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.05); opacity: 1; }
  100% { transform: scale(1); opacity: 0.8; }
`;

const slideRight = keyframes`
  0% { transform: translateX(-20px); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
`;

const dataFlow = keyframes`
  0% { left: 0%; width: 0%; }
  50% { left: 0%; width: 100%; }
  100% { left: 100%; width: 0%; }
`;

const ProcessFlow = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1); // -1 = bekleme durumu
  const [cycleCount, setCycleCount] = useState(0);
  const [processedRecords, setProcessedRecords] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);

  const steps = [
    { 
      name: 'Jira Taraması', 
      icon: <JiraIcon />, 
      color: '#0052CC',
      description: 'Jira sisteminde yeni kayıtlar aranıyor...'
    },
    { 
      name: 'Veri Eşleme', 
      icon: <MapperIcon />, 
      color: '#FF6B35',
      description: 'Kullanıcı bilgisi, parent ve modül eşleştirmesi yapılıyor...'
    },
    { 
      name: 'Azure Aktarımı', 
      icon: <AzureIcon />, 
      color: '#0078D4',
      description: 'Eşleştirilmiş veriler Azure DevOps\'a aktarılıyor...'
    },
  ];

  const mappingProperties = [
    { name: 'Kullanıcı Bilgisi', field: 'assignee', status: 'waiting' },
    { name: 'Parent Eşleştirmesi', field: 'parent_issue', status: 'waiting' },
    { name: 'Modül Eşleştirmesi', field: 'component', status: 'waiting' },
  ];

  useEffect(() => {
    let timeout;
    if (isRunning && currentStep >= 0 && currentStep < steps.length) {
      timeout = setTimeout(() => {
        if (currentStep === steps.length - 1) {
          // Son aşama tamamlandı
          setIsRunning(false);
          setIsCompleted(true);
          setCycleCount(count => count + 1);
          
          // Yeni kayıt ekleme
          const newRecord = {
            id: Date.now(),
            jiraId: `PROJ-${Math.floor(Math.random() * 1000) + 100}`,
            status: 'success',
            timestamp: new Date().toLocaleTimeString('tr-TR'),
            mappings: mappingProperties.map(prop => prop.name).join(', ')
          };
          setProcessedRecords(prev => [newRecord, ...prev.slice(0, 4)]);
        } else {
          setCurrentStep(prev => prev + 1);
        }
      }, 3000); // 3 saniye her aşama için
    }
    return () => clearTimeout(timeout);
  }, [isRunning, currentStep]);

  const startProcess = () => {
    if (!isRunning) {
      setCurrentStep(0);
      setIsRunning(true);
      setIsCompleted(false);
    }
  };

  const resetProcess = () => {
    setIsRunning(false);
    setCurrentStep(-1);
    setIsCompleted(false);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Jira ↔ Azure Entegrasyon Süreci
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
          5 dakikada bir çalışan otomatik senkronizasyon sistemi
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <IconButton 
            onClick={startProcess}
            disabled={isRunning}
            color="primary"
            size="large"
            sx={{ 
              backgroundColor: isCompleted ? 'success.main' : (isRunning ? 'warning.main' : 'primary.main'),
              color: 'white',
              '&:hover': {
                backgroundColor: isCompleted ? 'success.dark' : (isRunning ? 'warning.dark' : 'primary.dark'),
              },
              '&:disabled': {
                backgroundColor: 'grey.400',
                color: 'white'
              }
            }}
          >
            {isCompleted ? <SuccessIcon /> : <PlayIcon />}
          </IconButton>
          <Typography variant="body1">
            {isCompleted ? 'Süreç Tamamlandı' : (isRunning ? 'İşleniyor...' : 'Yeni Süreç Başlat')}
          </Typography>
          <Chip 
            icon={<ScheduleIcon />} 
            label={`Tamamlanan: ${cycleCount}`} 
            color="primary" 
            variant="outlined"
          />
        </Box>
      </Box>

      {/* Ana Süreç Görselleştirmesi */}
      <Paper sx={{ p: 3, mb: 4, position: 'relative', overflow: 'hidden' }}>
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            position: 'relative',
            minHeight: '120px'
          }}
        >
          {steps.map((step, index) => {
            let stepStatus = 'waiting'; // waiting, active, completed
            if (currentStep > index) stepStatus = 'completed';
            else if (currentStep === index) stepStatus = 'active';
            
            return (
              <Box key={index} sx={{ textAlign: 'center', zIndex: 2 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    backgroundColor: stepStatus === 'completed' ? '#4CAF50' : 
                                   stepStatus === 'active' ? step.color : '#e0e0e0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: stepStatus === 'waiting' ? '#9e9e9e' : 'white',
                    mb: 2,
                    position: 'relative',
                    animation: stepStatus === 'active' && isRunning ? `${pulse} 2s infinite` : 'none',
                    border: stepStatus === 'active' ? '3px solid #FFD700' : 'none',
                    transition: 'all 0.5s ease-in-out'
                  }}
                >
                  {stepStatus === 'completed' ? <SuccessIcon /> : step.icon}
                </Box>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 'bold', 
                    mb: 1,
                    color: stepStatus === 'waiting' ? 'text.disabled' : 'text.primary'
                  }}
                >
                  {step.name}
                </Typography>
                <Typography 
                  variant="body2" 
                  color={stepStatus === 'active' ? 'primary.main' : 'text.secondary'}
                  sx={{ 
                    maxWidth: 200,
                    fontWeight: stepStatus === 'active' ? 'bold' : 'normal'
                  }}
                >
                  {stepStatus === 'active' && isRunning ? step.description : 
                   stepStatus === 'completed' ? 'Tamamlandı' : 'Bekliyor'}
                </Typography>
              </Box>
            );
          })}

          {/* Animasyonlu bağlantı çizgileri */}
          <Box 
            sx={{ 
              position: 'absolute',
              top: '50%',
              left: '12%',
              right: '12%',
              height: '2px',
              backgroundColor: '#e0e0e0',
              zIndex: 1
            }}
          />
          
          {isRunning && (
            <>
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  height: '4px',
                  backgroundColor: '#4CAF50',
                  animation: `${dataFlow} 6s infinite`,
                  zIndex: 1,
                  boxShadow: '0 0 10px #4CAF50'
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  top: 'calc(50% + 10px)',
                  left: '12%',
                  right: '12%',
                  height: '2px',
                  backgroundColor: '#e0e0e0',
                  zIndex: 1
                }}
              />
            </>
          )}
        </Box>

        {/* Durum göstergesi */}
        {isRunning && currentStep >= 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="body1" sx={{ mb: 1, fontWeight: 'bold' }}>
              {steps[currentStep].description}
            </Typography>
            <LinearProgress 
              variant="indeterminate" 
              sx={{ 
                height: 8, 
                borderRadius: 4,
                '& .MuiLinearProgress-bar': {
                  backgroundColor: steps[currentStep].color
                }
              }} 
            />
          </Box>
        )}
        
        {isCompleted && (
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="success.main" sx={{ fontWeight: 'bold' }}>
              ✅ Süreç başarıyla tamamlandı!
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Mapping Detayları */}
      <Box sx={{ display: 'flex', gap: 3, mb: 4 }}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Veri Eşleme Detayları
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {mappingProperties.map((mapping, index) => {
                let mappingStatus = 'waiting';
                if (currentStep > 1) mappingStatus = 'completed';
                else if (currentStep === 1) {
                  // 2. aşamada sırayla eşleştir
                  mappingStatus = 'processing';
                }
                
                return (
                  <Box
                    key={mapping.name}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      p: 1.5,
                      borderRadius: 1,
                      backgroundColor: mappingStatus === 'processing' ? 'action.hover' : 'transparent',
                      border: mappingStatus === 'processing' ? '1px solid' : 'none',
                      borderColor: 'primary.main',
                      animation: mappingStatus === 'processing' ? `${slideRight} 0.5s ease-in-out` : 'none',
                      animationDelay: `${index * 0.3}s`
                    }}
                  >
                    {mappingStatus === 'completed' ? (
                      <SuccessIcon color="success" fontSize="small" />
                    ) : mappingStatus === 'processing' ? (
                      <Box sx={{ width: 16, height: 16, position: 'relative' }}>
                        <LinearProgress 
                          variant="indeterminate" 
                          sx={{ 
                            width: '100%', 
                            height: 4,
                            borderRadius: 2
                          }} 
                        />
                      </Box>
                    ) : (
                      <Box 
                        sx={{ 
                          width: 16, 
                          height: 16, 
                          borderRadius: '50%', 
                          backgroundColor: 'grey.300' 
                        }} 
                      />
                    )}
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: mappingStatus === 'processing' ? 'bold' : 'normal',
                        color: mappingStatus === 'completed' ? 'success.main' : 
                               mappingStatus === 'processing' ? 'primary.main' : 'text.secondary'
                      }}
                    >
                      {mapping.name}
                    </Typography>
                    <Chip 
                      label={mapping.field} 
                      size="small" 
                      variant="outlined"
                      color={mappingStatus === 'completed' ? 'success' : 
                             mappingStatus === 'processing' ? 'primary' : 'default'}
                    />
                  </Box>
                );
              })}
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Sistem Durumu
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <SuccessIcon color="success" fontSize="small" />
              <Typography variant="body2">Bağlantı: Aktif</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <ScheduleIcon color="primary" fontSize="small" />
              <Typography variant="body2">Sonraki Tarama: 4:32</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Toplam İşlenen: {cycleCount}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Son İşlenen Kayıtlar */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Son İşlenen Kayıtlar
          </Typography>
          {processedRecords.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Henüz işlenmiş kayıt bulunmuyor. Süreci başlatın.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {processedRecords.map((record, index) => (
                <Box
                  key={record.id}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 2,
                    backgroundColor: index === 0 ? 'action.hover' : 'transparent',
                    borderRadius: 1,
                    animation: index === 0 ? `${slideRight} 0.5s ease-in-out` : 'none'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <SuccessIcon color="success" fontSize="small" />
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {record.jiraId}
                    </Typography>
                    <Chip label={record.mappings} size="small" variant="outlined" />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {record.timestamp}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProcessFlow;