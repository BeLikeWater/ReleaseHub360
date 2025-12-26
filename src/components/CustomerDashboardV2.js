import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Chip, 
  Grid, 
  Paper,
  Avatar,
  LinearProgress,
  IconButton,
  Tooltip,
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
  Button,
  TextField,
  Stack,
  Alert,
  Container,
  CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import {
  RocketLaunch as ReleaseIcon,
  BugReport as HotfixIcon,
  Warning as UrgentIcon,
  TrendingUp as TrendIcon,
  Assessment as ReportIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Login as LoginIcon,
  Business as BusinessIcon
} from '@mui/icons-material';

// Müşteri veritabanı (domain bazlı)
// NOT: selectedProduct Firebase'deki Customers collection'ından çekilecek
const customerDatabase = {
  'kt-bank.de': {
    name: 'KT Bank',
    logo: '🏦',
    color: '#1976d2',
    currentVersion: 'v1.23.0',
    selectedProduct: null // Firebase'den çekilecek
  },
  'vakifbank.com.tr': {
    name: 'VakıfBank',
    logo: '🏢',
    color: '#d32f2f',
    currentVersion: 'v1.22.0',
    selectedProduct: null
  },
  'ziraatbank.com.tr': {
    name: 'Ziraat Bankası',
    logo: '🌾',
    color: '#2e7d32',
    currentVersion: 'v1.21.0',
    selectedProduct: null
  }
};

const customerVersion = 4;
const currentRelease = 6;
const pendingReleases = currentRelease - customerVersion;
const pendingHotfixes = 5;
const criticalHotfixes = 2;
const pendingUrgents = 7;
const expiredUrgents = 3;

