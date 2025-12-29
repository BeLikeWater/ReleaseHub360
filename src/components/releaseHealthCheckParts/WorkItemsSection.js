import React, { useState, useEffect } from 'react';
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
  Alert,
  Button,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const WorkItemsSection = ({ selectedProduct, selectedProductData, workItemIds }) => {
  const [workItems, setWorkItems] = useState([]);
  const [loadingWorkItems, setLoadingWorkItems] = useState(false);

  // Fetch work items
  useEffect(() => {
    const fetchWorkItems = async () => {
      console.log('🔍 fetchWorkItems çalıştı - workItemIds:', workItemIds);
      
      if (!workItemIds || workItemIds.length === 0) {
        console.log('❌ WorkItem fetch iptal edildi - workItemIds boş');
        setWorkItems([]);
        return;
      }

      console.log('✅ WorkItem fetch başlıyor...');
      setLoadingWorkItems(true);

      try {
        const workItemIdsString = JSON.stringify(workItemIds);
        const url = `http://localhost:5678/webhook/GetWorkitemDetailsByIds?workitemIds=${encodeURIComponent(workItemIdsString)}`;
        console.log('🌐 URL:', url);
        
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          console.log('✅ WorkItem verileri alındı:', data);
          
          // Parse response - it's an array with one object containing work_items
          if (Array.isArray(data) && data.length > 0 && data[0].work_items) {
            const parsedWorkItems = data[0].work_items.map(wi => ({
              id: wi.id,
              title: wi.title,
              type: wi.work_item_type,
              state: wi.state,
              assignedTo: wi.assigned_to
            }));
            console.log(`✅ ${parsedWorkItems.length} work item parse edildi`);
            setWorkItems(parsedWorkItems);
          } else {
            setWorkItems([]);
          }
        } else {
          console.error('❌ GetWorkitemDetailsByIds API hatası:', response.statusText);
          setWorkItems([]);
        }
      } catch (error) {
        console.error('❌ GetWorkitemDetailsByIds API hatası:', error);
        setWorkItems([]);
      } finally {
        setLoadingWorkItems(false);
        console.log('✅ WorkItem fetch tamamlandı');
      }
    };

    fetchWorkItems();
  }, [workItemIds]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Done':
      case 'Closed':
      case 'Resolved':
        return 'success';
      case 'Active':
      case 'In Progress':
        return 'warning';
      case 'New':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Accordion sx={{ mt: 2 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
          <CheckCircleIcon color="primary" />
          <Typography variant="h6">
            Work Items
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {loadingWorkItems ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography>Work Item bilgileri yükleniyor...</Typography>
          </Box>
        ) : workItems.length === 0 ? (
          <Alert severity="info">
            Work item verisi bulunamadı.
          </Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Title</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>State</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Assigned To</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {workItems.map((workItem, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>{workItem.id || '-'}</TableCell>
                    <TableCell>{workItem.title || '-'}</TableCell>
                    <TableCell>
                      <Chip label={workItem.type || 'Unknown'} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={workItem.state || 'Unknown'} 
                        size="small" 
                        color={getStatusColor(workItem.state)}
                      />
                    </TableCell>
                    <TableCell>{workItem.assignedTo || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default WorkItemsSection;
