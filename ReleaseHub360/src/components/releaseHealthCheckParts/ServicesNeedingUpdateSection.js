import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloudIcon from '@mui/icons-material/Cloud';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

const ServicesNeedingUpdateSection = ({ selectedProductData, prepPodStatus }) => {
  return (
    <Accordion sx={{ mb: 2 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CloudIcon color="primary" />
          <Typography variant="h6">Güncelleme Bekleyen Servisler</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {selectedProductData?.childModuleGroups?.map((moduleGroup) => (
          <Box key={moduleGroup.id} sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, color: '#1976d2' }}>
              📦 {moduleGroup.name}
            </Typography>
            {moduleGroup.childModules?.map((module) => (
              <Box key={module.id} sx={{ ml: 3, mb: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, color: '#666' }}>
                  📂 {module.name}
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ ml: 3 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                        <TableCell><strong>API Adı</strong></TableCell>
                        <TableCell><strong>Yayınlanan Versiyon</strong></TableCell>
                        <TableCell><strong>Yayın Tarihi</strong></TableCell>
                        <TableCell><strong>Prep Ortamı - Çalışan Versiyon</strong></TableCell>
                        <TableCell><strong>Pod Durumu</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {module.childApis?.map((api) => {
                        // Pod status'u bul - imageName eşleştirmesi
                        const matchingPod = prepPodStatus.find(pod => {
                          // pod.imageName formatı: cofins.azurecr.io/cofins-backofficeportal:1.0.20251216.4
                          // api.serviceImageName formatı: cofins-backofficeportal
                          if (!api.serviceImageName || !pod.imageName) return false;

                          // imageName'den sadece servis adını al (registry ve tag olmadan)
                          const imageNameParts = pod.imageName.split('/');
                          const serviceWithTag = imageNameParts[imageNameParts.length - 1]; // cofins-backofficeportal:1.0.20251216.4
                          const serviceName = serviceWithTag.split(':')[0]; // cofins-backofficeportal

                          return serviceName === api.serviceImageName;
                        });

                        return (
                          <TableRow key={api.id}>
                            <TableCell>
                              <Chip
                                label={api.name}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={api.currentVersion || '-'}
                                size="small"
                                sx={{ fontFamily: 'monospace', bgcolor: '#e3f2fd' }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" color="text.secondary">
                                {api.currentVersionCreatedAt
                                  ? new Date(api.currentVersionCreatedAt).toLocaleDateString('tr-TR', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                  : '-'
                                }
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {matchingPod ? (
                                <Chip
                                  label={matchingPod.currentVersion}
                                  size="small"
                                  color={matchingPod.currentVersion === api.currentVersion ? 'success' : 'warning'}
                                  sx={{ fontFamily: 'monospace' }}
                                />
                              ) : (
                                <Chip
                                  label="Pod bulunamadı"
                                  size="small"
                                  color="default"
                                  variant="outlined"
                                />
                              )}
                            </TableCell>
                            <TableCell>
                              {matchingPod ? (
                                <Chip
                                  label={matchingPod.status}
                                  size="small"
                                  color={matchingPod.status === 'Running' ? 'success' : 'error'}
                                  icon={matchingPod.status === 'Running' ? <CheckCircleIcon /> : <ErrorIcon />}
                                />
                              ) : (
                                <Typography variant="caption" color="text.secondary">-</Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ))}
          </Box>
        ))}
      </AccordionDetails>
    </Accordion>
  );
};

export default ServicesNeedingUpdateSection;
