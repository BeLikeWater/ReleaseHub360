import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Card,
  CardContent,
  Divider,
  Alert,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Badge,
  Stepper,
  Step,
  StepLabel,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Sync as SyncIcon,
  GitHub as GitHubIcon,
  CompareArrows as CompareArrowsIcon,
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayArrowIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  InsertDriveFile as FileIcon,
  Code as CodeIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { db } from '../firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';

function CodeSyncManagement() {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [openBranchDialog, setOpenBranchDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Sync workflow state
  const [activeStep, setActiveStep] = useState(0);
  const [pullRequests, setPullRequests] = useState([]);
  const [selectedPRs, setSelectedPRs] = useState([]);
  const [mergedPRHistory, setMergedPRHistory] = useState([]);
  const [branchComparison, setBranchComparison] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [loadingPRs, setLoadingPRs] = useState(false);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  
  const [branchForm, setBranchForm] = useState({
    customerName: '',
    repoUrl: '',
    repoName: '',
    branchName: '',
    baseBranch: 'master',
    description: '',
    isActive: true,
  });

  // MCP Server API URLs
  const API_BASE = 'http://localhost:8083/api';
  const API_ENDPOINTS = {
    getCompletedPRs: `${API_BASE}/repository/completed-prs`,
    getMergedPRHistory: `${API_BASE}/code-sync/get-merged-pr-history`,
    getBranchComparison: `${API_BASE}/code-sync/branch-compare`,
    previewSync: `${API_BASE}/code-sync/preview`,
    executeSync: `${API_BASE}/code-sync/execute`,
  };

  const steps = ['Branch Seçimi', 'PR Seçimi', 'Preview', 'Sync Execution'];

  // Branches listesini yükle
  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'customer_branches'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const branchesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBranches(branchesData);
    } catch (error) {
      console.error('Branches yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBranch = () => {
    setBranchForm({
      customerName: '',
      repoUrl: '',
      repoName: '',
      branchName: '',
      baseBranch: 'master',
      description: '',
      isActive: true,
    });
    setOpenBranchDialog(true);
  };

  const handleEditBranch = (branch) => {
    setBranchForm(branch);
    setOpenBranchDialog(true);
  };

  const handleSaveBranch = async () => {
    try {
      setLoading(true);
      if (branchForm.id) {
        // Güncelleme
        await updateDoc(doc(db, 'customer_branches', branchForm.id), {
          ...branchForm,
          updatedAt: Timestamp.now()
        });
      } else {
        // Yeni ekleme
        await addDoc(collection(db, 'customer_branches'), {
          ...branchForm,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }
      setOpenBranchDialog(false);
      loadBranches();
    } catch (error) {
      console.error('Branch kaydedilirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBranch = async (branchId) => {
    if (window.confirm('Bu branch kaydını silmek istediğinize emin misiniz?')) {
      try {
        await deleteDoc(doc(db, 'customer_branches', branchId));
        loadBranches();
      } catch (error) {
        console.error('Branch silinirken hata:', error);
      }
    }
  };

  // Branch seçildiğinde çağrılacak
  const handleSelectBranch = async (branch) => {
    setSelectedBranch(branch);
    setActiveStep(1);
    await Promise.all([
      fetchPullRequests(branch),
      fetchMergedPRHistory(branch)
    ]);
  };

  // API Calls
  const fetchPullRequests = async (branch) => {
    try {
      setLoadingPRs(true);
      
      const url = API_ENDPOINTS.getCompletedPRs;
      console.log('🔍 Pull Requests API çağrılıyor:', url);
      console.log('📤 Request Body:', {
        repository_name: branch.repoName,
        target_branch: branch.baseBranch
      });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repository_name: branch.repoName,
          target_branch: branch.baseBranch
        })
      });
      
      const data = await response.json();
      
      console.log('📦 Pull Requests Response:', data);
      console.log('📊 Response type:', typeof data, Array.isArray(data));
      
      // API response'u array veya object olabilir
      const prs = Array.isArray(data) ? data : (data.pull_requests || data.pullRequests || data.data || data.items || []);
      console.log('📊 PR sayısı:', prs.length);
      
      // API format'ını UI format'ına transform et
      const transformedPRs = prs.map(pr => ({
        prId: pr.pull_request_id || pr.prId,
        title: pr.title,
        status: pr.status,
        createdDate: pr.creation_date || pr.createdDate,
        closedDate: pr.closed_date || pr.closedDate,
        author: pr.created_by || pr.author,
        sourceBranch: pr.source_branch || pr.sourceBranch,
        targetBranch: pr.target_branch || pr.targetBranch,
        description: pr.description,
        workItems: pr.work_item_ids ? pr.work_item_ids.map(id => ({ id, title: `Work Item ${id}` })) : (pr.workItems || []),
        url: pr.url
      }));
      
      setPullRequests(transformedPRs);
    } catch (error) {
      console.error('Pull Requests yüklenirken hata:', error);
      // Mock data for development
      setPullRequests([
        { 
          prId: 12345, 
          title: 'Feature: New payment gateway', 
          status: 'completed',
          createdDate: '2026-01-15',
          workItems: [{ id: 123, title: 'Implement payment' }, { id: 124, title: 'Add tests' }],
          author: 'John Doe'
        },
        { 
          prId: 12346, 
          title: 'Bug fix: Login issue on mobile', 
          status: 'completed',
          createdDate: '2026-01-18',
          workItems: [{ id: 125, title: 'Fix login bug' }],
          author: 'Jane Smith'
        },
      ]);
    } finally {
      setLoadingPRs(false);
    }
  };

  const fetchMergedPRHistory = async (branch) => {
    try {
      const q = query(
        collection(db, 'sync_history'),
        orderBy('mergedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const history = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(item => item.customerBranchId === branch.id);
      
      setMergedPRHistory(history);
      console.log('📜 Merge geçmişi:', history);
    } catch (error) {
      console.error('Merge history yüklenirken hata:', error);
      setMergedPRHistory([]);
    }
  };

  const fetchBranchComparison = async (branch) => {
    try {
      setLoadingComparison(true);
      const params = new URLSearchParams({
        repo_name: branch.repoName,
        source_branch: branch.baseBranch,
        target_branch: branch.branchName
      });
      
      const response = await fetch(`${API_ENDPOINTS.getBranchComparison}?${params}`);
      const data = await response.json();
      setBranchComparison(data);
    } catch (error) {
      console.error('Branch comparison yüklenirken hata:', error);
      // Mock data for development
      setBranchComparison({
        ahead: 15,
        behind: 3,
        lastCommit: {
          date: '2026-01-20T10:30:00Z',
          author: 'Jane Doe',
          message: 'Updated feature X'
        },
        divergence: 'moderate'
      });
    } finally {
      setLoadingComparison(false);
    }
  };

  const handlePRToggle = (prId) => {
    setSelectedPRs(prev => 
      prev.includes(prId) 
        ? prev.filter(id => id !== prId)
        : [...prev, prId]
    );
  };

  const isPRMerged = (prId) => {
    return mergedPRHistory.some(item => item.prId === prId);
  };

  const handlePreviewSync = async () => {
    if (selectedPRs.length === 0) {
      alert('Lütfen en az bir PR seçin!');
      return;
    }

    try {
      setLoadingPreview(true);
      setActiveStep(2);
      
      console.log('🔍 Preview API çağrılıyor...');
      console.log('📤 Request Body:', {
        repository_name: selectedBranch.repoName,
        source_branch: selectedBranch.baseBranch,
        target_branch: selectedBranch.branchName,
        pr_ids: selectedPRs
      });
      
      const response = await fetch(API_ENDPOINTS.previewSync, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repository_name: selectedBranch.repoName,
          source_branch: selectedBranch.baseBranch,
          target_branch: selectedBranch.branchName,
          pr_ids: selectedPRs
        })
      });
      
      const data = await response.json();
      console.log('📦 Preview Response:', data);
      
      // API response'unu UI format'ına transform et
      const transformedPreview = {
        canMerge: data.can_merge !== undefined ? data.can_merge : true,
        riskLevel: data.risk_level || 'low',
        filesToChange: (data.files_to_change || []).map(f => ({
          path: f.file || f.path,
          status: f.status === 'M' ? 'modified' : f.status === 'A' ? 'added' : f.status === 'D' ? 'deleted' : f.status,
          additions: data.statistics?.additions || 0,
          deletions: data.statistics?.deletions || 0,
          changes: (data.statistics?.additions || 0) + (data.statistics?.deletions || 0),
          type: f.status === 'M' ? 'modified' : f.status === 'A' ? 'added' : f.status === 'D' ? 'deleted' : f.status,
          isConflict: f.is_conflict || false
        })),
        potentialConflicts: (data.potential_conflicts || []).map(c => ({
          file: c.file,
          lineRange: c.line_range,
          reason: c.reason,
          severity: c.severity || 'medium',
          ourChange: c.our_change,
          theirChange: c.their_change
        })),
        statistics: data.statistics || {},
        previewSummary: data.preview_summary || '',
        prDetails: data.pr_details || []
      };
      
      console.log('📊 Transformed Preview:', transformedPreview);
      setPreviewData(transformedPreview);
    } catch (error) {
      console.error('Preview yüklenirken hata:', error);
      // Mock data for development
      setPreviewData({
        filesToChange: [
          { path: 'src/components/Payment.js', changes: 45, type: 'modified' },
          { path: 'src/utils/api.js', changes: 12, type: 'modified' },
          { path: 'tests/payment.test.js', changes: 23, type: 'added' },
        ],
        potentialConflicts: [
          { file: 'src/components/Payment.js', severity: 'medium', reason: 'Both branches modified same function' }
        ],
        riskLevel: 'medium'
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleExecuteSync = async () => {
    if (!window.confirm('Sync işlemini başlatmak istediğinize emin misiniz? Yeni bir PR oluşturulacak.')) {
      return;
    }

    try {
      setLoading(true);
      setActiveStep(3);
      
      console.log('🚀 Execute Sync API çağrılıyor...');
      console.log('📤 Request Body:', {
        repository_name: selectedBranch.repoName,
        source_branch: selectedBranch.baseBranch,
        target_branch: selectedBranch.branchName,
        pr_ids: selectedPRs,
        auto_resolve_conflicts: true,
        sync_branch_prefix: 'sync'
      });
      
      const response = await fetch(API_ENDPOINTS.executeSync, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repository_name: selectedBranch.repoName,
          source_branch: selectedBranch.baseBranch,
          target_branch: selectedBranch.branchName,
          pr_ids: selectedPRs,
          auto_resolve_conflicts: true,
          sync_branch_prefix: 'sync'
        })
      });
      
      const data = await response.json();
      console.log('📦 Execute Response:', data);
      
      // API hata kontrolü
      if (!response.ok || data.status === 'failed') {
        throw new Error(data.message || data.error || 'Sync işlemi başarısız');
      }
      
      // Firebase'e kaydet (sadece başarılı veya conflict durumunda)
      const syncHistoryDoc = await addDoc(collection(db, 'sync_history'), {
        customerBranchId: selectedBranch.id,
        customerBranchName: selectedBranch.branchName,
        syncBranchName: data.sync_branch_name || 'unknown',
        prIds: selectedPRs,
        prDetails: pullRequests.filter(pr => selectedPRs.includes(pr.prId)),
        prCreated: data.pr_created || null,
        status: data.status || 'unknown',
        conflicts: data.conflicts || [],
        mergeCommitId: data.merge_commit_id || null,
        mergedPRs: data.merged_prs || [],
        createdAt: Timestamp.now(),
        createdBy: 'current-user@email.com', // TODO: Auth'dan al
      });
      
      console.log('✅ Firebase kaydedildi:', syncHistoryDoc.id);
      
      // Sonuç mesajı
      if (data.status === 'success') {
        alert(
          `✅ Sync başarılı!\n\n` +
          `• PR oluşturuldu: #${data.pr_created?.pr_id}\n` +
          `• Sync branch: ${data.sync_branch_name}\n` +
          `• ${selectedPRs.length} PR merge edildi\n\n` +
          `PR URL: ${data.pr_created?.pr_url}`
        );
      } else if (data.status === 'conflict') {
        alert(
          `⚠️ Conflict tespit edildi!\n\n` +
          `• Sync branch: ${data.sync_branch_name}\n` +
          `• ${data.conflicts?.length || 0} dosyada conflict var\n\n` +
          `Manuel düzeltme gerekiyor.`
        );
      } else {
        alert(`❌ Sync başarısız: ${data.message || 'Bilinmeyen hata'}`);
      }
      
      // Reset
      setSelectedBranch(null);
      setActiveStep(0);
      setSelectedPRs([]);
      setPreviewData(null);
      
      // Branch listesini yenile (merge history için)
      loadBranches();
    } catch (error) {
      console.error('❌ Sync çalıştırılırken hata:', error);
      alert(`Sync işlemi başarısız oldu!\n\n${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level) => {
    switch(level) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      default: return 'default';
    }
  };

  const getRiskIcon = (level) => {
    switch(level) {
      case 'low': return <CheckCircleIcon />;
      case 'medium': return <WarningIcon />;
      case 'high': return <ErrorIcon />;
      default: return null;
    }
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Code Synchronization Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddBranch}
        >
          Yeni Customer Branch
        </Button>
      </Box>

      {/* Customer Branches Listesi */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GitHubIcon /> Customer Branches
        </Typography>
        
        {loading && branches.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : branches.length === 0 ? (
          <Alert severity="info">
            Henüz customer branch tanımlanmamış. Yukarıdaki butona tıklayarak ilk branch'i ekleyebilirsiniz.
          </Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Müşteri Adı</TableCell>
                  <TableCell>Repo</TableCell>
                  <TableCell>Branch</TableCell>
                  <TableCell>Base Branch</TableCell>
                  <TableCell>Durum</TableCell>
                  <TableCell>Açıklama</TableCell>
                  <TableCell align="right">İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {branches.map((branch) => (
                  <TableRow key={branch.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {branch.customerName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {branch.repoName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={branch.branchName}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={branch.baseBranch}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={branch.isActive ? 'Aktif' : 'Pasif'}
                        size="small"
                        color={branch.isActive ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {branch.description}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleSelectBranch(branch)}
                        title="Sync Yap"
                      >
                        <SyncIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleEditBranch(branch)}
                        title="Düzenle"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteBranch(branch.id)}
                        title="Sil"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Sync Configuration Panel - Branch seçildiğinde göster */}
      {selectedBranch && (
        <Paper sx={{ p: 3, mb: 3, bgcolor: '#f5f5f5' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CompareArrowsIcon color="primary" />
              Sync Configuration: {selectedBranch.customerName}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setSelectedBranch(null);
                setActiveStep(0);
                setSelectedPRs([]);
                setPreviewData(null);
              }}
            >
              Kapat
            </Button>
          </Box>

          {/* Stepper */}
          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Branch Comparison Card */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={5}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Source (Bizim Branch)
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {selectedBranch.repoName}
                  </Typography>
                  <Chip label={selectedBranch.baseBranch} size="small" sx={{ mt: 1 }} />
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={2} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CompareArrowsIcon fontSize="large" color="primary" />
            </Grid>
            
            <Grid item xs={12} md={5}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Target (Müşteri Branch)
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {selectedBranch.repoName}
                  </Typography>
                  <Chip label={selectedBranch.branchName} size="small" color="primary" sx={{ mt: 1 }} />
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Step 1: PR Selection */}
          {activeStep === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CodeIcon color="primary" />
                Pull Request Seçimi ({selectedBranch.baseBranch})
              </Typography>
              
              <Alert severity="info" sx={{ mb: 2 }}>
                Source branch'daki <strong>Completed</strong> PR'ları seçin. Daha önce merge edilenler disabled gösterilir.
              </Alert>
              
              {loadingPRs ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : pullRequests.length === 0 ? (
                <Alert severity="warning">
                  Bu branch için completed PR bulunamadı.
                </Alert>
              ) : (
                <>
                  <TableContainer component={Paper} sx={{ mb: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">Seç</TableCell>
                          <TableCell>PR ID</TableCell>
                          <TableCell>Başlık</TableCell>
                          <TableCell>WorkItems</TableCell>
                          <TableCell>Yazar</TableCell>
                          <TableCell>Tarih</TableCell>
                          <TableCell>Durum</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pullRequests.map((pr) => {
                          const isMerged = isPRMerged(pr.prId);
                          return (
                            <TableRow 
                              key={pr.prId} 
                              hover={!isMerged}
                              sx={{ 
                                bgcolor: isMerged ? '#f5f5f5' : 'inherit',
                                opacity: isMerged ? 0.6 : 1
                              }}
                            >
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={selectedPRs.includes(pr.prId)}
                                  onChange={() => handlePRToggle(pr.prId)}
                                  disabled={isMerged}
                                />
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={`#${pr.prId}`} 
                                  size="small" 
                                  variant="outlined"
                                  color="primary"
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">{pr.title}</Typography>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                  {pr.workItems && pr.workItems.length > 0 ? (
                                    pr.workItems.map(wi => (
                                      <Chip 
                                        key={wi.id} 
                                        label={`WI ${wi.id}`} 
                                        size="small" 
                                        variant="outlined"
                                        sx={{ fontSize: '0.7rem' }}
                                      />
                                    ))
                                  ) : (
                                    <Typography variant="caption" color="text.secondary">
                                      Yok
                                    </Typography>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">{pr.author}</Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {new Date(pr.createdDate).toLocaleDateString('tr-TR')}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {isMerged ? (
                                  <Chip label="Merged" size="small" color="success" />
                                ) : (
                                  <Chip label="Pending" size="small" color="default" />
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      {selectedPRs.length} PR seçildi
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<VisibilityIcon />}
                      onClick={handlePreviewSync}
                      disabled={selectedPRs.length === 0}
                    >
                      Preview Changes
                    </Button>
                  </Box>
                </>
              )}
            </Box>
          )}

          {/* Step 2: Preview */}
          {activeStep === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <VisibilityIcon color="primary" />
                Sync Preview
              </Typography>

              {loadingPreview ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : !previewData ? (
                <Alert severity="error">
                  Preview yüklenemedi!
                </Alert>
              ) : (
                <>
                  {/* Can Merge Warning */}
                  {previewData.canMerge === false && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      <Typography variant="body2" fontWeight="bold">
                        ⚠️ Bu PR merge edilemez!
                      </Typography>
                      <Typography variant="caption">
                        Ciddi conflict'ler var veya target branch commit eksik olabilir.
                      </Typography>
                    </Alert>
                  )}

                  {/* Preview Summary */}
                  {previewData.previewSummary && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {previewData.previewSummary}
                      </Typography>
                    </Alert>
                  )}

                  {/* Risk Level */}
                  <Alert 
                    severity={previewData.riskLevel === 'low' ? 'success' : previewData.riskLevel === 'medium' ? 'warning' : 'error'}
                    icon={getRiskIcon(previewData.riskLevel)}
                    sx={{ mb: 2 }}
                  >
                    <Typography variant="body2" fontWeight="bold">
                      Risk Level: {previewData.riskLevel?.toUpperCase() || 'UNKNOWN'}
                    </Typography>
                    <Typography variant="caption">
                      {previewData.filesToChange?.length || 0} dosya değişecek
                      {previewData.potentialConflicts?.length > 0 && `, ${previewData.potentialConflicts.length} potansiyel conflict`}
                    </Typography>
                  </Alert>

                  {/* Files to Change */}
                  {previewData.filesToChange?.length > 0 ? (
                    <Paper sx={{ mb: 2 }}>
                      <Box sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          Değişecek Dosyalar ({previewData.filesToChange.length})
                        </Typography>
                      </Box>
                      <List dense>
                        {previewData.filesToChange.map((file, idx) => (
                        <ListItem key={idx}>
                          <ListItemIcon>
                            <FileIcon fontSize="small" color={file.status === 'added' ? 'success' : file.status === 'deleted' ? 'error' : 'primary'} />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                  {file.path}
                                </Typography>
                                {file.isConflict && (
                                  <Chip label="CONFLICT" size="small" color="error" sx={{ height: 18 }} />
                                )}
                              </Box>
                            }
                            secondary={`${file.status} • +${file.additions} -${file.deletions}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                  ) : (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        Değişecek dosya bulunamadı. Bu PR zaten merge edilmiş veya target branch'da mevcut olabilir.
                      </Typography>
                    </Alert>
                  )}

                  {/* Potential Conflicts */}
                  {previewData.potentialConflicts?.length > 0 && (
                    <Paper sx={{ mb: 2, borderLeft: 4, borderColor: 'warning.main' }}>
                      <Box sx={{ p: 2, bgcolor: '#fff8e1' }}>
                        <Typography variant="subtitle2" fontWeight="bold" color="warning.dark">
                          ⚠️ Potansiyel Conflicts ({previewData.potentialConflicts.length})
                        </Typography>
                      </Box>
                      <List dense>
                        {previewData.potentialConflicts.map((conflict, idx) => (
                          <ListItem key={idx}>
                            <ListItemIcon>
                              <WarningIcon fontSize="small" color="warning" />
                            </ListItemIcon>
                            <ListItemText
                              primary={conflict.file}
                              secondary={conflict.reason}
                              primaryTypographyProps={{ sx: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
                            />
                            <Chip label={conflict.severity} size="small" color={getRiskColor(conflict.severity)} />
                          </ListItem>
                        ))}
                      </List>
                    </Paper>
                  )}

                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={() => setActiveStep(1)}
                    >
                      Geri
                    </Button>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<PlayArrowIcon />}
                      onClick={handleExecuteSync}
                      disabled={loading}
                    >
                      {loading ? <CircularProgress size={24} /> : 'Start Sync'}
                    </Button>
                  </Box>
                </>
              )}
            </Box>
          )}

          {/* Step 3: Execution */}
          {activeStep === 3 && (
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <CircularProgress size={60} />
              <Typography variant="h6" sx={{ mt: 2 }}>
                Sync işlemi yapılıyor...
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Bu işlem birkaç dakika sürebilir.
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      {/* Branch Ekleme/Düzenleme Dialog */}
      <Dialog open={openBranchDialog} onClose={() => setOpenBranchDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {branchForm.id ? 'Branch Düzenle' : 'Yeni Customer Branch Ekle'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Müşteri Adı"
              value={branchForm.customerName}
              onChange={(e) => setBranchForm({ ...branchForm, customerName: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Repo URL"
              value={branchForm.repoUrl}
              onChange={(e) => setBranchForm({ ...branchForm, repoUrl: e.target.value })}
              fullWidth
              placeholder="https://dev.azure.com/organization/project/_git/repo"
              helperText="Azure DevOps repo URL'i"
            />
            <TextField
              label="Repo Name"
              value={branchForm.repoName}
              onChange={(e) => setBranchForm({ ...branchForm, repoName: e.target.value })}
              fullWidth
              required
              placeholder="my-repo"
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Customer Branch Name"
                  value={branchForm.branchName}
                  onChange={(e) => setBranchForm({ ...branchForm, branchName: e.target.value })}
                  fullWidth
                  required
                  placeholder="customer-acme"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Base Branch (Bizim)"
                  value={branchForm.baseBranch}
                  onChange={(e) => setBranchForm({ ...branchForm, baseBranch: e.target.value })}
                  fullWidth
                  placeholder="master"
                />
              </Grid>
            </Grid>
            <TextField
              label="Açıklama"
              value={branchForm.description}
              onChange={(e) => setBranchForm({ ...branchForm, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBranchDialog(false)}>İptal</Button>
          <Button
            onClick={handleSaveBranch}
            variant="contained"
            disabled={!branchForm.customerName || !branchForm.repoName || !branchForm.branchName || loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CodeSyncManagement;