const CustomerDashboardV2 = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [customerInfo, setCustomerInfo] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [environmentDates, setEnvironmentDates] = useState({
    dev: { planned: '', actual: '' },
    test: { planned: '', actual: '' },
    prod: { planned: '', actual: '' }
  });
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Firebase'den versiyonları çekme fonksiyonu
  const fetchVersions = async (productId) => {
    if (!productId) {
      console.log('ProductId bulunamadı');
      return;
    }
    
    setLoading(true);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 VERSİYON ARAMA BAŞLADI');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🆔 Aranan productId:', productId);
    console.log('');
    
    try {
      // Farklı collection adlarını dene
      const collectionNames = ['ProductVersions', 'productVersions', 'ProductVersion', 'productVersion'];
      let foundCollection = null;
      let allSnapshot = null;
      
      console.log('🔎 Collection adı aranıyor...');
      
      for (const collectionName of collectionNames) {
        try {
          console.log(`   Deneniyor: "${collectionName}"`);
          const testRef = collection(db, collectionName);
          const testSnapshot = await getDocs(query(testRef));
          
          if (testSnapshot.size > 0) {
            console.log(`   ✅ BULUNDU! "${collectionName}" - ${testSnapshot.size} döküman var`);
            foundCollection = collectionName;
            allSnapshot = testSnapshot;
            break;
          } else {
            console.log(`   ⚠️  "${collectionName}" var ama boş`);
          }
        } catch (error) {
          console.log(`   ❌ "${collectionName}" bulunamadı:`, error.message);
        }
      }
      
      console.log('');
      
      if (!foundCollection) {
        console.log('❌ HİÇBİR VERSION COLLECTION BULUNAMADI!');
        setVersions([]);
        setLoading(false);
        return;
      }
      
      const versionsRef = collection(db, foundCollection);
      
      console.log('📋 TÜM VERSION COLLECTION (FİLTRESİZ)');
      console.log('═══════════════════════════════════════════');
      console.log('Collection Adı:', foundCollection);
      console.log(`✅ Toplam döküman sayısı: ${allSnapshot.size}`);
      console.log('');
      
      allSnapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`📦 Version #${index + 1}`);
        console.log('   Doc ID:', doc.id);
        console.log('   Data:', JSON.stringify(data, null, 2));
        console.log('   ---');
      });
      
      console.log('');
      console.log('🔎 FİLTRELENMİŞ ARAMA YAPILIYOR...');
      console.log('═══════════════════════════════════════════');
      console.log('Filtre: productId ==', productId);
      console.log('');
      
      // Şimdi productId ile filtreleyelim
      const q = query(
        versionsRef,
        where('productId', '==', productId)
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedVersions = [];
      
      console.log(`📊 Bulunan versiyon sayısı: ${querySnapshot.size}`);
      console.log('');
      
      if (!querySnapshot.empty) {
        querySnapshot.forEach((doc, index) => {
          const data = doc.data();
          console.log(`✅ Eşleşen Version #${index + 1}`);
          console.log('   Doc ID:', doc.id);
          console.log('   Data:', JSON.stringify(data, null, 2));
          
          fetchedVersions.push({
            id: doc.id,
            version: data.version || data.versionNumber,
            productName: data.productName,
            productId: data.productId,
            status: data.status || 'Unknown',
            testDate: data.testDate || '',
            releaseDate: data.releaseDate || data.publishDate || '',
            environments: {
              dev: { 
                planned: data.devPlannedDate || '', 
                actual: data.devActualDate || '' 
              },
              test: { 
                planned: data.testPlannedDate || '', 
                actual: data.testActualDate || '' 
              },
              prod: { 
                planned: data.prodPlannedDate || '', 
                actual: data.prodActualDate || '' 
              }
            }
          });
        });
      } else {
        console.log('❌ FİLTREYE UYGUN VERSİYON BULUNAMADI!');
        console.log('');
        console.log('🔧 KONTROL EDİLMESİ GEREKENLER:');
        console.log('1. Yukarıdaki dökümanlar arasında "productId" field\'ı var mı?');
        console.log('2. productId değeri tam olarak "' + productId + '" şeklinde mi?');
        console.log('');
      }
      
      // Release date'e göre sırala (client-side)
      fetchedVersions.sort((a, b) => {
        const dateA = new Date(a.publishDate || 0);
        const dateB = new Date(b.publishDate || 0);
        return dateB - dateA;
      });
      
      console.log('📦 Yüklenen toplam versiyon sayısı:', fetchedVersions.length);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      setVersions(fetchedVersions);
    } catch (error) {
      console.error('❌ Versiyonlar yüklenirken hata:', error);
      console.error('Hata detayı:', error.message);
      console.error('Hata stack:', error.stack);
      setVersions([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (count) => {
    if (count === 0) return 'success';
    if (count <= 2) return 'warning';
    return 'error';
  };

  const getProgressValue = (current, total) => {
    return total > 0 ? (current / total) * 100 : 0;
  };

  const getStateColor = (state) => {
    switch (state) {
      case 'Published': return 'success';
      case 'Test': return 'warning';
      case 'InProgress': return 'info';
      default: return 'default';
    }
  };

  const getStateLabel = (state) => {
    switch (state) {
      case 'Published': return 'Yayınlandı';
      case 'Test': return 'Test Ediliyor';
      case 'InProgress': return 'Geliştiriliyor';
      default: return state;
    }
  };

  const handleEditClick = (version, event) => {
    event.stopPropagation(); // Satır click'ini engelle
    setSelectedVersion(version);
    setEnvironmentDates(version.environments || {
      dev: { planned: '', actual: '' },
      test: { planned: '', actual: '' },
      prod: { planned: '', actual: '' }
    });
    setOpenDialog(true);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);

    try {
      // Şifre kontrolü
      if (loginData.password !== '123456') {
        setLoginError('Hatalı şifre!');
        setLoading(false);
        return;
      }

      // Email doğrulama ve domain çıkarma
      const emailRegex = /^[^\s@]+@([^\s@]+\.[^\s@]+)$/;
      const match = loginData.email.match(emailRegex);
      
      if (!match) {
        setLoginError('Geçersiz email formatı!');
        setLoading(false);
        return;
      }

      const domain = match[1];
      const staticCustomer = customerDatabase[domain];

      if (!staticCustomer) {
        setLoginError(`"${domain}" domain adresine ait müşteri bulunamadı! Kayıtlı domainler: ${Object.keys(customerDatabase).join(', ')}`);
        setLoading(false);
        return;
      }

      // Firebase'den müşteri bilgilerini çek
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔍 MÜŞTERİ ARAMA BAŞLADI');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📧 Giriş yapılan email:', loginData.email);
      console.log('🌐 Çıkarılan domain:', domain);
      console.log('');
      
      // Farklı collection adlarını dene
      const collectionNames = ['Customers', 'customers', 'Customer', 'customer'];
      let foundCollection = null;
      let allCustomersSnapshot = null;
      
      console.log('🔎 Collection adı aranıyor...');
      
      for (const collectionName of collectionNames) {
        try {
          console.log(`   Deneniyor: "${collectionName}"`);
          const testRef = collection(db, collectionName);
          const testSnapshot = await getDocs(query(testRef));
          
          if (testSnapshot.size > 0) {
            console.log(`   ✅ BULUNDU! "${collectionName}" - ${testSnapshot.size} döküman var`);
            foundCollection = collectionName;
            allCustomersSnapshot = testSnapshot;
            break;
          } else {
            console.log(`   ⚠️  "${collectionName}" var ama boş`);
          }
        } catch (error) {
          console.log(`   ❌ "${collectionName}" bulunamadı veya erişim hatası:`, error.message);
        }
      }
      
      console.log('');
      
      if (!foundCollection) {
        console.log('❌ HİÇBİR CUSTOMER COLLECTION BULUNAMADI!');
        console.log('');
        console.log('🔧 Kontrol edilmesi gerekenler:');
        console.log('1. Firebase Console\'da collection adını kontrol edin');
        console.log('2. Firestore Rules\'da okuma izni var mı kontrol edin');
        console.log('3. Collection gerçekten veri içeriyor mu?');
        console.log('');
        throw new Error('Customers collection bulunamadı');
      }
      
      const customersRef = collection(db, foundCollection);
      
      console.log('📋 TÜM CUSTOMERS COLLECTION (FİLTRESİZ)');
      console.log('═══════════════════════════════════════════');
      console.log('Collection Adı:', foundCollection);
      console.log(`✅ Toplam müşteri sayısı: ${allCustomersSnapshot.size}`);
      console.log('');
      
      allCustomersSnapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`📦 Müşteri #${index + 1}`);
        console.log('   Doc ID:', doc.id);
        console.log('   Data:', JSON.stringify(data, null, 2));
        console.log('   ---');
      });
      
      console.log('');
      console.log('🔎 FİLTRELENMİŞ ARAMA YAPILIYOR...');
      console.log('═══════════════════════════════════════════');
      console.log('Filtre: emailDomain ==', domain);
      console.log('');
      
      // Şimdi emailDomain ile filtreleyelim
      const q = query(customersRef, where('emailDomain', '==', domain));
      const querySnapshot = await getDocs(q);

      console.log(`📊 Bulunan müşteri sayısı: ${querySnapshot.size}`);
      console.log('');

      let customerFromDB = null;
      if (!querySnapshot.empty) {
        // İlk dökümanı direkt al
        const firstDoc = querySnapshot.docs[0];
        customerFromDB = firstDoc.data();
        
        console.log(`✅ Eşleşen Müşteri Bulundu`);
        console.log('   Doc ID:', firstDoc.id);
        console.log('   Data:', JSON.stringify(customerFromDB, null, 2));
      } else {
        console.log('❌ FİLTREYE UYGUN MÜŞTERİ BULUNAMADI!');
        console.log('');
        console.log('🔧 KONTROL EDİLMESİ GEREKENLER:');
        console.log('1. Yukarıdaki "TÜM CUSTOMERS" listesinde "emailDomain" field\'ı var mı?');
        console.log('2. emailDomain değeri tam olarak "' + domain + '" şeklinde mi?');
        console.log('3. Büyük/küçük harf uyumu var mı?');
        console.log('');
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');

      // Firebase'den müşteri varsa onu kullan, yoksa statik tanımı kullan
      let finalCustomerInfo;
      
      if (customerFromDB) {
        console.log('✅ Firebase\'den gelen müşteri bilgisi kullanılıyor');
        // Firebase'den gelen veriyi kullan, eksik alanlar için statik tanımı fallback olarak kullan
        finalCustomerInfo = {
          name: customerFromDB.name || staticCustomer.name,
          logo: customerFromDB.logo || staticCustomer.logo,
          color: customerFromDB.color || staticCustomer.color,
          currentVersion: customerFromDB.currentVersion || staticCustomer.currentVersion,
          selectedProduct: customerFromDB.selectedProduct,
          // Firebase'den gelen diğer alanları da ekle
          ...customerFromDB
        };
      } else {
        console.log('⚠️ Firebase\'de müşteri bulunamadı, statik tanım kullanılıyor');
        finalCustomerInfo = staticCustomer;
      }

      console.log('📦 Kullanılacak final müşteri bilgisi:', JSON.stringify(finalCustomerInfo, null, 2));

      // Başarılı giriş - localStorage'a kaydet
      const loginInfo = {
        email: loginData.email,
        domain: domain,
        customerInfo: finalCustomerInfo
      };
      localStorage.setItem('customerDashboardLogin', JSON.stringify(loginInfo));
      
      setCustomerInfo(finalCustomerInfo);
      setIsLoggedIn(true);
    } catch (error) {
      console.error('Login hatası:', error);
      setLoginError('Giriş sırasında bir hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    // localStorage'dan temizle
    localStorage.removeItem('customerDashboardLogin');
    
    setIsLoggedIn(false);
    setCustomerInfo(null);
    setLoginData({ email: '', password: '' });
    setLoginError('');
  };

  // Component mount olduğunda localStorage'dan kontrol et
  useEffect(() => {
    const savedLogin = localStorage.getItem('customerDashboardLogin');
    if (savedLogin) {
      try {
        const loginInfo = JSON.parse(savedLogin);
        setCustomerInfo(loginInfo.customerInfo);
        setLoginData({ email: loginInfo.email, password: '' });
        setIsLoggedIn(true);
      } catch (error) {
        // Hatalı veri varsa temizle
        localStorage.removeItem('customerDashboardLogin');
      }
    }
  }, []);

  // Müşteri bilgisi değiştiğinde versiyonları yükle
  useEffect(() => {
    if (customerInfo && customerInfo.selectedProduct) {
      console.log('Müşteri bilgisi:', customerInfo);
      fetchVersions(customerInfo.selectedProduct);
    }
  }, [customerInfo]);

  const handleSave = () => {
    // Burada veri güncelleme işlemi yapılacak
    console.log('Güncellenen veriler:', {
      version: selectedVersion?.version,
      environments: environmentDates
    });
    setOpenDialog(false);
  };

  const handleEnvironmentDateChange = (env, type, value) => {
    setEnvironmentDates(prev => ({
      ...prev,
      [env]: {
        ...prev[env],
        [type]: value
      }
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  // Login Ekranı
  if (!isLoggedIn) {
    return (
      <Box sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2
      }}>
        <Container maxWidth="sm">
          <Paper 
            elevation={24}
            sx={{ 
              p: 5, 
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Avatar 
                sx={{ 
                  width: 80, 
                  height: 80, 
                  bgcolor: 'primary.main',
                  margin: '0 auto',
                  mb: 2,
                  boxShadow: '0 8px 24px rgba(25, 118, 210, 0.4)'
                }}
              >
                <BusinessIcon sx={{ fontSize: 40 }} />
              </Avatar>
              <Typography variant="h4" fontWeight="bold" color="primary.main" gutterBottom>
                Müşteri Portal
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Lütfen giriş bilgilerinizi giriniz
              </Typography>
            </Box>

            <form onSubmit={handleLogin}>
              <Stack spacing={3}>
                {loginError && (
                  <Alert severity="error" sx={{ borderRadius: 2 }}>
                    {loginError}
                  </Alert>
                )}

                <TextField
                  fullWidth
                  label="E-posta Adresi"
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  required
                  placeholder="ornek@kt-bank.de"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2
                    }
                  }}
                />

                <TextField
                  fullWidth
                  label="Şifre"
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2
                    }
                  }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={<LoginIcon />}
                  sx={{ 
                    borderRadius: 2,
                    py: 1.5,
                    fontSize: '1.1rem',
                    textTransform: 'none',
                    boxShadow: '0 4px 12px rgba(25, 118, 210, 0.4)',
                    '&:hover': {
                      boxShadow: '0 6px 16px rgba(25, 118, 210, 0.6)'
                    }
                  }}
                >
                  Giriş Yap
                </Button>

                <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    <strong>Demo Bilgileri:</strong>
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    E-posta: admin@kt-bank.de
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Şifre: 123456
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    Diğer domainler: vakifbank.com.tr, ziraatbank.com.tr
                  </Typography>
                </Box>
              </Stack>
            </form>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      p: 4
    }}>
      {/* Header */}
      <Paper 
        elevation={8} 
        sx={{ 
          p: 3, 
          mb: 4, 
          borderRadius: 3,
          background: `linear-gradient(135deg, ${customerInfo.color} 0%, ${customerInfo.color}dd 100%)`,
          backdropFilter: 'blur(10px)',
          color: 'white'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar 
              sx={{ 
                width: 64, 
                height: 64, 
                bgcolor: 'white',
                fontSize: '2rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}
            >
              {customerInfo.logo}
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                {customerInfo.name} - Müşteri Portal
              </Typography>
              <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                Mevcut Versiyon: {customerInfo.currentVersion} | Güncel Durum ve Bekleyen İşlemler
              </Typography>
              {customerInfo.selectedProduct && (
                <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
                  📦 Seçili Ürün ID: {customerInfo.selectedProduct}
                </Typography>
              )}
              {!customerInfo.selectedProduct && (
                <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5, color: '#ffeb3b' }}>
                  ⚠️ Ürün bilgisi Firebase'de tanımlı değil
                </Typography>
              )}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={handleLogout}
              sx={{ 
                color: 'white', 
                borderColor: 'white',
                '&:hover': {
                  borderColor: 'white',
                  bgcolor: 'rgba(255,255,255,0.1)'
                }
              }}
            >
              Çıkış Yap
            </Button>
            <Tooltip title="Son güncelleme: 2 dakika önce">
              <IconButton sx={{ color: 'white' }} size="large">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                Son Güncelleme
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {new Date().toLocaleString('tr-TR')}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={4}>
        {/* Bekleyen Release Kartı */}
        <Grid item >
          <Card 
            elevation={12}
            sx={{ 
              height: '100%',
              background: 'linear-gradient(145deg, #ffffff, #f0f0f0)',
              borderRadius: 4,
              transition: 'transform 0.3s ease-in-out',
              cursor: 'pointer',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
              }
            }}
            onClick={() => navigate('/releases')}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar 
                    sx={{ 
                      width: 48, 
                      height: 48, 
                      bgcolor: 'primary.main',
                      boxShadow: '0 8px 16px rgba(25, 118, 210, 0.3)'
                    }}
                  >
                    <ReleaseIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Bekleyen Güncellemeler
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Yeni sürüm güncellemeleri
                    </Typography>
                  </Box>
                </Box>
                <Chip 
                  label={`${pendingReleases}`}
                  color={getStatusColor(pendingReleases)}
                  size="small"
                  sx={{ fontWeight: 'bold' }}
                />
              </Box>
              
              {/* Mevcut Versiyon */}
              <Box sx={{ mb: 2 }}>
                <Paper 
                  elevation={3}
                  sx={{ 
                    p: 2, 
                    bgcolor: 'primary.main', 
                    color: 'white', 
                    borderRadius: 2,
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                    boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)'
                  }}
                >
                  <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', mb: 0.5 }}>
                    📌 Mevcut Versiyon
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    v1.23.0
                  </Typography>
                </Paper>
              </Box>

              {/* Bekleyen Versiyonlar */}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontWeight: 600 }}>
                  🔔 Bekleyen Güncellemeler
                </Typography>
                <Grid container spacing={1.5}>
                  <Grid item xs={6}>
                    <Paper 
                      elevation={2}
                      sx={{ 
                        p: 1.5, 
                        bgcolor: '#fff3e0', 
                        borderRadius: 2,
                        textAlign: 'center',
                        border: '2px solid #ff9800',
                        transition: 'transform 0.2s',
                        '&:hover': {
                          transform: 'scale(1.05)'
                        }
                      }}
                    >
                      <Typography variant="body2" fontWeight="bold" color="warning.dark">
                        v1.24.0
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Sonraki
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper 
                      elevation={2}
                      sx={{ 
                        p: 1.5, 
                        bgcolor: '#e8f5e9', 
                        borderRadius: 2,
                        textAlign: 'center',
                        border: '2px solid #4caf50',
                        transition: 'transform 0.2s',
                        '&:hover': {
                          transform: 'scale(1.05)'
                        }
                      }}
                    >
                      <Typography variant="body2" fontWeight="bold" color="success.dark">
                        v1.25.0
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Planlanan
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Bekleyen Hotfix Kartı */}
        <Grid item xs={12} md={6}>
          <Card 
            elevation={12}
            onClick={() => navigate('/hotfix-management')}
            sx={{ 
              height: '100%',
              background: 'linear-gradient(145deg, #ffffff, #f0f0f0)',
              borderRadius: 4,
              transition: 'transform 0.3s ease-in-out',
              cursor: 'pointer',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar 
                    sx={{ 
                      width: 48, 
                      height: 48, 
                      bgcolor: 'error.main',
                      boxShadow: '0 8px 16px rgba(211, 47, 47, 0.3)'
                    }}
                  >
                    <HotfixIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Bekleyen Hotfix
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Kritik düzeltmeler
                    </Typography>
                  </Box>
                </Box>
                <Chip 
                  label={`${pendingHotfixes}`}
                  color={getStatusColor(pendingHotfixes)}
                  size="small"
                  sx={{ fontWeight: 'bold' }}
                />
              </Box>
              
              {/* Toplam Hotfix Sayısı */}
              <Box sx={{ mb: 2 }}>
                <Paper 
                  elevation={3}
                  sx={{ 
                    p: 2, 
                    bgcolor: 'error.main', 
                    color: 'white', 
                    borderRadius: 2,
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #d32f2f 0%, #c62828 100%)',
                    boxShadow: '0 4px 12px rgba(211, 47, 47, 0.3)'
                  }}
                >
                  <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', mb: 0.5 }}>
                    � Toplam Hotfix
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {pendingHotfixes} Adet
                  </Typography>
                </Paper>
              </Box>

              {/* Hotfix Detayı */}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontWeight: 600 }}>
                  📊 Hotfix Detayı
                </Typography>
                <Grid container spacing={1.5}>
                  <Grid item xs={6}>
                    <Paper 
                      elevation={2}
                      sx={{ 
                        p: 1.5, 
                        bgcolor: '#ffebee', 
                        borderRadius: 2,
                        textAlign: 'center',
                        border: '2px solid #f44336',
                        transition: 'transform 0.2s',
                        '&:hover': {
                          transform: 'scale(1.05)'
                        }
                      }}
                    >
                      <Typography variant="h6" fontWeight="bold" color="error.dark">
                        {criticalHotfixes}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Kritik
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper 
                      elevation={2}
                      sx={{ 
                        p: 1.5, 
                        bgcolor: '#fff3e0', 
                        borderRadius: 2,
                        textAlign: 'center',
                        border: '2px solid #ff9800',
                        transition: 'transform 0.2s',
                        '&:hover': {
                          transform: 'scale(1.05)'
                        }
                      }}
                    >
                      <Typography variant="h6" fontWeight="bold" color="warning.dark">
                        {pendingHotfixes - criticalHotfixes}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Normal
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Bekleyen Acil Değişiklik Kartı */}
        <Grid item xs={12} md={4}>
          <Card 
            elevation={12}
            onClick={() => navigate('/urgent-changes')}
            sx={{ 
              height: '100%',
              background: 'linear-gradient(145deg, #ffffff, #f0f0f0)',
              borderRadius: 4,
              transition: 'transform 0.3s ease-in-out',
              cursor: 'pointer',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar 
                    sx={{ 
                      width: 48, 
                      height: 48, 
                      bgcolor: 'warning.main',
                      boxShadow: '0 8px 16px rgba(255, 152, 0, 0.3)'
                    }}
                  >
                    <UrgentIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Acil Değişiklikler
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Urgent güncellemeler
                    </Typography>
                  </Box>
                </Box>
                <Chip 
                  label={`${pendingUrgents}`}
                  color={getStatusColor(pendingUrgents)}
                  size="small"
                  sx={{ fontWeight: 'bold' }}
                />
              </Box>
              
              {/* Toplam Acil Değişiklik Sayısı */}
              <Box sx={{ mb: 2 }}>
                <Paper 
                  elevation={3}
                  sx={{ 
                    p: 2, 
                    bgcolor: 'warning.main', 
                    color: 'white', 
                    borderRadius: 2,
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #f57c00 0%, #ef6c00 100%)',
                    boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)'
                  }}
                >
                  <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', mb: 0.5 }}>
                    ⚡ Toplam Acil Değişiklik
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {pendingUrgents} Adet
                  </Typography>
                </Paper>
              </Box>

              {/* Acil Değişiklik Detayı */}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontWeight: 600 }}>
                  📊 Değişiklik Detayı
                </Typography>
                <Grid container spacing={1.5}>
                  <Grid item xs={6}>
                    <Paper 
                      elevation={2}
                      sx={{ 
                        p: 1.5, 
                        bgcolor: '#ffebee', 
                        borderRadius: 2,
                        textAlign: 'center',
                        border: '2px solid #f44336',
                        transition: 'transform 0.2s',
                        '&:hover': {
                          transform: 'scale(1.05)'
                        }
                      }}
                    >
                      <Typography variant="h6" fontWeight="bold" color="error.dark">
                        {expiredUrgents}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Zamanı Geçmiş
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper 
                      elevation={2}
                      sx={{ 
                        p: 1.5, 
                        bgcolor: '#e8f5e9', 
                        borderRadius: 2,
                        textAlign: 'center',
                        border: '2px solid #4caf50',
                        transition: 'transform 0.2s',
                        '&:hover': {
                          transform: 'scale(1.05)'
                        }
                      }}
                    >
                      <Typography variant="h6" fontWeight="bold" color="success.dark">
                        {pendingUrgents - expiredUrgents}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Normal
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Versiyon Tablosu */}
        <Grid item xs={12}>
          <Paper 
            elevation={8}
            sx={{ 
              p: 4, 
              borderRadius: 3,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="h5" fontWeight="bold">
                  Versiyon Takibi
                </Typography>
                {customerInfo?.selectedProduct && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Seçili Ürün ID: {customerInfo.selectedProduct}
                  </Typography>
                )}
              </Box>
              <Typography variant="body2" color="text.secondary">
                Versiyona tıklayarak banka alım bilgilerini düzenleyebilirsiniz
              </Typography>
            </Box>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                <CircularProgress size={60} />
              </Box>
            ) : versions.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 10 }}>
                <Typography variant="h6" color="error.main" gutterBottom>
                  ⚠️ Bu ürün için henüz versiyon bilgisi bulunamadı
                </Typography>
                {customerInfo?.selectedProduct ? (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body1" color="text.secondary">
                      Aranan ProductId: <strong>{customerInfo.selectedProduct}</strong>
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Lütfen Firebase'deki ProductVersions collection'ında bu productId ile kayıt olduğundan emin olun.
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body1" color="warning.main">
                      Müşteri kaydında selectedProduct alanı tanımlı değil!
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Firebase Customers collection'ında bu müşteriye selectedProduct ataması yapılmalı.
                    </Typography>
                  </Box>
                )}
              </Box>
            ) : (
              <TableContainer>
              <Table sx={{ minWidth: 750 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Versiyon</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Durum</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Test Başlama</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Yayın Tarihi</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Banka Durumu</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>İşlemler</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {versions.map((version) => {
                    // Ortam kontrolü - customerInfo.environments'dan gelen ortamlara göre
                    const customerEnvs = customerInfo?.environments || ['Dev', 'Test', 'Prod'];
                    const allEnvsHaveActual = customerEnvs.every(env => 
                      version.environments?.[env.toLowerCase()]?.actual
                    );
                    const someEnvsHaveActual = customerEnvs.some(env => 
                      version.environments?.[env.toLowerCase()]?.actual
                    );
                    
                    return (
                      <TableRow
                        key={version.id}
                        sx={{
                          '&:hover': {
                            backgroundColor: 'action.hover',
                          },
                          transition: 'background-color 0.2s ease-in-out'
                        }}
                      >
                        <TableCell>
                          <Box>
                            <Typography variant="body1" fontWeight="bold" color="primary.main">
                              {version.version}
                            </Typography>
                            {version.productName && (
                              <Typography variant="caption" color="text.secondary">
                                {version.productName}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getStateLabel(version.status)}
                            color={getStateColor(version.status)}
                            size="small"
                            sx={{ fontWeight: 'bold' }}
                          />
                        </TableCell>
                        <TableCell>{formatDate(version.testDate)}</TableCell>
                        <TableCell>{formatDate(version.releaseDate)}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {allEnvsHaveActual && (
                              <Chip 
                                label="Tüm Ortamlarda Aktif" 
                                color="success" 
                                size="small"
                                sx={{ fontSize: '0.7rem' }}
                              />
                            )}
                            {someEnvsHaveActual && !allEnvsHaveActual && (
                              <Chip 
                                label="Kısmi Aktif" 
                                color="warning" 
                                size="small"
                                sx={{ fontSize: '0.7rem' }}
                              />
                            )}
                            {!someEnvsHaveActual && (
                              <Chip 
                                label="Henüz Alınmadı" 
                                color="default" 
                                size="small"
                                sx={{ fontSize: '0.7rem' }}
                              />
                            )}
                            {customerInfo?.environments && customerInfo.environments.map((env) => (
                              <Typography key={env} variant="caption" color="text.secondary">
                                {env}: {formatDate(version.environments?.[env.toLowerCase()]?.actual) || 'Bekliyor'}
                              </Typography>
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <IconButton
                            onClick={(e) => handleEditClick(version, e)}
                            color="primary"
                            size="small"
                            sx={{
                              backgroundColor: 'primary.main',
                              color: 'white',
                              '&:hover': {
                                backgroundColor: 'primary.dark',
                              }
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Banka Ortam Düzenleme Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" fontWeight="bold" color="primary.main">
            {selectedVersion?.version} - Banka Ortam Planlaması
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Her ortam için planlanan ve gerçekleşen tarihleri girebilirsiniz
          </Typography>
        </DialogTitle>
        
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={3}>
            {/* DEV Ortamı */}
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 3, borderRadius: 2, bgcolor: '#e3f2fd' }}>
                <Typography variant="h6" fontWeight="bold" color="primary.main" gutterBottom>
                  🛠️ DEV Ortamı
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Planlanan Tarih"
                      type="date"
                      value={environmentDates.dev.planned}
                      onChange={(e) => handleEnvironmentDateChange('dev', 'planned', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Gerçekleşen Tarih"
                      type="date"
                      value={environmentDates.dev.actual}
                      onChange={(e) => handleEnvironmentDateChange('dev', 'actual', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      size="small"
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* TEST Ortamı */}
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 3, borderRadius: 2, bgcolor: '#fff3e0' }}>
                <Typography variant="h6" fontWeight="bold" color="warning.main" gutterBottom>
                  🧪 TEST Ortamı
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Planlanan Tarih"
                      type="date"
                      value={environmentDates.test.planned}
                      onChange={(e) => handleEnvironmentDateChange('test', 'planned', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Gerçekleşen Tarih"
                      type="date"
                      value={environmentDates.test.actual}
                      onChange={(e) => handleEnvironmentDateChange('test', 'actual', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      size="small"
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* PROD Ortamı */}
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 3, borderRadius: 2, bgcolor: '#e8f5e8' }}>
                <Typography variant="h6" fontWeight="bold" color="success.main" gutterBottom>
                  🚀 PROD Ortamı
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Planlanan Tarih"
                      type="date"
                      value={environmentDates.prod.planned}
                      onChange={(e) => handleEnvironmentDateChange('prod', 'planned', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Gerçekleşen Tarih"
                      type="date"
                      value={environmentDates.prod.actual}
                      onChange={(e) => handleEnvironmentDateChange('prod', 'actual', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      size="small"
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button
            onClick={() => setOpenDialog(false)}
            variant="outlined"
            startIcon={<CancelIcon />}
            sx={{ borderRadius: 2 }}
          >
            İptal
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            startIcon={<SaveIcon />}
            sx={{ borderRadius: 2 }}
          >
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerDashboardV2;
