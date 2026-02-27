# Firebase Entegrasyonu Kullanım Kılavuzu

## Kurulum
Firebase entegrasyonu tamamlandı. `src/firebase.js` dosyası oluşturuldu ve Firebase SDK kuruldu.

## Kullanım Örnekleri

### 1. Veri Kaydetme (Add Document)

```javascript
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

// Örnek: Release verisi kaydetme
const saveRelease = async (releaseData) => {
  try {
    const docRef = await addDoc(collection(db, "releases"), {
      productName: releaseData.productName,
      version: releaseData.version,
      releaseDate: releaseData.releaseDate,
      createdAt: new Date(),
    });
    console.log("Document written with ID: ", docRef.id);
  } catch (e) {
    console.error("Error adding document: ", e);
  }
};
```

### 2. Veri Okuma (Get Documents)

```javascript
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

// Örnek: Tüm release'leri getirme
const getReleases = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "releases"));
    const releases = [];
    querySnapshot.forEach((doc) => {
      releases.push({ id: doc.id, ...doc.data() });
    });
    return releases;
  } catch (e) {
    console.error("Error getting documents: ", e);
  }
};
```

### 3. Veri Güncelleme (Update Document)

```javascript
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

// Örnek: Release güncelleme
const updateRelease = async (releaseId, newData) => {
  try {
    const releaseRef = doc(db, "releases", releaseId);
    await updateDoc(releaseRef, {
      version: newData.version,
      updatedAt: new Date(),
    });
    console.log("Document updated");
  } catch (e) {
    console.error("Error updating document: ", e);
  }
};
```

### 4. Veri Silme (Delete Document)

```javascript
import { db } from '../firebase';
import { doc, deleteDoc } from 'firebase/firestore';

// Örnek: Release silme
const deleteRelease = async (releaseId) => {
  try {
    await deleteDoc(doc(db, "releases", releaseId));
    console.log("Document deleted");
  } catch (e) {
    console.error("Error deleting document: ", e);
  }
};
```

### 5. Real-time Listener (Anlık Dinleme)

```javascript
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

// Örnek: Release'leri anlık dinleme
const listenToReleases = (callback) => {
  const unsubscribe = onSnapshot(collection(db, "releases"), (snapshot) => {
    const releases = [];
    snapshot.forEach((doc) => {
      releases.push({ id: doc.id, ...doc.data() });
    });
    callback(releases);
  });
  
  // Dinlemeyi durdurmak için:
  // unsubscribe();
  
  return unsubscribe;
};
```

### 6. Filtreleme ve Sıralama

```javascript
import { db } from '../firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

// Örnek: Belirli bir ürüne ait release'leri getirme
const getReleasesByProduct = async (productName) => {
  try {
    const q = query(
      collection(db, "releases"),
      where("productName", "==", productName),
      orderBy("releaseDate", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    const releases = [];
    querySnapshot.forEach((doc) => {
      releases.push({ id: doc.id, ...doc.data() });
    });
    return releases;
  } catch (e) {
    console.error("Error getting documents: ", e);
  }
};
```

## Örnek Component Entegrasyonu

```javascript
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';

const ExampleComponent = () => {
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);

  // Component mount olduğunda verileri getir
  useEffect(() => {
    const fetchReleases = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "releases"));
        const releasesData = [];
        querySnapshot.forEach((doc) => {
          releasesData.push({ id: doc.id, ...doc.data() });
        });
        setReleases(releasesData);
      } catch (error) {
        console.error("Error fetching releases:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReleases();
  }, []);

  // Yeni release kaydetme
  const handleAddRelease = async (releaseData) => {
    try {
      const docRef = await addDoc(collection(db, "releases"), {
        ...releaseData,
        createdAt: new Date(),
      });
      console.log("Release added with ID:", docRef.id);
      // Listeyi güncelle
    } catch (error) {
      console.error("Error adding release:", error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {/* Component içeriği */}
    </div>
  );
};
```

## Firestore Collection Yapısı Önerileri

### releases
```javascript
{
  productName: string,
  version: string,
  releaseDate: timestamp,
  status: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### pullRequests
```javascript
{
  prId: number,
  title: string,
  service: string,
  branch: string,
  author: string,
  status: string,
  workItems: array,
  createdAt: timestamp
}
```

### workItems
```javascript
{
  workItemId: number,
  title: string,
  type: string,
  assignedTo: string,
  state: string,
  prIds: array,
  createdAt: timestamp
}
```

## Notlar
- Firebase otomatik olarak `src/firebase.js` dosyasından import edilebilir
- `db` instance'ı Firestore veritabanına erişim sağlar
- Tüm Firebase işlemleri async/await veya Promise kullanır
- Error handling mutlaka yapılmalı
- Component'lerde `useEffect` ile veri çekme işlemleri yapılabilir
- Real-time listener kullanıldığında component unmount olduğunda dinleme durdurulmalı
