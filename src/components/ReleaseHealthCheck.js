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
  Stepper,
  Step,
  StepLabel,
  StepConnector,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  Alert,
  Divider,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  ArrowForward as ArrowForwardIcon,
  Favorite as HealthIcon,
  ExpandMore as ExpandMoreIcon,
  AccountTree as PipelineIcon,
  SmartToy as AiIcon,
  Build as FixingIcon,
  MergeType as PrIcon,
  Warning as ManualIcon,
  Replay as RetryIcon,
  InfoOutlined as InfoIcon,
  Description as LogIcon,
  Close as CloseIcon,
  Cloud as PodIcon,
  History as HistoryIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Edit as EditIcon,
  Security as AuthIcon,
  CheckCircle as ApprovalIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';

// Custom styled connector
const CustomConnector = styled(StepConnector)(({ theme }) => ({
  '& .MuiStepConnector-line': {
    borderTopWidth: 3,
    borderRadius: 1,
  },
}));

// Custom step icon
const CustomStepIcon = (props) => {
  const { active, completed } = props;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
        borderRadius: '50%',
        bgcolor: completed ? 'success.main' : active ? 'primary.main' : 'grey.300',
        color: 'white',
      }}
    >
      {completed ? <CheckCircleIcon /> : <RadioButtonUncheckedIcon />}
    </Box>
  );
};

