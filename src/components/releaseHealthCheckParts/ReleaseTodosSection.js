import React, { useState } from 'react';
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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/Info';

// Mock Data - Release Todos
const mockReleaseTodos = [
  {
    id: 1,
    title: 'TOGG Release Güncelleme',
    timing: 'Geçiş Öncesi',
    responsibleTeam: 'Delivery',
    priority: 'Yüksek',
    details: [
      { id: 1, description: 'Process güncellemelerini yap' },
      { id: 2, description: 'Forms revizyonlarını tamamla' },
      { id: 3, description: 'HttpConnector mapping kontrolü' },
      { id: 4, description: 'ProcessColumnSettings doğrulaması' },
    ],
  },
];

const ReleaseTodosSection = () => {
  const [todoDialogOpen, setTodoDialogOpen] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState(null);

  const getTimingColor = (timing) => {
    switch (timing) {
      case 'Geçiş Öncesi':
        return 'warning';
      case 'Geçiş Sırasında':
        return 'error';
      case 'Geçiş Sonrası':
        return 'info';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Yüksek':
        return 'error';
      case 'Orta':
        return 'warning';
      case 'Düşük':
        return 'info';
      default:
        return 'default';
    }
  };

  const handleViewTodoDetails = (todo) => {
    setSelectedTodo(todo);
    setTodoDialogOpen(true);
  };

  return (
    <>
      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssignmentIcon color="primary" />
            <Typography variant="h6">
              Release ToDo'lar ({mockReleaseTodos.length})
            </Typography>
            {mockReleaseTodos.some(t => t.priority === 'Yüksek') && (
              <Chip
                label="Yüksek Öncelikli Görevler Var!"
                color="error"
                size="small"
              />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#1976d2' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ToDo</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Zaman</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Sorumlu Ekip</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Öncelik</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Detay</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mockReleaseTodos.map((todo) => (
                  <TableRow key={todo.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {todo.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={todo.timing} 
                        size="small" 
                        color={getTimingColor(todo.timing)}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={todo.responsibleTeam} 
                        size="small" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={todo.priority} 
                        size="small" 
                        color={getPriorityColor(todo.priority)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<InfoIcon />}
                        onClick={() => handleViewTodoDetails(todo)}
                      >
                        Detayları Gör
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>

      {/* Todo Details Dialog */}
      <Dialog 
        open={todoDialogOpen} 
        onClose={() => setTodoDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Release ToDo Detayları
            </Typography>
            <IconButton onClick={() => setTodoDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedTodo && (
            <Box>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  {selectedTodo.title}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Chip 
                    label={`Zaman: ${selectedTodo.timing}`} 
                    color={getTimingColor(selectedTodo.timing)}
                    size="small"
                  />
                  <Chip 
                    label={`Sorumlu: ${selectedTodo.responsibleTeam}`} 
                    variant="outlined"
                    size="small"
                  />
                  <Chip 
                    label={`Öncelik: ${selectedTodo.priority}`} 
                    color={getPriorityColor(selectedTodo.priority)}
                    size="small"
                  />
                </Box>
              </Box>

              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Yapılacak İşler:
              </Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <List>
                  {selectedTodo.details.map((detail) => (
                    <ListItem key={detail.id}>
                      <ListItemText 
                        primary={
                          <Typography variant="body2">
                            {detail.id}. {detail.description}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReleaseTodosSection;
