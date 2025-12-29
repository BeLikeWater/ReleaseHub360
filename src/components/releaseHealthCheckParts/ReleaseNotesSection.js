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
  Button,
  Alert,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import { collection, getDocs, addDoc, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const ReleaseNotesSection = ({ workItemIds }) => {
  const [releaseNotes, setReleaseNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Firestore'dan release notes'ları yükle
  const fetchReleaseNotes = async () => {
    console.log('📖 Release Notes yükleniyor...');
    setLoadingNotes(true);
    
    try {
      const releaseNotesRef = collection(db, 'masterVersionReleaseNotes');
      const snapshot = await getDocs(releaseNotesRef);
      
      const notes = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        notes.push({
          id: doc.id,
          workitemId: data.workitemId,
          title: data.title || '',
          description: data.description || '',
          createdAt: data.createdAt
        });
      });
      
      console.log(`✅ ${notes.length} release note yüklendi`);
      setReleaseNotes(notes);
    } catch (error) {
      console.error('❌ Release notes yükleme hatası:', error);
    } finally {
      setLoadingNotes(false);
    }
  };

  // Component mount olduğunda release notes'ları yükle
  useEffect(() => {
    fetchReleaseNotes();
  }, []);

  // Mock Data - Release Notes (artık kullanılmıyor)
  const mockReleaseNotes = [
    {
      workItemId: 1001,
      note: 'OAuth2 authentication implemented for enhanced security',
      category: 'Security',
    },
    {
      workItemId: 1002,
      note: 'JWT token validation added to prevent unauthorized access',
      category: 'Security',
    },
    {
      workItemId: 1003,
      note: 'Fixed file upload size limit issue affecting large files',
      category: 'Bug Fix',
    },
    {
      workItemId: 1004,
      note: 'Content versioning support added for better content management',
      category: 'Feature',
    },
  ];

  const handleGenerateWithAI = async () => {
    console.log('🤖 AI ile Release Notes oluşturma başlatılıyor...');
    
    try {
      // Title ve description boş olan kayıtları bul
      const emptyNotes = releaseNotes.filter(note => !note.title || !note.description || note.title === '' || note.description === '');
      
      if (emptyNotes.length === 0) {
        alert('Tüm release note\'lar zaten dolu!');
        return;
      }
      
      // Sadece ilk 2 tanesini al
      const notesToProcess = emptyNotes.slice(0, 2);
      const emptyWorkItemIds = notesToProcess.map(note => note.workitemId);
      console.log(`📋 İlk ${emptyWorkItemIds.length} boş work item işlenecek (toplam ${emptyNotes.length} boş kayıt var):`, emptyWorkItemIds);
      
      // API'ye gönder
      const workItemIdsString = JSON.stringify(emptyWorkItemIds);
      const url = `http://localhost:5678/webhook/GenerateReleaseNotes?workitemIds=${encodeURIComponent(workItemIdsString)}`;
      console.log('🌐 API URL:', url);
      
      alert(`AI ile ${emptyWorkItemIds.length} adet release note oluşturuluyor (${emptyNotes.length - emptyWorkItemIds.length} adet daha var). Bu işlem biraz zaman alabilir, lütfen bekleyin...`);
      
      // Timeout süresini 5 dakikaya çıkar (AI işlemleri için)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 dakika
      
      const response = await fetch(url, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`API hatası: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ AI cevabı alındı:', data);
      
      // Firestore'u güncelle
      let updatedCount = 0;
      const releaseNotesRef = collection(db, 'masterVersionReleaseNotes');
      const snapshot = await getDocs(releaseNotesRef);
      
      for (const aiNote of data) {
        const workItemId = aiNote.WorkItemId;
        const businessNote = aiNote.Details?.release_notes?.releaseNote?.business;
        
        if (!businessNote) {
          console.warn(`⚠️ Work Item ${workItemId} için business note bulunamadı`);
          continue;
        }
        
        console.log(`🔍 Work Item ${workItemId} aranıyor (tip: ${typeof workItemId})...`);
        
        // Firestore'da karşılığını bul - Her iki tarafı da string'e çevir
        let docId = null;
        snapshot.forEach((docSnap) => {
          const docData = docSnap.data();
          const firestoreWorkItemId = docData.workitemId;
          console.log(`  Karşılaştırma: API=${String(workItemId)} vs Firestore=${String(firestoreWorkItemId)}`);
          if (String(docData.workitemId) === String(workItemId)) {
            docId = docSnap.id;
            console.log(`  ✅ Eşleşme bulundu! Doc ID: ${docId}`);
          }
        });
        
        if (!docId) {
          console.warn(`⚠️ Work Item ${workItemId} Firestore'da bulunamadı`);
          continue;
        }
        
        // Güncelle
        const docRef = doc(db, 'masterVersionReleaseNotes', docId);
        await updateDoc(docRef, {
          title: businessNote.title || '',
          description: businessNote.description || '',
          updatedAt: new Date().toISOString(),
          aiGenerated: true
        });
        
        console.log(`✅ Work Item ${workItemId} güncellendi: ${businessNote.title}`);
        updatedCount++;
      }
      
      console.log(`🎉 ${updatedCount} release note AI ile güncellendi`);
      
      // Grid'i yenile
      await fetchReleaseNotes();
      
      alert(`✅ Başarıyla tamamlandı!\n\n${updatedCount} adet release note AI ile oluşturuldu.`);
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('❌ İstek zaman aşımına uğradı');
        alert('❌ İstek zaman aşımına uğradı. Lütfen tekrar deneyin.');
      } else {
        console.error('❌ AI ile release notes oluşturma hatası:', error);
        alert('❌ Hata: ' + error.message);
      }
    }
  };

  const handleRefresh = async () => {
    if (!workItemIds || workItemIds.length === 0) {
      alert('Henüz work item verisi yüklenmedi.');
      return;
    }
    
    console.log('🔄 Work Item ID\'leri Firestore\'a kaydediliyor:', workItemIds);
    
    try {
      // Mevcut release note'ları kontrol et
      const releaseNotesRef = collection(db, 'masterVersionReleaseNotes');
      const existingDocs = await getDocs(releaseNotesRef);
      const existingWorkItemIds = new Set();
      
      existingDocs.forEach((doc) => {
        const data = doc.data();
        if (data.workitemId) {
          existingWorkItemIds.add(data.workitemId);
        }
      });
      
      console.log('📋 Mevcut work item ID\'leri:', Array.from(existingWorkItemIds));
      console.log(`🔍 Kontrol edilecek work item sayısı: ${workItemIds.length}`);
      
      // Yeni work item'ları ekle
      let addedCount = 0;
      let skippedCount = 0;
      
      for (let i = 0; i < workItemIds.length; i++) {
        const workItemId = workItemIds[i];
        console.log(`[${i + 1}/${workItemIds.length}] Work Item ${workItemId} kontrol ediliyor...`);
        
        if (existingWorkItemIds.has(workItemId)) {
          console.log(`⏭️ Work Item ${workItemId} zaten mevcut, atlandı`);
          skippedCount++;
          continue;
        }
        
        // Yeni work item ekle
        await addDoc(releaseNotesRef, {
          workitemId: workItemId,
          title: '',
          description: '',
          createdAt: new Date().toISOString()
        });
        
        // Set'e ekle (aynı batch içinde tekrar kontrol için)
        existingWorkItemIds.add(workItemId);
        
        console.log(`✅ Work Item ${workItemId} başarıyla eklendi`);
        addedCount++;
      }
      
      console.log(`📊 İşlem özeti: Toplam ${workItemIds.length}, Eklenen ${addedCount}, Atlanan ${skippedCount}`);
      
      const message = `✅ İşlem tamamlandı!\n\n` +
        `Toplam Work Item: ${workItemIds.length}\n` +
        `Yeni eklenen: ${addedCount}\n` +
        `Zaten mevcut: ${skippedCount}\n\n` +
        `Work Item ID Listesi: ${workItemIds.join(', ')}`;
      
      alert(message);
      console.log('✅ Firestore işlemi başarıyla tamamlandı');
      
      // Tabloyu yeniden yükle
      await fetchReleaseNotes();
      
    } catch (error) {
      console.error('❌ Firestore hatası:', error);
      alert('❌ Hata: ' + error.message);
    }
  };

  return (
    <Accordion sx={{ mt: 2 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
          <CheckCircleIcon color="primary" />
          <Typography variant="h6">
            Release Notes ({releaseNotes.length})
          </Typography>
          <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              startIcon={<CheckCircleIcon />}
              onClick={(e) => {
                e.stopPropagation();
                handleGenerateWithAI();
              }}
            >
              Generate with AI
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={(e) => {
                e.stopPropagation();
                handleRefresh();
              }}
            >
              Yenile
            </Button>
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {loadingNotes ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography>Release notes yükleniyor...</Typography>
          </Box>
        ) : releaseNotes.length === 0 ? (
          <Alert severity="info">
            Release note verisi bulunamadı. Yenile butonuna basarak work item'lardan release note oluşturabilirsiniz.
          </Alert>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#1976d2' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Work Item ID</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Title</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Description</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Oluşturulma</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {releaseNotes.map((note) => (
                  <TableRow key={note.id} hover>
                    <TableCell>
                      <Chip label={`#${note.workitemId}`} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      {note.title || <Typography variant="caption" color="text.secondary">Boş</Typography>}
                    </TableCell>
                    <TableCell>
                      {note.description || <Typography variant="caption" color="text.secondary">Boş</Typography>}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {note.createdAt ? new Date(note.createdAt).toLocaleString('tr-TR') : '-'}
                      </Typography>
                    </TableCell>
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

export default ReleaseNotesSection;