const ReleaseHealthCheck = () => {
  const navigate = useNavigate();

  // Mock release data
  const releases = [
    {
      id: 1,
      version: 'v1.23.0',
      currentStep: 10,
      status: 'Published',
      startDate: '2025-07-01',
      releaseDate: '2025-08-15'
    },
    {
      id: 2,
      version: 'v1.24.0',
      currentStep: 10,
      status: 'Published',
      startDate: '2025-08-20',
      releaseDate: '2025-09-20'
    },
    {
      id: 3,
      version: 'v1.25.0',
      currentStep: 7,
      status: 'Testing',
      startDate: '2025-09-25',
      releaseDate: '2025-10-25'
    },
    {
      id: 4,
      version: 'v1.26.0',
      currentStep: 1,
      status: 'InProgress',
      startDate: '2025-10-15',
      releaseDate: '2025-11-20'
    },
  ];

  // Release preparation steps
  const steps = [
    { label: 'Create Release Branches', description: 'Release branch\'ları oluşturuldu' },
    { label: 'Create Beta Tag', description: 'Beta tag oluşturuldu' },
    { label: 'Deploy to Test', description: 'Test ortamına deploy edildi' },
    { label: 'Generate Release Notes', description: 'Release notları oluşturuldu' },
    { label: 'Unreleased Changes Audit', description: 'Yayınlanmamış değişiklikler denetlendi' },
    { label: 'Lock Branches', description: 'Branch\'lar kilitlendi' },
    { label: 'Generate Changes', description: 'Değişiklik listesi oluşturuldu' },
    { label: 'Create Rc Tag', description: 'Rc tag oluşturuldu' },
    { label: 'Deploy to PreProd', description: 'PreProd ortamına deploy edildi' },
    { label: 'Update Release Note Status', description: 'Release notları güncellendi' },
  ];

  const [selectedVersion, setSelectedVersion] = useState('v1.25.0');
  const [currentRelease, setCurrentRelease] = useState(
    releases.find(r => r.version === 'v1.25.0')
  );

  // Mock pipeline data
  const pipelineData = {
    totalServices: 11,
    failedServices: 4,
    inProgressServices: 2,
    completedServices: 5,
    services: [
      { 
        name: 'Auth Service', 
        owner: 'Ahmet Yılmaz', 
        status: 'Failed', 
        pipelineUrl: 'https://dev.azure.com/myorg/myproject/_build/results?buildId=12345',
        aiStatus: 'analyzing', // AI hatayı kontrol ediyor
        aiMessage: 'AI hatayı analiz ediyor...'
      },
      { 
        name: 'Payment Service', 
        owner: 'Ayşe Kaya', 
        status: 'Failed', 
        pipelineUrl: 'https://dev.azure.com/myorg/myproject/_build/results?buildId=12346',
        aiStatus: 'manual-required', // Manuel müdahale gerekiyor
        aiMessage: 'Manuel müdahale gerekiyor'
      },
      { 
        name: 'Notification Service', 
        owner: 'Mehmet Demir', 
        status: 'InProgress', 
        pipelineUrl: 'https://dev.azure.com/myorg/myproject/_build/results?buildId=12347',
        aiStatus: null,
        aiMessage: null
      },
      { 
        name: 'User Service', 
        owner: 'Ahmet Yılmaz', 
        status: 'Failed', 
        pipelineUrl: 'https://dev.azure.com/myorg/myproject/_build/results?buildId=12348',
        aiStatus: 'pr-created', // PR oluşturuldu, onay bekliyor
        aiMessage: 'PR oluşturuldu, onay bekliyor',
        prUrl: 'https://dev.azure.com/myorg/myproject/_git/user-service/pullrequest/123'
      },
      { 
        name: 'Order Service', 
        owner: 'Fatma Şahin', 
        status: 'Failed', 
        pipelineUrl: 'https://dev.azure.com/myorg/myproject/_build/results?buildId=12349',
        aiStatus: 'pr-approved', // PR onaylandı, pipeline tekrar tetikleniyor
        aiMessage: 'PR onaylandı, pipeline tekrar tetikleniyor',
        prUrl: 'https://dev.azure.com/myorg/myproject/_git/order-service/pullrequest/456'
      },
      { 
        name: 'Inventory Service', 
        owner: 'Mehmet Demir', 
        status: 'InProgress', 
        pipelineUrl: 'https://dev.azure.com/myorg/myproject/_build/results?buildId=12350',
        aiStatus: null,
        aiMessage: null
      },
    ]
  };

  // Mock beta tag pipeline data
  const betaTagPipelineData = {
    totalServices: 10,
    failedServices: 2,
    inProgressServices: 1,
    completedServices: 7,
    services: [
      { 
        name: 'API Gateway', 
        owner: 'Can Öztürk', 
        status: 'Completed', 
        pipelineUrl: 'https://dev.azure.com/myorg/myproject/_build/results?buildId=22345',
        aiStatus: null,
        aiMessage: null
      },
      { 
        name: 'Customer Service', 
        owner: 'Zeynep Arslan', 
        status: 'Failed', 
        pipelineUrl: 'https://dev.azure.com/myorg/myproject/_build/results?buildId=22346',
        aiStatus: 'fixing',
        aiMessage: 'AI kodu düzeltiyor...'
      },
      { 
        name: 'Analytics Service', 
        owner: 'Burak Yıldız', 
        status: 'InProgress', 
        pipelineUrl: 'https://dev.azure.com/myorg/myproject/_build/results?buildId=22347',
        aiStatus: null,
        aiMessage: null
      },
      { 
        name: 'Reporting Service', 
        owner: 'Can Öztürk', 
        status: 'Failed', 
        pipelineUrl: 'https://dev.azure.com/myorg/myproject/_build/results?buildId=22348',
        aiStatus: 'pr-created',
        aiMessage: 'PR oluşturuldu, onay bekliyor',
        prUrl: 'https://dev.azure.com/myorg/myproject/_git/reporting-service/pullrequest/789'
      },
      { 
        name: 'Email Service', 
        owner: 'Zeynep Arslan', 
        status: 'Completed', 
        pipelineUrl: 'https://dev.azure.com/myorg/myproject/_build/results?buildId=22349',
        aiStatus: null,
        aiMessage: null
      },
    ]
  };

  // Mock prod tag pipeline data
  const prodTagPipelineData = {
    totalServices: 10,
    failedServices: 3,
    inProgressServices: 2,
    completedServices: 5,
    services: [
      { 
        name: 'API Gateway', 
        owner: 'Can Öztürk', 
        status: 'Completed', 
        pipelineUrl: 'https://dev.azure.com/myorg/myproject/_build/results?buildId=32345',
        aiStatus: null,
        aiMessage: null
      },
      { 
        name: 'Customer Service', 
        owner: 'Zeynep Arslan', 
        status: 'InProgress', 
        pipelineUrl: 'https://dev.azure.com/myorg/myproject/_build/results?buildId=32346',
        aiStatus: null,
        aiMessage: null
      },
      { 
        name: 'Analytics Service', 
        owner: 'Burak Yıldız', 
        status: 'Completed', 
        pipelineUrl: 'https://dev.azure.com/myorg/myproject/_build/results?buildId=32347',
        aiStatus: null,
        aiMessage: null
      },
      { 
        name: 'Reporting Service', 
        owner: 'Can Öztürk', 
        status: 'Failed', 
        pipelineUrl: 'https://dev.azure.com/myorg/myproject/_build/results?buildId=32348',
        aiStatus: 'fixing',
        aiMessage: 'AI kodu düzeltiyor...'
      },
      { 
        name: 'Email Service', 
        owner: 'Zeynep Arslan', 
        status: 'Completed', 
        pipelineUrl: 'https://dev.azure.com/myorg/myproject/_build/results?buildId=32349',
        aiStatus: null,
        aiMessage: null
      },
      { 
        name: 'Auth Service', 
        owner: 'Ahmet Yılmaz', 
        status: 'Failed', 
        pipelineUrl: 'https://dev.azure.com/myorg/myproject/_build/results?buildId=32350',
        aiStatus: 'pr-created',
        aiMessage: 'PR oluşturuldu, onay bekliyor',
        prUrl: 'https://dev.azure.com/myorg/myproject/_git/auth-service/pullrequest/999'
      },
      { 
        name: 'Payment Service', 
        owner: 'Ayşe Kaya', 
        status: 'Failed', 
        pipelineUrl: 'https://dev.azure.com/myorg/myproject/_build/results?buildId=32351',
        aiStatus: 'analyzing',
        aiMessage: 'AI hatayı analiz ediyor...'
      },
      { 
        name: 'User Service', 
        owner: 'Ahmet Yılmaz', 
        status: 'Completed', 
        pipelineUrl: 'https://dev.azure.com/myorg/myproject/_build/results?buildId=32352',
        aiStatus: null,
        aiMessage: null
      },
      { 
        name: 'Order Service', 
        owner: 'Fatma Şahin', 
        status: 'InProgress', 
        pipelineUrl: 'https://dev.azure.com/myorg/myproject/_build/results?buildId=32353',
        aiStatus: null,
        aiMessage: null
      },
      { 
        name: 'Notification Service', 
        owner: 'Mehmet Demir', 
        status: 'Completed', 
        pipelineUrl: 'https://dev.azure.com/myorg/myproject/_build/results?buildId=32354',
        aiStatus: null,
        aiMessage: null
      },
    ]
  };

  // Mock K8s Pod Status data
  const k8sPodData = {
    totalServices: 10,
    failedServices: 2,
    notDeployedServices: 1,
    successServices: 7,
    targetVersion: 'v1.24.0',
    services: [
      { 
        name: 'Auth Service', 
        owner: 'Ahmet Yılmaz', 
        currentVersion: 'v1.24.0',
        targetVersion: 'v1.24.0',
        podStatus: 'Running',
        status: 'Success',
        logs: null
      },
      { 
        name: 'Payment Service', 
        owner: 'Ayşe Kaya', 
        currentVersion: 'v1.24.0',
        targetVersion: 'v1.24.0',
        podStatus: 'CrashLoopBackOff',
        status: 'Failed',
        logs: `[ERROR] Failed to connect to database at payment-db:5432
Connection timeout after 30s
Stack trace:
  at DatabaseConnection.connect (db.js:45)
  at PaymentService.initialize (service.js:12)
  at Object.<anonymous> (index.js:8)
[FATAL] Application startup failed`
      },
      { 
        name: 'Notification Service', 
        owner: 'Mehmet Demir', 
        currentVersion: 'v1.23.0',
        targetVersion: 'v1.24.0',
        podStatus: 'NotDeployed',
        status: 'NotDeployed',
        logs: 'Deployment not started yet. Current version v1.23.0 is still running.'
      },
      { 
        name: 'User Service', 
        owner: 'Ahmet Yılmaz', 
        currentVersion: 'v1.24.0',
        targetVersion: 'v1.24.0',
        podStatus: 'Running',
        status: 'Success',
        logs: null
      },
      { 
        name: 'Order Service', 
        owner: 'Fatma Şahin', 
        currentVersion: 'v1.24.0',
        targetVersion: 'v1.24.0',
        podStatus: 'Error',
        status: 'Failed',
        logs: `[ERROR] Redis connection failed
Error: connect ECONNREFUSED 10.0.0.5:6379
  at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1148:16)
[WARN] Retrying connection... (attempt 3/3)
[FATAL] Max retries exceeded. Service shutting down.`
      },
      { 
        name: 'Inventory Service', 
        owner: 'Mehmet Demir', 
        currentVersion: 'v1.24.0',
        targetVersion: 'v1.24.0',
        podStatus: 'Running',
        status: 'Success',
        logs: null
      },
    ]
  };

  // Mock Release Notes Work Items data
  const releaseNotesData = {
    totalWorkItems: 15,
    issuesCount: 8,
    workItems: [
      {
        id: 'WI-1234',
        title: '', // Boş - AI üretecek
        description: '', // Boş - AI üretecek
        service: 'Auth Service',
        owner: 'Ahmet Yılmaz',
        jiraId: 'PROJ-456',
        azureStatus: 'In Development',
        jiraStatus: 'In Progress',
        version: 'v1.24.0',
        jiraVersion: 'v1.24.0',
        impactScope: 'Feature',
        dontNeedReleaseNote: false,
        reviewStatus: 'Pending',
        aiStatus: 'generating', // AI üretiyor
        issueType: 'empty-fields',
        workItemLink: 'https://dev.azure.com/myorg/myproject/_workitems/edit/1234'
      },
      {
        id: 'WI-1235',
        title: 'Payment gateway integration',
        description: 'Added new payment provider support',
        service: 'Payment Service',
        owner: 'Ayşe Kaya',
        jiraId: 'PROJ-457',
        azureStatus: 'Testing',
        jiraStatus: 'Testing',
        version: 'v1.24.0',
        jiraVersion: 'v1.23.0', // Versiyon uyumsuz!
        impactScope: 'Feature',
        dontNeedReleaseNote: false,
        reviewStatus: 'Approved',
        aiStatus: null,
        issueType: 'version-mismatch',
        workItemLink: 'https://dev.azure.com/myorg/myproject/_workitems/edit/1235'
      },
      {
        id: 'WI-1236',
        title: 'Fix notification bug',
        description: 'Fixed email notification issue',
        service: 'Notification Service',
        owner: 'Mehmet Demir',
        jiraId: null,
        azureStatus: 'In Development', // Test'e gelmemiş!
        jiraStatus: null,
        version: 'v1.24.0',
        jiraVersion: null,
        impactScope: 'Bug',
        dontNeedReleaseNote: false,
        reviewStatus: 'Review',
        aiStatus: null,
        issueType: 'status-issue',
        workItemLink: 'https://dev.azure.com/myorg/myproject/_workitems/edit/1236'
      },
      {
        id: 'WI-1237',
        title: 'User profile enhancement',
        description: 'Enhanced user profile page',
        service: 'User Service',
        owner: 'Ahmet Yılmaz',
        jiraId: 'PROJ-458',
        azureStatus: 'Testing',
        jiraStatus: 'Testing',
        version: 'v1.24.0',
        jiraVersion: 'v1.24.0',
        impactScope: 'Feature',
        dontNeedReleaseNote: true, // Jirası var ama işaretlenmiş!
        reviewStatus: 'Approved',
        aiStatus: null,
        issueType: 'jira-dont-need',
        workItemLink: 'https://dev.azure.com/myorg/myproject/_workitems/edit/1237'
      },
      {
        id: 'WI-1238',
        title: '',
        description: '',
        service: 'Order Service',
        owner: 'Fatma Şahin',
        jiraId: null,
        azureStatus: 'Testing',
        jiraStatus: null,
        version: 'v1.24.0',
        jiraVersion: null,
        impactScope: 'Bug',
        dontNeedReleaseNote: false,
        reviewStatus: 'Pending',
        aiStatus: 'analyzing', // AI analiz ediyor
        issueType: 'empty-fields',
        workItemLink: 'https://dev.azure.com/myorg/myproject/_workitems/edit/1238'
      },
    ]
  };

  const releaseNotesSuccessRate = (((releaseNotesData.totalWorkItems - releaseNotesData.issuesCount) / releaseNotesData.totalWorkItems) * 100).toFixed(0);

  // Mock PreProd K8s Pod Status data
  const preProdK8sPodData = {
    totalServices: 10,
    failedServices: 1,
    notDeployedServices: 2,
    successServices: 7,
    targetVersion: 'v1.24.0',
    services: [
      { 
        name: 'Auth Service', 
        owner: 'Ahmet Yılmaz', 
        currentVersion: 'v1.24.0',
        targetVersion: 'v1.24.0',
        podStatus: 'Running',
        status: 'Success',
        logs: null
      },
      { 
        name: 'Payment Service', 
        owner: 'Ayşe Kaya', 
        currentVersion: 'v1.24.0',
        targetVersion: 'v1.24.0',
        podStatus: 'Running',
        status: 'Success',
        logs: null
      },
      { 
        name: 'Notification Service', 
        owner: 'Mehmet Demir', 
        currentVersion: 'v1.23.0',
        targetVersion: 'v1.24.0',
        podStatus: 'NotDeployed',
        status: 'NotDeployed',
        logs: 'Deployment not started yet. Current version v1.23.0 is still running in PreProd.'
      },
      { 
        name: 'User Service', 
        owner: 'Ahmet Yılmaz', 
        currentVersion: 'v1.24.0',
        targetVersion: 'v1.24.0',
        podStatus: 'Running',
        status: 'Success',
        logs: null
      },
      { 
        name: 'Order Service', 
        owner: 'Fatma Şahin', 
        currentVersion: 'v1.24.0',
        targetVersion: 'v1.24.0',
        podStatus: 'Running',
        status: 'Success',
        logs: null
      },
      { 
        name: 'Inventory Service', 
        owner: 'Mehmet Demir', 
        currentVersion: 'v1.24.0',
        targetVersion: 'v1.24.0',
        podStatus: 'Running',
        status: 'Success',
        logs: null
      },
      { 
        name: 'Analytics Service', 
        owner: 'Burak Yıldız', 
        currentVersion: 'v1.23.0',
        targetVersion: 'v1.24.0',
        podStatus: 'NotDeployed',
        status: 'NotDeployed',
        logs: 'Deployment pending. Waiting for approval to deploy v1.24.0 to PreProd.'
      },
      { 
        name: 'Reporting Service', 
        owner: 'Can Öztürk', 
        currentVersion: 'v1.24.0',
        targetVersion: 'v1.24.0',
        podStatus: 'Running',
        status: 'Success',
        logs: null
      },
      { 
        name: 'Email Service', 
        owner: 'Zeynep Arslan', 
        currentVersion: 'v1.24.0',
        targetVersion: 'v1.24.0',
        podStatus: 'CrashLoopBackOff',
        status: 'Failed',
        logs: `[ERROR] SMTP connection failed to mail-server:587
Error: Authentication failed - Invalid credentials
  at SMTPClient.authenticate (smtp.js:102)
  at EmailService.initialize (email-service.js:34)
[WARN] Attempting reconnection with backup SMTP server...
[ERROR] Backup server also unreachable
[FATAL] Email service initialization failed. Container restarting...`
      },
      { 
        name: 'Customer Service', 
        owner: 'Zeynep Arslan', 
        currentVersion: 'v1.24.0',
        targetVersion: 'v1.24.0',
        podStatus: 'Running',
        status: 'Success',
        logs: null
      },
    ]
  };

  // Mock unreleased changes audit data - PR'ı merge edilmiş ama tag alınmamış servisler
  const unreleasedChangesData = {
    totalServices: 8,
    servicesWithUnreleasedPRs: 5,
    totalUnreleasedPRs: 12,
    services: [
      {
        name: 'Auth Service',
        owner: 'Ahmet Yılmaz',
        unreleasedPRCount: 3,
        prs: [
          {
            id: 'PR-1001',
            title: 'Fix authentication timeout issue',
            author: 'Ahmet Yılmaz',
            mergedDate: '2025-10-15',
            prUrl: 'https://dev.azure.com/myorg/myproject/_git/auth-service/pullrequest/1001'
          },
          {
            id: 'PR-1002',
            title: 'Add new OAuth provider',
            author: 'Mehmet Demir',
            mergedDate: '2025-10-16',
            prUrl: 'https://dev.azure.com/myorg/myproject/_git/auth-service/pullrequest/1002'
          },
          {
            id: 'PR-1003',
            title: 'Update token validation',
            author: 'Ahmet Yılmaz',
            mergedDate: '2025-10-17',
            prUrl: 'https://dev.azure.com/myorg/myproject/_git/auth-service/pullrequest/1003'
          }
        ]
      },
      {
        name: 'Payment Service',
        owner: 'Ayşe Kaya',
        unreleasedPRCount: 2,
        prs: [
          {
            id: 'PR-2001',
            title: 'Integrate new payment gateway',
            author: 'Ayşe Kaya',
            mergedDate: '2025-10-14',
            prUrl: 'https://dev.azure.com/myorg/myproject/_git/payment-service/pullrequest/2001'
          },
          {
            id: 'PR-2002',
            title: 'Fix refund calculation bug',
            author: 'Fatma Şahin',
            mergedDate: '2025-10-18',
            prUrl: 'https://dev.azure.com/myorg/myproject/_git/payment-service/pullrequest/2002'
          }
        ]
      },
      {
        name: 'User Service',
        owner: 'Ahmet Yılmaz',
        unreleasedPRCount: 4,
        prs: [
          {
            id: 'PR-3001',
            title: 'Add user profile caching',
            author: 'Can Öztürk',
            mergedDate: '2025-10-13',
            prUrl: 'https://dev.azure.com/myorg/myproject/_git/user-service/pullrequest/3001'
          },
          {
            id: 'PR-3002',
            title: 'Fix avatar upload issue',
            author: 'Zeynep Arslan',
            mergedDate: '2025-10-15',
            prUrl: 'https://dev.azure.com/myorg/myproject/_git/user-service/pullrequest/3002'
          },
          {
            id: 'PR-3003',
            title: 'Improve search performance',
            author: 'Ahmet Yılmaz',
            mergedDate: '2025-10-16',
            prUrl: 'https://dev.azure.com/myorg/myproject/_git/user-service/pullrequest/3003'
          },
          {
            id: 'PR-3004',
            title: 'Update user settings API',
            author: 'Burak Yıldız',
            mergedDate: '2025-10-17',
            prUrl: 'https://dev.azure.com/myorg/myproject/_git/user-service/pullrequest/3004'
          }
        ]
      },
      {
        name: 'Notification Service',
        owner: 'Mehmet Demir',
        unreleasedPRCount: 1,
        prs: [
          {
            id: 'PR-4001',
            title: 'Add SMS notification support',
            author: 'Mehmet Demir',
            mergedDate: '2025-10-18',
            prUrl: 'https://dev.azure.com/myorg/myproject/_git/notification-service/pullrequest/4001'
          }
        ]
      },
      {
        name: 'Order Service',
        owner: 'Fatma Şahin',
        unreleasedPRCount: 2,
        prs: [
          {
            id: 'PR-5001',
            title: 'Fix order cancellation flow',
            author: 'Fatma Şahin',
            mergedDate: '2025-10-14',
            prUrl: 'https://dev.azure.com/myorg/myproject/_git/order-service/pullrequest/5001'
          },
          {
            id: 'PR-5002',
            title: 'Add order tracking feature',
            author: 'Can Öztürk',
            mergedDate: '2025-10-17',
            prUrl: 'https://dev.azure.com/myorg/myproject/_git/order-service/pullrequest/5002'
          }
        ]
      }
    ]
  };

  // Mock Generate Changes data - Test vs PreProd comparison and Breaking Change Analysis
  const generateChangesData = {
    totalChangedTables: 24,
    totalChangedServices: 8,
    breakingChangesDetected: 12,
    breakingChangesApproved: 7,
    breakingChangesPending: 5,
    services: [
      {
        name: 'Auth Service',
        owner: 'Ahmet Yılmaz',
        changedTables: 4,
        breakingChanges: 2,
        approved: true,
        changes: [
          {
            type: 'deleted-method',
            severity: 'high',
            description: 'POST /api/auth/legacy-login metodu silindi',
            impact: 'Eski login endpoint\'i kullanan istemciler etkilenecek',
            aiAnalysis: 'AI Analizi: Bu endpoint son 3 aydır kullanılmıyor. Migration dökümanı hazırlandı.'
          },
          {
            type: 'parameter-removed',
            severity: 'medium',
            description: 'GET /api/auth/validate - "legacy_token" parametresi kaldırıldı',
            impact: 'Legacy token kullanımı sonlandırıldı',
            aiAnalysis: 'AI Analizi: Tüm istemciler yeni token formatına geçmiş durumda.'
          }
        ]
      },
      {
        name: 'Payment Service',
        owner: 'Ayşe Kaya',
        changedTables: 6,
        breakingChanges: 3,
        approved: false,
        changes: [
          {
            type: 'http-method-changed',
            severity: 'high',
            description: 'POST /api/payment/refund → PUT /api/payment/refund',
            impact: 'HTTP method değişikliği istemci kodunda güncelleme gerektirir',
            aiAnalysis: 'AI Analizi: RESTful standartlara uyum için değiştirildi. 5 istemci servis güncellenmeli.'
          },
          {
            type: 'property-type-changed',
            severity: 'high',
            description: 'RefundRequest.amount: string → decimal',
            impact: 'Model property tipi değişti, deserializasyon hatası olabilir',
            aiAnalysis: 'AI Analizi: Tip güvenliği artırıldı. Migration script hazır.'
          },
          {
            type: 'column-deleted',
            severity: 'medium',
            description: 'Payments tablosundan "legacy_gateway_id" kolonu silindi',
            impact: 'Eski payment gateway referansları kaldırıldı',
            aiAnalysis: 'AI Analizi: Son 6 aydır NULL değer taşıyan kolon temizlendi.'
          }
        ]
      },
      {
        name: 'User Service',
        owner: 'Ahmet Yılmaz',
        changedTables: 3,
        breakingChanges: 1,
        approved: true,
        changes: [
          {
            type: 'required-field-added',
            severity: 'medium',
            description: 'UserProfile modeline "consent_version" zorunlu alan eklendi',
            impact: 'Yeni kullanıcı kayıtları bu alanı içermeli',
            aiAnalysis: 'AI Analizi: GDPR uyumu için eklendi. Default değer migration\'da ayarlandı.'
          }
        ]
      },
      {
        name: 'Order Service',
        owner: 'Fatma Şahin',
        changedTables: 5,
        breakingChanges: 3,
        approved: false,
        changes: [
          {
            type: 'response-structure-changed',
            severity: 'high',
            description: 'GET /api/orders/{id} response yapısı değişti - "items" array\'i "orderItems" oldu',
            impact: 'Response parse eden tüm istemciler güncellenmeli',
            aiAnalysis: 'AI Analizi: Naming convention standardizasyonu. 8 istemci servis etkileniyor.'
          },
          {
            type: 'endpoint-renamed',
            severity: 'high',
            description: '/api/order/cancel → /api/orders/{id}/cancellation',
            impact: 'URL değişikliği tüm istemcileri etkiler',
            aiAnalysis: 'AI Analizi: RESTful pattern\'e uyum. API Gateway routing güncellendi.'
          },
          {
            type: 'column-type-changed',
            severity: 'medium',
            description: 'Orders.total_amount: float → decimal(18,2)',
            impact: 'Hassasiyet artırıldı, veri tipi değişti',
            aiAnalysis: 'AI Analizi: Para birimi hesaplamalarında hassasiyet sorunu giderildi.'
          }
        ]
      },
      {
        name: 'Notification Service',
        owner: 'Mehmet Demir',
        changedTables: 2,
        breakingChanges: 1,
        approved: true,
        changes: [
          {
            type: 'authentication-required',
            severity: 'medium',
            description: 'POST /api/notifications/send artık authentication gerektiriyor',
            impact: 'Anonymous çağrılar başarısız olacak',
            aiAnalysis: 'AI Analizi: Güvenlik artırımı. Test ortamında tüm istemciler JWT kullanıyor.'
          }
        ]
      },
      {
        name: 'Inventory Service',
        owner: 'Mehmet Demir',
        changedTables: 2,
        breakingChanges: 1,
        approved: false,
        changes: [
          {
            type: 'validation-rule-changed',
            severity: 'low',
            description: 'Stock quantity minimum değeri 0\'dan 1\'e yükseltildi',
            impact: 'Sıfır stok girişleri reddedilecek',
            aiAnalysis: 'AI Analizi: Business rule değişikliği. Inventory yönetimi iyileştirildi.'
          }
        ]
      },
      {
        name: 'Reporting Service',
        owner: 'Can Öztürk',
        changedTables: 1,
        breakingChanges: 0,
        approved: true,
        changes: []
      },
      {
        name: 'Analytics Service',
        owner: 'Burak Yıldız',
        changedTables: 1,
        breakingChanges: 1,
        approved: false,
        changes: [
          {
            type: 'query-parameter-renamed',
            severity: 'medium',
            description: 'GET /api/analytics/report - "date" parametresi "reportDate" olarak değiştirildi',
            impact: 'Query string kullanan istemciler güncellenmeli',
            aiAnalysis: 'AI Analizi: Parametre ismi daha açıklayıcı hale getirildi.'
          }
        ]
      }
    ]
  };

  const generateChangesSuccessRate = ((generateChangesData.breakingChangesApproved / generateChangesData.breakingChangesDetected) * 100).toFixed(0);

  const unreleasedSuccessRate = (((unreleasedChangesData.totalServices - unreleasedChangesData.servicesWithUnreleasedPRs) / unreleasedChangesData.totalServices) * 100).toFixed(0);

  const successRate = ((pipelineData.completedServices / pipelineData.totalServices) * 100).toFixed(0);
  const betaSuccessRate = ((betaTagPipelineData.completedServices / betaTagPipelineData.totalServices) * 100).toFixed(0);
  const prodSuccessRate = ((prodTagPipelineData.completedServices / prodTagPipelineData.totalServices) * 100).toFixed(0);
  const k8sSuccessRate = ((k8sPodData.successServices / k8sPodData.totalServices) * 100).toFixed(0);
  const preProdK8sSuccessRate = ((preProdK8sPodData.successServices / preProdK8sPodData.totalServices) * 100).toFixed(0);
  
  // Group by owner for chart
  const ownerData = pipelineData.services.reduce((acc, service) => {
    const existing = acc.find(item => item.name === service.owner);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: service.owner, value: 1 });
    }
    return acc;
  }, []);

  const betaOwnerData = betaTagPipelineData.services
    .filter(service => service.status !== 'Completed')
    .reduce((acc, service) => {
    const existing = acc.find(item => item.name === service.owner);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: service.owner, value: 1 });
    }
    return acc;
  }, []);

  const prodOwnerData = prodTagPipelineData.services
    .filter(service => service.status !== 'Completed')
    .reduce((acc, service) => {
    const existing = acc.find(item => item.name === service.owner);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: service.owner, value: 1 });
    }
    return acc;
  }, []);

  const k8sOwnerData = k8sPodData.services
    .filter(service => service.status !== 'Success')
    .reduce((acc, service) => {
    const existing = acc.find(item => item.name === service.owner);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: service.owner, value: 1 });
    }
    return acc;
  }, []);

  const preProdK8sOwnerData = preProdK8sPodData.services
    .filter(service => service.status !== 'Success')
    .reduce((acc, service) => {
    const existing = acc.find(item => item.name === service.owner);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: service.owner, value: 1 });
    }
    return acc;
  }, []);

  const releaseNotesOwnerData = releaseNotesData.workItems.reduce((acc, item) => {
    const existing = acc.find(owner => owner.name === item.owner);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: item.owner, value: 1 });
    }
    return acc;
  }, []);

  const unreleasedOwnerData = unreleasedChangesData.services.reduce((acc, service) => {
    const existing = acc.find(item => item.name === service.owner);
    if (existing) {
      existing.value += service.unreleasedPRCount;
    } else {
      acc.push({ name: service.owner, value: service.unreleasedPRCount });
    }
    return acc;
  }, []);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // Dialog state for logs
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState('');
  const [selectedServiceName, setSelectedServiceName] = useState('');

  // Dialog state for unreleased PRs
  const [prDialogOpen, setPrDialogOpen] = useState(false);
  const [selectedPRs, setSelectedPRs] = useState([]);
  const [selectedPRServiceName, setSelectedPRServiceName] = useState('');

  // Dialog state for breaking changes
  const [breakingChangesDialogOpen, setBreakingChangesDialogOpen] = useState(false);
  const [selectedBreakingChanges, setSelectedBreakingChanges] = useState([]);
  const [selectedBreakingChangeService, setSelectedBreakingChangeService] = useState('');
  const [selectedServiceApproved, setSelectedServiceApproved] = useState(false);

  // Dialog state for customer notification
  const [customerNotificationDialogOpen, setCustomerNotificationDialogOpen] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [notificationSent, setNotificationSent] = useState(false);

  // Mock customer data
  const customers = [
    { id: 1, name: 'Ziraat Katılım Bankası', email: 'tech@ziraatkatilimbank.com.tr', checked: true },
    { id: 6, name: 'Vakıf Katılım Bankası', email: 'tech@vakifbank.com.tr', checked: true },
    { id: 7, name: 'Halk Katılım Bankası', email: 'tech@halkkatilimbank.com.tr', checked: true },
    { id: 8, name: 'Emlak Katılım Bankası', email: 'tech@emlakkatilimbank.com.tr', checked: true },
  ];

  const handleOpenLogs = (serviceName, logs) => {
    setSelectedServiceName(serviceName);
    setSelectedLogs(logs);
    setLogDialogOpen(true);
  };

  const handleCloseLogs = () => {
    setLogDialogOpen(false);
    setSelectedLogs('');
    setSelectedServiceName('');
  };

  const handleOpenPRs = (serviceName, prs) => {
    setSelectedPRServiceName(serviceName);
    setSelectedPRs(prs);
    setPrDialogOpen(true);
  };

  const handleClosePRs = () => {
    setPrDialogOpen(false);
    setSelectedPRs([]);
    setSelectedPRServiceName('');
  };

  const handleOpenBreakingChanges = (serviceName, changes, approved) => {
    setSelectedBreakingChangeService(serviceName);
    setSelectedBreakingChanges(changes);
    setSelectedServiceApproved(approved);
    setBreakingChangesDialogOpen(true);
  };

  const handleCloseBreakingChanges = () => {
    setBreakingChangesDialogOpen(false);
    setSelectedBreakingChanges([]);
    setSelectedBreakingChangeService('');
    setSelectedServiceApproved(false);
  };

  const handleApproveBreakingChanges = () => {
    // Onaylama işlemi - gerçek uygulamada API çağrısı yapılır
    console.log(`Breaking changes approved for: ${selectedBreakingChangeService}`);
    handleCloseBreakingChanges();
  };

  const handleOpenCustomerNotification = () => {
    setSelectedCustomers(customers.map(c => c.id));
    setNotificationSent(false);
    setCustomerNotificationDialogOpen(true);
  };

  const handleCloseCustomerNotification = () => {
    setCustomerNotificationDialogOpen(false);
    setSelectedCustomers([]);
    setNotificationSent(false);
  };

  const handleCustomerToggle = (customerId) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleSendNotification = () => {
    // Gerçek uygulamada API çağrısı yapılır
    const selectedCustomersList = customers.filter(c => selectedCustomers.includes(c.id));
    console.log(`Sending notification to: ${selectedCustomersList.map(c => c.name).join(', ')}`);
    console.log(`Release version: ${currentRelease.version}`);
    setNotificationSent(true);
    
    // 2 saniye sonra dialog'u kapat
    setTimeout(() => {
      handleCloseCustomerNotification();
    }, 2000);
  };

  const getBreakingChangeSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  const getBreakingChangeTypeInfo = (type) => {
    switch (type) {
      case 'deleted-method':
        return { label: 'Silinen Method', icon: <RemoveIcon fontSize="small" /> };
      case 'http-method-changed':
        return { label: 'HTTP Method Değişti', icon: <EditIcon fontSize="small" /> };
      case 'parameter-removed':
        return { label: 'Parametre Silindi', icon: <RemoveIcon fontSize="small" /> };
      case 'property-type-changed':
        return { label: 'Property Tipi Değişti', icon: <EditIcon fontSize="small" /> };
      case 'column-deleted':
        return { label: 'Kolon Silindi', icon: <RemoveIcon fontSize="small" /> };
      case 'column-type-changed':
        return { label: 'Kolon Tipi Değişti', icon: <EditIcon fontSize="small" /> };
      case 'response-structure-changed':
        return { label: 'Response Yapısı Değişti', icon: <EditIcon fontSize="small" /> };
      case 'endpoint-renamed':
        return { label: 'Endpoint Yeniden Adlandırıldı', icon: <EditIcon fontSize="small" /> };
      case 'required-field-added':
        return { label: 'Zorunlu Alan Eklendi', icon: <AddIcon fontSize="small" /> };
      case 'authentication-required':
        return { label: 'Authentication Gerekli', icon: <AuthIcon fontSize="small" /> };
      case 'validation-rule-changed':
        return { label: 'Validation Kuralı Değişti', icon: <EditIcon fontSize="small" /> };
      case 'query-parameter-renamed':
        return { label: 'Query Parametresi Yeniden Adlandırıldı', icon: <EditIcon fontSize="small" /> };
      default:
        return { label: type, icon: <EditIcon fontSize="small" /> };
    }
  };

  const getProgressColor = (rate) => {
    if (rate === 100) return 'success';
    if (rate >= 50) return 'warning';
    return 'error';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'success';
      case 'InProgress': return 'warning';
      case 'Failed': return 'error';
      default: return 'default';
    }
  };

  const getPodStatusColor = (status) => {
    switch (status) {
      case 'Success': return 'success';
      case 'NotDeployed': return 'warning';
      case 'Failed': return 'error';
      default: return 'default';
    }
  };

  const getAiStatusInfo = (aiStatus) => {
    switch (aiStatus) {
      case 'analyzing':
        return { 
          color: 'info', 
          icon: <AiIcon fontSize="small" />, 
          label: 'AI Analiz Ediyor' 
        };
      case 'manual-required':
        return { 
          color: 'warning', 
          icon: <ManualIcon fontSize="small" />, 
          label: 'Manuel' 
        };
      case 'fixing':
        return { 
          color: 'info', 
          icon: <FixingIcon fontSize="small" />, 
          label: 'AI Düzeltiyor' 
        };
      case 'pr-created':
        return { 
          color: 'secondary', 
          icon: <PrIcon fontSize="small" />, 
          label: 'PR Bekliyor' 
        };
      case 'pr-approved':
        return { 
          color: 'success', 
          icon: <RetryIcon fontSize="small" />, 
          label: 'Yeniden Tetikleniyor' 
        };
      default:
        return { color: 'default', icon: null, label: '-' };
    }
  };

  const getIssueTypeInfo = (issueType) => {
    switch (issueType) {
      case 'empty-fields':
        return { 
          label: 'Boş Alan', 
          description: 'Title veya Description boş',
          color: 'error'
        };
      case 'version-mismatch':
        return { 
          label: 'Versiyon Uyumsuz', 
          description: 'Jira ve Azure versiyonları farklı',
          color: 'error'
        };
      case 'status-issue':
        return { 
          label: 'Durum Sorunu', 
          description: 'Test statusüne gelmemiş',
          color: 'warning'
        };
      case 'jira-dont-need':
        return { 
          label: 'Jira İşaretli', 
          description: 'Jirası var ama "Don\'t Need" işaretli',
          color: 'warning'
        };
      default:
        return { label: '-', description: '', color: 'default' };
    }
  };

  const getReleaseNoteAiStatus = (aiStatus) => {
    switch (aiStatus) {
      case 'analyzing':
        return { 
          label: 'AI Analiz Ediyor',
          color: 'info',
          icon: <AiIcon fontSize="small" />
        };
      case 'generating':
        return { 
          label: 'AI Üretiyor',
          color: 'info',
          icon: <FixingIcon fontSize="small" />
        };
      default:
        return { label: '-', color: 'default', icon: null };
    }
  };

  // Versiyon değiştiğinde release bilgisini güncelle
  const handleVersionChange = (event) => {
    const version = event.target.value;
    setSelectedVersion(version);
    setCurrentRelease(releases.find(r => r.version === version));
  };

  // Sonraki adıma geç
  const handleNextStep = () => {
    if (currentRelease.currentStep < steps.length) {
      const updatedRelease = {
        ...currentRelease,
        currentStep: currentRelease.currentStep + 1
      };
      setCurrentRelease(updatedRelease);
    }
  };

  // İlerleme yüzdesi
  const progressPercentage = (currentRelease.currentStep / steps.length) * 100;

  // Status bilgisi
  const getStatusInfo = (status) => {
    switch (status) {
      case 'InProgress':
        return { color: 'primary', label: 'Geliştiriliyor' };
      case 'Testing':
        return { color: 'warning', label: 'Test Ediliyor' };
      case 'Published':
        return { color: 'success', label: 'Yayınlandı' };
      default:
        return { color: 'default', label: status };
    }
  };

  const statusInfo = getStatusInfo(currentRelease.status);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
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
                Release Health Check
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Release hazırlık aşamalarını takip edin
              </Typography>
            </Box>
          </Box>
          <HealthIcon sx={{ fontSize: 64, color: 'primary.main', opacity: 0.7 }} />
        </Box>

        {/* Versiyon Seçimi ve Sonraki Adım Butonu */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl size="medium" sx={{ minWidth: 200 }}>
            <InputLabel>Versiyon Seç</InputLabel>
            <Select
              value={selectedVersion}
              label="Versiyon Seç"
              onChange={handleVersionChange}
            >
              {releases.map(release => (
                <MenuItem key={release.id} value={release.version}>
                  {release.version}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Chip 
            label={statusInfo.label}
            color={statusInfo.color}
            variant="filled"
            sx={{ fontWeight: 'bold' }}
          />

          <Chip 
            label={`${currentRelease.currentStep} / ${steps.length} Adım Tamamlandı`}
            color="primary"
            variant="outlined"
          />

          <Button
            variant="contained"
            color="primary"
            endIcon={<ArrowForwardIcon />}
            onClick={handleNextStep}
            disabled={currentRelease.currentStep >= steps.length}
          >
            Sonraki Adıma Geç
          </Button>
        </Box>
      </Paper>

      {/* Progress Overview */}
      <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="h6" fontWeight="bold">
              Release Hazırlık İlerlemesi
            </Typography>
            <Typography variant="h6" fontWeight="bold" color="primary.main">
              {progressPercentage.toFixed(0)}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={progressPercentage} 
            sx={{ height: 10, borderRadius: 5 }}
          />
        </Box>

        {/* Release Info Cards */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Versiyon
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {currentRelease.version}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Başlangıç Tarihi
                </Typography>
                <Typography variant="h6" fontWeight="bold">
                  {new Date(currentRelease.startDate).toLocaleDateString('tr-TR')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Release Tarihi
                </Typography>
                <Typography variant="h6" fontWeight="bold" color="primary.main">
                  {new Date(currentRelease.releaseDate).toLocaleDateString('tr-TR')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Release Preparation Progress Bar */}
      <Paper elevation={3} sx={{ p: 4, mt: 3, borderRadius: 2 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
          Release Hazırlık Adımları
        </Typography>
        
        <Stepper 
          activeStep={currentRelease.currentStep} 
          alternativeLabel
          connector={<CustomConnector />}
        >
          {steps.map((step, index) => (
            <Step key={step.label} completed={index < currentRelease.currentStep}>
              <StepLabel
                StepIconComponent={CustomStepIcon}
                sx={{
                  '& .MuiStepLabel-label': {
                    fontSize: '0.875rem',
                    fontWeight: index < currentRelease.currentStep ? 'bold' : 'normal',
                  },
                }}
              >
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: index < currentRelease.currentStep ? 'bold' : 'normal',
                    color: index < currentRelease.currentStep ? 'success.main' : 'text.primary'
                  }}
                >
                  {step.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {step.description}
                </Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Completion Message */}
        {currentRelease.currentStep >= steps.length && (
          <Paper elevation={3} sx={{ mt: 4, p: 4, textAlign: 'center', bgcolor: 'success.lighter', borderRadius: 2 }}>
            <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main' }} />
            <Typography variant="h5" fontWeight="bold" color="success.main" sx={{ mt: 2 }}>
              Tüm Adımlar Tamamlandı!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
              {currentRelease.version} versiyonu yayına hazır.
            </Typography>

            <Divider sx={{ my: 3 }} />

            {/* Update Release Note Status Info */}
            <Box sx={{ textAlign: 'left', bgcolor: 'background.paper', p: 3, borderRadius: 2, mb: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                ✅ Update Release Note Status Tamamlandı
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Son adımda aşağıdaki işlemler otomatik olarak gerçekleştirildi:
              </Typography>
              <Box component="ul" sx={{ pl: 2, m: 0 }}>
                <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  • Azure DevOps üzerinde bu release ile tamamlanmış <strong>tüm work item'lar</strong> "Done" statusüne çekildi
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  • Azure work item'larına bağlı <strong>tüm Jira kayıtları</strong> "Done" statusüne çekildi
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  • Release notları güncellenip yayın için hazırlandı
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  • Tüm deployment bilgileri loglandı ve arşivlendi
                </Typography>
              </Box>
            </Box>

            {/* Customer Notification Button */}
            <Button
              variant="contained"
              size="large"
              color="primary"
              onClick={handleOpenCustomerNotification}
              sx={{ 
                minWidth: 250,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 'bold',
                boxShadow: 3
              }}
            >
              📧 Müşterileri Bilgilendir
            </Button>
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
              Bankaları {currentRelease.version} yayını hakkında bilgilendir
            </Typography>
          </Paper>
        )}
      </Paper>

      {/* Pipeline Status Card */}
      <Paper elevation={3} sx={{ mt: 3, borderRadius: 2, overflow: 'hidden' }}>
        <Accordion>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{ 
              bgcolor: 'background.paper',
              borderBottom: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                Release Branch Pipeline Durumu
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Başarı Oranı: {successRate}%
                </Typography>
                <Box sx={{ width: 200 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={successRate} 
                    color={getProgressColor(parseInt(successRate))}
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                </Box>
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 3 }}>
            {/* Description */}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Bu kart, release branch'ları oluşturulduktan sonra tetiklenen pipeline'ların durumunu gösterir. 
              Her servis için pipeline çalıştırılır ve sonuçları burada takip edilir. 
              Hata alan pipeline'lar için sorumlular belirlenir ve iyileştirme çalışmaları takip edilir.
            </Typography>

            <Grid container spacing={3}>
              {/* Left: Chart */}
              <Grid item xs={12} md={8}>
                <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Sorumlulara Göre Hata Dağılımı
                  </Typography>
                  <ResponsiveContainer width="100%" height={380}>
                    <PieChart>
                      <Pie
                        data={ownerData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {ownerData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>

              {/* Right: Table */}
              <Grid item xs={12} md={4}>
                <Paper variant="outlined">
                  <TableContainer sx={{ maxHeight: 400 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Servis</strong></TableCell>
                          <TableCell><strong>Sorumlu</strong></TableCell>
                          <TableCell><strong>Durum</strong></TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <strong>AI Müdahale Durumu</strong>
                              <Tooltip 
                                title={
                                  <Box>
                                    <Typography variant="body2" fontWeight="bold" gutterBottom>
                                      AI Agent Kontrol Maddeleri:
                                    </Typography>
                                    <Typography variant="caption" component="div">
                                      • {'{'} or {'}'} expected<br/>
                                      • The name 'xyz' does not exist in the current context<br/>
                                      • Type expected<br/>
                                      • Cannot implicitly convert type 'X' to 'Y'<br/>
                                      • Unclosed string literal<br/>
                                      • Unexpected character<br/>
                                      • Invalid expression term<br/>
                                      • Not all code paths return a value<br/>
                                      • CS1002: ; expected
                                    </Typography>
                                  </Box>
                                }
                                arrow
                                placement="top"
                              >
                                <IconButton size="small" sx={{ p: 0 }}>
                                  <InfoIcon fontSize="small" color="action" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                          <TableCell align="center"><strong>Aksiyonlar</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pipelineData.services.map((service, index) => {
                          const aiInfo = getAiStatusInfo(service.aiStatus);
                          return (
                            <TableRow key={index}>
                              <TableCell>{service.name}</TableCell>
                              <TableCell>{service.owner}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={service.status} 
                                  size="small" 
                                  color={getStatusColor(service.status)}
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  icon={aiInfo.icon}
                                  label={aiInfo.label} 
                                  size="small" 
                                  color={aiInfo.color}
                                  variant="outlined"
                                />
                                {service.aiMessage && (
                                  <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                                    {service.aiMessage}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell align="center">
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<PipelineIcon />}
                                    onClick={() => window.open(service.pipelineUrl, '_blank')}
                                    sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                  >
                                    Pipeline
                                  </Button>
                                  {service.prUrl && (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="secondary"
                                      startIcon={<PrIcon />}
                                      onClick={() => window.open(service.prUrl, '_blank')}
                                      sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                    >
                                      PR
                                    </Button>
                                  )}
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>
            </Grid>

            {/* Summary Stats */}
            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Chip 
                label={`Toplam: ${pipelineData.totalServices}`} 
                color="default" 
                variant="outlined"
              />
              <Chip 
                label={`Başarılı: ${pipelineData.completedServices}`} 
                color="success" 
                variant="outlined"
              />
              <Chip 
                label={`Devam Eden: ${pipelineData.inProgressServices}`} 
                color="warning" 
                variant="outlined"
              />
              <Chip 
                label={`Hatalı: ${pipelineData.failedServices}`} 
                color="error" 
                variant="outlined"
              />
            </Box>
          </AccordionDetails>
        </Accordion>
      </Paper>

      {/* Beta Tag Pipeline Status Card - Only show if Create Beta Tag step is completed */}
      {currentRelease.currentStep >= 2 && (
        <Paper elevation={3} sx={{ mt: 3, borderRadius: 2, overflow: 'hidden' }}>
          <Accordion>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{ 
                bgcolor: 'background.paper',
                borderBottom: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                Beta Tag Pipeline Durumu
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Başarı Oranı: {betaSuccessRate}%
                </Typography>
                <Box sx={{ width: 200 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={betaSuccessRate} 
                    color={getProgressColor(parseInt(betaSuccessRate))}
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                </Box>
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 3 }}>
            {/* Description */}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Bu kart, Beta Tag oluşturulduktan sonra tetiklenen pipeline'ların durumunu gösterir. 
              Her servis için pipeline çalıştırılır ve sonuçları burada takip edilir. 
              Hata alan pipeline'lar için sorumlular belirlenir ve iyileştirme çalışmaları takip edilir.
            </Typography>

            <Grid container spacing={3}>
              {/* Left: Chart */}
              <Grid item xs={12} md={8}>
                <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Sorumlulara Göre Hata Dağılımı
                  </Typography>
                  <ResponsiveContainer width="100%" height={380}>
                    <PieChart>
                      <Pie
                        data={betaOwnerData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {betaOwnerData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>

              {/* Right: Table */}
              <Grid item xs={12} md={4}>
                <Paper variant="outlined">
                  <TableContainer sx={{ maxHeight: 400 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Servis</strong></TableCell>
                          <TableCell><strong>Sorumlu</strong></TableCell>
                          <TableCell><strong>Durum</strong></TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <strong>AI Müdahale Durumu</strong>
                              <Tooltip 
                                title={
                                  <Box>
                                    <Typography variant="body2" fontWeight="bold" gutterBottom>
                                      AI Agent Kontrol Maddeleri:
                                    </Typography>
                                    <Typography variant="caption" component="div">
                                      • {'{'} or {'}'} expected<br/>
                                      • The name 'xyz' does not exist in the current context<br/>
                                      • Type expected<br/>
                                      • Cannot implicitly convert type 'X' to 'Y'<br/>
                                      • Unclosed string literal<br/>
                                      • Unexpected character<br/>
                                      • Invalid expression term<br/>
                                      • Not all code paths return a value<br/>
                                      • CS1002: ; expected
                                    </Typography>
                                  </Box>
                                }
                                arrow
                                placement="top"
                              >
                                <IconButton size="small" sx={{ p: 0 }}>
                                  <InfoIcon fontSize="small" color="action" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                          <TableCell align="center"><strong>Aksiyonlar</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {betaTagPipelineData.services
                          .filter(service => service.status !== 'Completed')
                          .map((service, index) => {
                          const aiInfo = getAiStatusInfo(service.aiStatus);
                          return (
                            <TableRow key={index}>
                              <TableCell>{service.name}</TableCell>
                              <TableCell>{service.owner}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={service.status} 
                                  size="small" 
                                  color={getStatusColor(service.status)}
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell>
                                {service.aiStatus ? (
                                  <>
                                    <Chip 
                                      icon={aiInfo.icon}
                                      label={aiInfo.label} 
                                      size="small" 
                                      color={aiInfo.color}
                                      variant="outlined"
                                    />
                                    {service.aiMessage && (
                                      <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                                        {service.aiMessage}
                                      </Typography>
                                    )}
                                  </>
                                ) : (
                                  <Chip 
                                    label="-" 
                                    size="small" 
                                    variant="outlined"
                                  />
                                )}
                              </TableCell>
                              <TableCell align="center">
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<PipelineIcon />}
                                    onClick={() => window.open(service.pipelineUrl, '_blank')}
                                    sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                  >
                                    Pipeline
                                  </Button>
                                  {service.prUrl && (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="secondary"
                                      startIcon={<PrIcon />}
                                      onClick={() => window.open(service.prUrl, '_blank')}
                                      sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                    >
                                      PR
                                    </Button>
                                  )}
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>
            </Grid>

            {/* Summary Stats */}
            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Chip 
                label={`Toplam: ${betaTagPipelineData.totalServices}`} 
                color="default" 
                variant="outlined"
              />
              <Chip 
                label={`Başarılı: ${betaTagPipelineData.completedServices}`} 
                color="success" 
                variant="outlined"
              />
              <Chip 
                label={`Devam Eden: ${betaTagPipelineData.inProgressServices}`} 
                color="warning" 
                variant="outlined"
              />
              <Chip 
                label={`Hatalı: ${betaTagPipelineData.failedServices}`} 
                color="error" 
                variant="outlined"
              />
            </Box>
          </AccordionDetails>
        </Accordion>
        </Paper>
      )}

      {/* K8s Test Pod Status Card - Only show if Deploy to Test step is completed */}
      {currentRelease.currentStep >= 3 && (
        <Paper elevation={3} sx={{ mt: 3, borderRadius: 2, overflow: 'hidden' }}>
          <Accordion>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{ 
                bgcolor: 'background.paper',
                borderBottom: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                  Test Ortamı Pod Durumu
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Başarı Oranı: {k8sSuccessRate}%
                  </Typography>
                  <Box sx={{ width: 200 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={k8sSuccessRate} 
                      color={getProgressColor(parseInt(k8sSuccessRate))}
                      sx={{ height: 8, borderRadius: 1 }}
                    />
                  </Box>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 3 }}>
              {/* Description */}
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Bu kart, Test ortamına deploy edildikten sonra Kubernetes pod'larının durumunu gösterir. 
                Her servis için pod durumu kontrol edilir ve hedef versiyonla karşılaştırılır. 
                Hata alan pod'ların logları kaydedilir ve sorumlular belirlenir.
              </Typography>

              <Grid container spacing={3}>
                {/* Left: Chart */}
                <Grid item xs={12} md={8}>
                  <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Sorumlulara Göre Hata Dağılımı
                    </Typography>
                    <ResponsiveContainer width="100%" height={380}>
                      <PieChart>
                        <Pie
                          data={k8sOwnerData}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {k8sOwnerData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>

                {/* Right: Table */}
                <Grid item xs={12} md={4}>
                  <Paper variant="outlined">
                    <TableContainer sx={{ maxHeight: 400 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Servis</strong></TableCell>
                            <TableCell><strong>Sorumlu</strong></TableCell>
                            <TableCell><strong>Versiyon</strong></TableCell>
                            <TableCell><strong>Pod Durumu</strong></TableCell>
                            <TableCell align="center"><strong>Aksiyonlar</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {k8sPodData.services
                            .filter(service => service.status !== 'Success')
                            .map((service, index) => (
                            <TableRow key={index}>
                              <TableCell>{service.name}</TableCell>
                              <TableCell>{service.owner}</TableCell>
                              <TableCell>
                                <Typography variant="caption" display="block">
                                  Hedef: {service.targetVersion}
                                </Typography>
                                <Typography variant="caption" display="block" color={service.currentVersion === service.targetVersion ? 'success.main' : 'warning.main'}>
                                  Mevcut: {service.currentVersion}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={service.status} 
                                  size="small" 
                                  color={getPodStatusColor(service.status)}
                                  variant="outlined"
                                  icon={<PodIcon fontSize="small" />}
                                />
                              </TableCell>
                              <TableCell align="center">
                                {service.logs && (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="error"
                                    startIcon={<LogIcon />}
                                    onClick={() => handleOpenLogs(service.name, service.logs)}
                                    sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                  >
                                    Loglar
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Grid>
              </Grid>

              {/* Summary Stats */}
              <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Chip 
                  label={`Toplam: ${k8sPodData.totalServices}`} 
                  color="default" 
                  variant="outlined"
                />
                <Chip 
                  label={`Başarılı: ${k8sPodData.successServices}`} 
                  color="success" 
                  variant="outlined"
                />
                <Chip 
                  label={`Deploy Edilmedi: ${k8sPodData.notDeployedServices}`} 
                  color="warning" 
                  variant="outlined"
                />
                <Chip 
                  label={`Hatalı: ${k8sPodData.failedServices}`} 
                  color="error" 
                  variant="outlined"
                />
              </Box>
            </AccordionDetails>
          </Accordion>
        </Paper>
      )}

      {/* Release Notes Validation Card - Only show if Generate Release Notes step is completed */}
      {currentRelease.currentStep >= 4 && (
        <Paper elevation={3} sx={{ mt: 3, borderRadius: 2, overflow: 'hidden' }}>
          <Accordion>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{ 
                bgcolor: 'background.paper',
                borderBottom: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                  Release Notes Kontrol Durumu
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Başarı Oranı: {releaseNotesSuccessRate}%
                  </Typography>
                  <Box sx={{ width: 200 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={releaseNotesSuccessRate} 
                      color={getProgressColor(parseInt(releaseNotesSuccessRate))}
                      sx={{ height: 8, borderRadius: 1 }}
                    />
                  </Box>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 3 }}>
              {/* Description */}
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Bu kart, Release Notes oluşturulduktan sonra work itemların kontrol durumunu gösterir. 
                Title/Description boşlukları, Jira-Azure versiyon uyumsuzlukları, durum sorunları ve yapılandırma hataları tespit edilir.
                AI agent boş alanları otomatik olarak PR analizleriyle doldurur.
              </Typography>

              <Grid container spacing={3}>
                {/* Left: Chart */}
                <Grid item xs={12} md={8}>
                  <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Sorumlulara Göre Sorun Dağılımı
                    </Typography>
                    <ResponsiveContainer width="100%" height={380}>
                      <PieChart>
                        <Pie
                          data={releaseNotesOwnerData}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {releaseNotesOwnerData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>

                {/* Right: Table */}
                <Grid item xs={12} md={4}>
                  <Paper variant="outlined">
                    <TableContainer sx={{ maxHeight: 400 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Work Item</strong></TableCell>
                            <TableCell><strong>Servis</strong></TableCell>
                            <TableCell><strong>Sorumlu</strong></TableCell>
                            <TableCell><strong>Sorun Tipi</strong></TableCell>
                            <TableCell><strong>AI Durumu</strong></TableCell>
                            <TableCell align="center"><strong>Detay</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {releaseNotesData.workItems.map((item, index) => {
                            const issueInfo = getIssueTypeInfo(item.issueType);
                            const aiInfo = getReleaseNoteAiStatus(item.aiStatus);
                            return (
                              <TableRow key={index}>
                                <TableCell>
                                  <Typography variant="caption" fontWeight="bold">
                                    {item.id}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="caption">
                                    {item.service}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="caption">
                                    {item.owner}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip 
                                    label={issueInfo.label} 
                                    size="small" 
                                    color={issueInfo.color}
                                    variant="outlined"
                                  />
                                  <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                                    {issueInfo.description}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  {item.aiStatus ? (
                                    <Chip 
                                      icon={aiInfo.icon}
                                      label={aiInfo.label} 
                                      size="small" 
                                      color={aiInfo.color}
                                      variant="outlined"
                                    />
                                  ) : (
                                    <Chip 
                                      label="-" 
                                      size="small" 
                                      variant="outlined"
                                    />
                                  )}
                                </TableCell>
                                <TableCell align="center">
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => window.open(item.workItemLink, '_blank')}
                                    sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                  >
                                    Aç
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Grid>
              </Grid>

              {/* Summary Stats */}
              <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Chip 
                  label={`Toplam WI: ${releaseNotesData.totalWorkItems}`} 
                  color="default" 
                  variant="outlined"
                />
                <Chip 
                  label={`Sorunlu: ${releaseNotesData.issuesCount}`} 
                  color="error" 
                  variant="outlined"
                />
                <Chip 
                  label={`Boş Alan: ${releaseNotesData.workItems.filter(w => w.issueType === 'empty-fields').length}`} 
                  color="error" 
                  variant="outlined"
                />
                <Chip 
                  label={`Versiyon Uyumsuz: ${releaseNotesData.workItems.filter(w => w.issueType === 'version-mismatch').length}`} 
                  color="error" 
                  variant="outlined"
                />
                <Chip 
                  label={`Durum Sorunu: ${releaseNotesData.workItems.filter(w => w.issueType === 'status-issue').length}`} 
                  color="warning" 
                  variant="outlined"
                />
                <Chip 
                  label={`Jira İşaretli: ${releaseNotesData.workItems.filter(w => w.issueType === 'jira-dont-need').length}`} 
                  color="warning" 
                  variant="outlined"
                />
              </Box>
            </AccordionDetails>
          </Accordion>
        </Paper>
      )}

      {/* Unreleased Changes Audit Card - Only show if Unreleased Changes Audit step is completed */}
      {currentRelease.currentStep >= 5 && (
        <Paper elevation={3} sx={{ mt: 3, borderRadius: 2, overflow: 'hidden' }}>
          <Accordion>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{ 
                bgcolor: 'background.paper',
                borderBottom: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                  Yayınlanmamış Değişiklikler Denetimi
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Temiz Servis Oranı: {unreleasedSuccessRate}%
                  </Typography>
                  <Box sx={{ width: 200 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={unreleasedSuccessRate} 
                      color={getProgressColor(parseInt(unreleasedSuccessRate))}
                      sx={{ height: 8, borderRadius: 1 }}
                    />
                  </Box>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 3 }}>
              {/* Description */}
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Bu kart, PR'ı merge edilmiş ancak henüz tag alınmadığı için ortama yansıtılmamış servisleri listeler. 
                Her servis için yayınlanmamış PR sayısı ve bu PR'ların detayları gösterilir. 
                Tag alınmadan önce bekleyen değişikliklerin kontrolü yapılır.
              </Typography>

              <Grid container spacing={3}>
                {/* Left: Chart */}
                <Grid item xs={12} md={8}>
                  <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Sorumlulara Göre Yayınlanmamış PR Dağılımı
                    </Typography>
                    <ResponsiveContainer width="100%" height={400}>
                      <PieChart>
                        <Pie
                          data={unreleasedOwnerData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {unreleasedOwnerData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>

                {/* Right: Table */}
                <Grid item xs={12} md={4}>
                  <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 460 }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><Typography variant="caption" fontWeight="bold">Servis</Typography></TableCell>
                          <TableCell><Typography variant="caption" fontWeight="bold">Sorumlu</Typography></TableCell>
                          <TableCell align="center"><Typography variant="caption" fontWeight="bold">PR Sayısı</Typography></TableCell>
                          <TableCell align="center"><Typography variant="caption" fontWeight="bold">Aksiyon</Typography></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {unreleasedChangesData.services.map((service, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Typography variant="caption">
                                {service.name}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption">
                                {service.owner}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip 
                                label={service.unreleasedPRCount} 
                                size="small" 
                                color="warning"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<PrIcon />}
                                onClick={() => handleOpenPRs(service.name, service.prs)}
                                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                              >
                                PR Listesi
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </Grid>

              {/* Summary Stats */}
              <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Chip 
                  label={`Toplam Servis: ${unreleasedChangesData.totalServices}`} 
                  color="default" 
                  variant="outlined"
                />
                <Chip 
                  label={`Bekleyen PR'ı Olan: ${unreleasedChangesData.servicesWithUnreleasedPRs}`} 
                  color="warning" 
                  variant="outlined"
                />
                <Chip 
                  label={`Toplam PR: ${unreleasedChangesData.totalUnreleasedPRs}`} 
                  color="info" 
                  variant="outlined"
                />
                <Chip 
                  label={`Temiz Servis: ${unreleasedChangesData.totalServices - unreleasedChangesData.servicesWithUnreleasedPRs}`} 
                  color="success" 
                  variant="outlined"
                />
              </Box>
            </AccordionDetails>
          </Accordion>
        </Paper>
      )}

      {/* Generate Changes Card - Only show if Generate Changes step is completed */}
      {currentRelease.currentStep >= 7 && (
        <Paper elevation={3} sx={{ mt: 3, borderRadius: 2, overflow: 'hidden' }}>
          <Accordion>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{ 
                bgcolor: 'background.paper',
                borderBottom: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                  Değişiklik Analizi ve Breaking Change Kontrolü
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Onay Oranı: {generateChangesSuccessRate}%
                  </Typography>
                  <Box sx={{ width: 200 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={generateChangesSuccessRate} 
                      color={getProgressColor(parseInt(generateChangesSuccessRate))}
                      sx={{ height: 8, borderRadius: 1 }}
                    />
                  </Box>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 3 }}>
              {/* Description */}
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Bu kart, Test ve PreProd ortamları karşılaştırılarak oluşturulan değişiklikleri ve AI tarafından 
                tespit edilen breaking change'leri gösterir. Her servis için değişen tablo sayısı, breaking change 
                sayısı ve onay durumu listelenir. Breaking change'lar servis sahibi tarafından onaylanmalıdır.
              </Typography>

              {/* Top Summary Cards */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={3}>
                  <Paper 
                    elevation={2} 
                    sx={{ 
                      p: 2, 
                      textAlign: 'center',
                      bgcolor: 'primary.light',
                      color: 'primary.contrastText'
                    }}
                  >
                    <Typography variant="h4" fontWeight="bold">
                      {generateChangesData.totalChangedTables}
                    </Typography>
                    <Typography variant="body2">
                      Değişen Tablo
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Paper 
                    elevation={2} 
                    sx={{ 
                      p: 2, 
                      textAlign: 'center',
                      bgcolor: 'info.light',
                      color: 'info.contrastText'
                    }}
                  >
                    <Typography variant="h4" fontWeight="bold">
                      {generateChangesData.totalChangedServices}
                    </Typography>
                    <Typography variant="body2">
                      Değişen Servis
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Paper 
                    elevation={2} 
                    sx={{ 
                      p: 2, 
                      textAlign: 'center',
                      bgcolor: 'warning.light',
                      color: 'warning.contrastText'
                    }}
                  >
                    <Typography variant="h4" fontWeight="bold">
                      {generateChangesData.breakingChangesDetected}
                    </Typography>
                    <Typography variant="body2">
                      Breaking Change
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Paper 
                    elevation={2} 
                    sx={{ 
                      p: 2, 
                      textAlign: 'center',
                      bgcolor: generateChangesData.breakingChangesPending > 0 ? 'error.light' : 'success.light',
                      color: generateChangesData.breakingChangesPending > 0 ? 'error.contrastText' : 'success.contrastText'
                    }}
                  >
                    <Typography variant="h4" fontWeight="bold">
                      {generateChangesData.breakingChangesPending}
                    </Typography>
                    <Typography variant="body2">
                      Onay Bekleyen
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Services Table */}
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><Typography variant="caption" fontWeight="bold">Servis</Typography></TableCell>
                      <TableCell><Typography variant="caption" fontWeight="bold">Sorumlu</Typography></TableCell>
                      <TableCell align="center"><Typography variant="caption" fontWeight="bold">Değişen Tablo</Typography></TableCell>
                      <TableCell align="center"><Typography variant="caption" fontWeight="bold">Breaking Change</Typography></TableCell>
                      <TableCell align="center"><Typography variant="caption" fontWeight="bold">Onay Durumu</Typography></TableCell>
                      <TableCell align="center"><Typography variant="caption" fontWeight="bold">Aksiyon</Typography></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {generateChangesData.services.map((service, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="caption">
                            {service.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {service.owner}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={service.changedTables} 
                            size="small" 
                            color="info"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={service.breakingChanges} 
                            size="small" 
                            color={service.breakingChanges > 0 ? 'warning' : 'default'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          {service.breakingChanges > 0 ? (
                            <Chip 
                              icon={service.approved ? <ApprovalIcon /> : <ManualIcon />}
                              label={service.approved ? 'Onaylandı' : 'Bekliyor'} 
                              size="small" 
                              color={service.approved ? 'success' : 'warning'}
                              variant="outlined"
                            />
                          ) : (
                            <Chip 
                              label="-" 
                              size="small" 
                              variant="outlined"
                            />
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<HistoryIcon />}
                              onClick={() => navigate('/change-tracking')}
                              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                            >
                              Değişiklikleri Gör
                            </Button>
                            {service.breakingChanges > 0 && (
                              <Button
                                size="small"
                                variant="outlined"
                                color={service.approved ? 'success' : 'warning'}
                                startIcon={<ManualIcon />}
                                onClick={() => handleOpenBreakingChanges(service.name, service.changes, service.approved)}
                                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                              >
                                Breaking Change
                              </Button>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* AI Analysis Info */}
              <Paper 
                elevation={1} 
                sx={{ 
                  mt: 3, 
                  p: 2, 
                  bgcolor: 'info.lighter',
                  borderLeft: '4px solid',
                  borderColor: 'info.main'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <AiIcon sx={{ color: 'info.main', mt: 0.5 }} />
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold" color="info.dark" gutterBottom>
                      AI Breaking Change Analizi
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      AI, tüm merge edilmiş PR'ları otomatik olarak analiz ederek potansiyel breaking change'leri tespit eder. 
                      Silinen methodlar, değişen HTTP method tipleri, silinmiş/tipi değişen kolonlar, property tip değişiklikleri, 
                      endpoint yeniden adlandırmaları, response yapı değişiklikleri gibi değişiklikler otomatik olarak belirlenir ve 
                      etki analizi yapılır. Her breaking change için AI, değişikliğin etkisini ve önerilerini sunar.
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              {/* Summary Stats */}
              <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Chip 
                  label={`Onaylanan: ${generateChangesData.breakingChangesApproved}`} 
                  color="success" 
                  variant="outlined"
                />
                <Chip 
                  label={`Bekleyen: ${generateChangesData.breakingChangesPending}`} 
                  color="warning" 
                  variant="outlined"
                />
                <Chip 
                  label={`Test → PreProd Karşılaştırması Tamamlandı`} 
                  color="info" 
                  variant="outlined"
                />
              </Box>
            </AccordionDetails>
          </Accordion>
        </Paper>
      )}

      {/* Prod Tag Pipeline Status Card - Only show if Create Prod Tag step is completed */}
      {currentRelease.currentStep >= 8 && (
        <Paper elevation={3} sx={{ mt: 3, borderRadius: 2, overflow: 'hidden' }}>
        <Accordion>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{ 
              bgcolor: 'background.paper',
              borderBottom: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                Rc Tag Pipeline Durumu
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Başarı Oranı: {prodSuccessRate}%
                </Typography>
                <Box sx={{ width: 200 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={prodSuccessRate} 
                    color={getProgressColor(parseInt(prodSuccessRate))}
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                </Box>
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 3 }}>
            {/* Description */}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Bu kart, Rc tag oluşturulduktan sonra tetiklenen pipeline'ların durumunu gösterir. 
              Her servis için pipeline durumu, AI agent durumu ve ilgili linkler listelenir. 
              Hata durumunda AI agent otomatik olarak sorunu analiz eder ve gerektiğinde kodu düzeltir.
            </Typography>

            <Grid container spacing={3}>
              {/* Left: Chart */}
              <Grid item xs={12} md={8}>
                <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Sorumlulara Göre Servis Dağılımı
                  </Typography>
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={prodOwnerData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {prodOwnerData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>

              {/* Right: Table */}
              <Grid item xs={12} md={4}>
                <Paper variant="outlined" sx={{ maxHeight: 460, overflow: 'auto' }}>
                  <TableContainer>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><Typography variant="caption" fontWeight="bold">Servis</Typography></TableCell>
                          <TableCell><Typography variant="caption" fontWeight="bold">Sorumlu</Typography></TableCell>
                          <TableCell><Typography variant="caption" fontWeight="bold">Durum</Typography></TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography variant="caption" fontWeight="bold">AI Müdahale Durumu</Typography>
                              <Tooltip 
                                title={
                                  <Box>
                                    <Typography variant="body2" fontWeight="bold" gutterBottom>
                                      AI Agent Kontrol Maddeleri:
                                    </Typography>
                                    <Typography variant="caption" component="div">
                                      • {'{'} or {'}'} expected<br/>
                                      • The name 'xyz' does not exist in the current context<br/>
                                      • Type expected<br/>
                                      • Cannot implicitly convert type 'X' to 'Y'<br/>
                                      • Unclosed string literal<br/>
                                      • Unexpected character<br/>
                                      • Invalid expression term<br/>
                                      • Not all code paths return a value<br/>
                                      • CS1002: ; expected
                                    </Typography>
                                  </Box>
                                }
                                arrow
                                placement="top"
                              >
                                <IconButton size="small" sx={{ p: 0 }}>
                                  <InfoIcon fontSize="small" color="action" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                          <TableCell align="center"><Typography variant="caption" fontWeight="bold">Aksiyonlar</Typography></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {prodTagPipelineData.services
                          .filter(service => service.status !== 'Completed')
                          .map((service, index) => {
                          const aiInfo = getAiStatusInfo(service.aiStatus);
                          return (
                            <TableRow key={index}>
                              <TableCell>{service.name}</TableCell>
                              <TableCell>{service.owner}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={service.status} 
                                  size="small" 
                                  color={getStatusColor(service.status)}
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell>
                                {service.aiStatus ? (
                                  <>
                                    <Chip 
                                      icon={aiInfo.icon}
                                      label={aiInfo.label} 
                                      size="small" 
                                      color={aiInfo.color}
                                      variant="outlined"
                                    />
                                    {service.aiMessage && (
                                      <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                                        {service.aiMessage}
                                      </Typography>
                                    )}
                                  </>
                                ) : (
                                  <Chip 
                                    label="-" 
                                    size="small" 
                                    variant="outlined"
                                  />
                                )}
                              </TableCell>
                              <TableCell align="center">
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<PipelineIcon />}
                                    onClick={() => window.open(service.pipelineUrl, '_blank')}
                                    sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                  >
                                    Pipeline
                                  </Button>
                                  {service.prUrl && (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="secondary"
                                      startIcon={<PrIcon />}
                                      onClick={() => window.open(service.prUrl, '_blank')}
                                      sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                    >
                                      PR
                                    </Button>
                                  )}
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>
            </Grid>

            {/* Summary Stats */}
            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Chip 
                label={`Toplam: ${prodTagPipelineData.totalServices}`} 
                color="default" 
                variant="outlined"
              />
              <Chip 
                label={`Başarılı: ${prodTagPipelineData.completedServices}`} 
                color="success" 
                variant="outlined"
              />
              <Chip 
                label={`Devam Eden: ${prodTagPipelineData.inProgressServices}`} 
                color="warning" 
                variant="outlined"
              />
              <Chip 
                label={`Hatalı: ${prodTagPipelineData.failedServices}`} 
                color="error" 
                variant="outlined"
              />
            </Box>
          </AccordionDetails>
        </Accordion>
        </Paper>
      )}

      {/* PreProd K8s Pod Status Card - Only show if Deploy to PreProd step is completed */}
      {currentRelease.currentStep >= 9 && (
        <Paper elevation={3} sx={{ mt: 3, borderRadius: 2, overflow: 'hidden' }}>
          <Accordion>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{ 
                bgcolor: 'background.paper',
                borderBottom: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                  PreProd Ortamı Pod Durumu
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Başarı Oranı: {preProdK8sSuccessRate}%
                  </Typography>
                  <Box sx={{ width: 200 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={preProdK8sSuccessRate} 
                      color={getProgressColor(parseInt(preProdK8sSuccessRate))}
                      sx={{ height: 8, borderRadius: 1 }}
                    />
                  </Box>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 3 }}>
              {/* Description */}
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Bu kart, PreProd ortamına deploy edildikten sonra Kubernetes pod'larının durumunu gösterir. 
                Her servis için pod durumu kontrol edilir ve hedef versiyonla karşılaştırılır. 
                Hata alan pod'ların logları kaydedilir ve sorumlular belirlenir.
              </Typography>

              <Grid container spacing={3}>
                {/* Left: Chart */}
                <Grid item xs={12} md={8}>
                  <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Sorumlulara Göre Hata Dağılımı
                    </Typography>
                    <ResponsiveContainer width="100%" height={380}>
                      <PieChart>
                        <Pie
                          data={preProdK8sOwnerData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {preProdK8sOwnerData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>

                {/* Right: Table */}
                <Grid item xs={12} md={4}>
                  <Paper variant="outlined">
                    <TableContainer sx={{ maxHeight: 400 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Servis</strong></TableCell>
                            <TableCell><strong>Sorumlu</strong></TableCell>
                            <TableCell><strong>Versiyon</strong></TableCell>
                            <TableCell><strong>Pod Durumu</strong></TableCell>
                            <TableCell align="center"><strong>Aksiyonlar</strong></TableCell>
                          </TableRow>
                        </TableHead>
                      <TableBody>
                        {preProdK8sPodData.services
                          .filter(service => service.status !== 'Success')
                          .map((service, index) => (
                          <TableRow key={index}>
                            <TableCell>{service.name}</TableCell>
                            <TableCell>{service.owner}</TableCell>
                            <TableCell>
                              <Typography variant="caption" display="block">
                                Hedef: {service.targetVersion}
                              </Typography>
                              <Typography variant="caption" display="block" color={service.currentVersion === service.targetVersion ? 'success.main' : 'warning.main'}>
                                Mevcut: {service.currentVersion}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={service.status} 
                                size="small" 
                                color={getPodStatusColor(service.status)}
                                variant="outlined"
                                icon={<PodIcon fontSize="small" />}
                              />
                            </TableCell>
                            <TableCell align="center">
                              {service.logs && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  startIcon={<LogIcon />}
                                  onClick={() => handleOpenLogs(service.name, service.logs)}
                                  sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                >
                                  Loglar
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  </Paper>
                </Grid>
              </Grid>

              {/* Summary Stats */}
              <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Chip 
                  label={`Toplam: ${preProdK8sPodData.totalServices}`} 
                  color="default" 
                  variant="outlined"
                />
                <Chip 
                  label={`Başarılı: ${preProdK8sPodData.successServices}`} 
                  color="success" 
                  variant="outlined"
                />
                <Chip 
                  label={`Deploy Edilmedi: ${preProdK8sPodData.notDeployedServices}`} 
                  color="warning" 
                  variant="outlined"
                />
                <Chip 
                  label={`Hatalı: ${preProdK8sPodData.failedServices}`} 
                  color="error" 
                  variant="outlined"
                />
              </Box>
            </AccordionDetails>
          </Accordion>
        </Paper>
      )}

      {/* PR List Dialog */}
      <Dialog 
        open={prDialogOpen} 
        onClose={handleClosePRs}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Yayınlanmamış PR Listesi: {selectedPRServiceName}</Typography>
            <IconButton onClick={handleClosePRs} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><Typography variant="subtitle2" fontWeight="bold">PR ID</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" fontWeight="bold">Başlık</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" fontWeight="bold">Oluşturan</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" fontWeight="bold">Merge Tarihi</Typography></TableCell>
                  <TableCell align="center"><Typography variant="subtitle2" fontWeight="bold">Aksiyon</Typography></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedPRs.map((pr, index) => (
                  <TableRow key={index} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold" color="primary">
                        {pr.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {pr.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {pr.author}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {pr.mergedDate}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<PrIcon />}
                        onClick={() => window.open(pr.prUrl, '_blank')}
                        sx={{ textTransform: 'none' }}
                      >
                        PR Aç
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePRs} variant="contained">
            Kapat
          </Button>
        </DialogActions>
      </Dialog>

      {/* Breaking Changes Dialog */}
      <Dialog 
        open={breakingChangesDialogOpen} 
        onClose={handleCloseBreakingChanges}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6">Breaking Change Detayları: {selectedBreakingChangeService}</Typography>
              {selectedServiceApproved && (
                <Chip 
                  icon={<ApprovalIcon />}
                  label="Onaylandı" 
                  size="small" 
                  color="success"
                  sx={{ mt: 1 }}
                />
              )}
            </Box>
            <IconButton onClick={handleCloseBreakingChanges} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedBreakingChanges.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {selectedBreakingChanges.map((change, index) => {
                const typeInfo = getBreakingChangeTypeInfo(change.type);
                return (
                  <Paper 
                    key={index} 
                    elevation={2} 
                    sx={{ 
                      p: 2,
                      borderLeft: '4px solid',
                      borderColor: `${getBreakingChangeSeverityColor(change.severity)}.main`
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {typeInfo.icon}
                        <Typography variant="subtitle2" fontWeight="bold">
                          {typeInfo.label}
                        </Typography>
                      </Box>
                      <Chip 
                        label={change.severity.toUpperCase()} 
                        size="small" 
                        color={getBreakingChangeSeverityColor(change.severity)}
                        variant="filled"
                      />
                    </Box>
                    
                    <Typography variant="body2" sx={{ mb: 1, fontFamily: 'monospace', bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
                      {change.description}
                    </Typography>
                    
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" fontWeight="bold" color="error.main">
                        Etki:
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {change.impact}
                      </Typography>
                    </Box>
                    
                    <Paper 
                      sx={{ 
                        p: 1.5, 
                        bgcolor: 'info.lighter',
                        borderLeft: '3px solid',
                        borderColor: 'info.main'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <AiIcon sx={{ color: 'info.main', fontSize: '1rem', mt: 0.3 }} />
                        <Typography variant="body2" color="text.secondary">
                          {change.aiAnalysis}
                        </Typography>
                      </Box>
                    </Paper>
                  </Paper>
                );
              })}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
              Bu serviste breaking change tespit edilmedi.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          {!selectedServiceApproved && selectedBreakingChanges.length > 0 && (
            <Button 
              onClick={handleApproveBreakingChanges} 
              variant="contained"
              color="success"
              startIcon={<ApprovalIcon />}
            >
              Değişiklikleri Onayla
            </Button>
          )}
          <Button onClick={handleCloseBreakingChanges} variant="outlined">
            Kapat
          </Button>
        </DialogActions>
      </Dialog>

      {/* Customer Notification Dialog */}
      <Dialog 
        open={customerNotificationDialogOpen} 
        onClose={handleCloseCustomerNotification}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Müşteri Bilgilendirme</Typography>
            <IconButton onClick={handleCloseCustomerNotification} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {!notificationSent ? (
            <>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2" fontWeight="bold" gutterBottom>
                  Bildirim İçeriği:
                </Typography>
                <Typography variant="body2">
                  "{currentRelease.version} versiyonu yayınlandı! ReleaseHub360 üzerinden detaylara ulaşabilirsiniz."
                </Typography>
              </Alert>

              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Bildirim Gönderilecek Müşteriler:
              </Typography>
              
              <Box sx={{ maxHeight: 300, overflow: 'auto', mt: 2 }}>
                {customers.map(customer => (
                  <FormControlLabel
                    key={customer.id}
                    control={
                      <Checkbox
                        checked={selectedCustomers.includes(customer.id)}
                        onChange={() => handleCustomerToggle(customer.id)}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {customer.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {customer.email}
                        </Typography>
                      </Box>
                    }
                    sx={{ display: 'flex', mb: 1, p: 1, borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
                  />
                ))}
              </Box>

              <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.lighter', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  ⚠️ Seçili {selectedCustomers.length} müşteriye e-posta gönderilecektir.
                </Typography>
              </Box>
            </>
          ) : (
            <Alert severity="success" icon={<CheckCircleIcon />}>
              <Typography variant="body2" fontWeight="bold">
                Bildirim Başarıyla Gönderildi!
              </Typography>
              <Typography variant="caption">
                {selectedCustomers.length} müşteriye e-posta gönderildi.
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          {!notificationSent && (
            <>
              <Button 
                onClick={handleCloseCustomerNotification} 
                variant="outlined"
              >
                İptal
              </Button>
              <Button 
                onClick={handleSendNotification} 
                variant="contained"
                color="primary"
                disabled={selectedCustomers.length === 0}
              >
                Gönder ({selectedCustomers.length})
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Log Dialog */}
      <Dialog 
        open={logDialogOpen} 
        onClose={handleCloseLogs}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Pod Logları: {selectedServiceName}</Typography>
            <IconButton onClick={handleCloseLogs} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Paper 
            sx={{ 
              p: 2, 
              bgcolor: '#1e1e1e', 
              color: '#d4d4d4',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              whiteSpace: 'pre-wrap',
              overflowX: 'auto'
            }}
          >
            {selectedLogs}
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseLogs} variant="contained">
            Kapat
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ReleaseHealthCheck;
