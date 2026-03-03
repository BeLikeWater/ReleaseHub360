// ═══════════════════════════════════════════════
// ProductCatalogPage — Master-detail layout for products
// ═══════════════════════════════════════════════

import { useState } from 'react';
import {
  Box, Typography, Button, TextField, InputAdornment, CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import { ConfirmDialog } from '@/components/shared';
import { useProducts, useDeleteProduct } from '@/services/productService';
import type { Product } from '@/types';
import ProductDetail from './ProductDetail';
import ProductDialog from './ProductDialog';

export default function ProductCatalogPage() {
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productDialog, setProductDialog] = useState<{ open: boolean; initial?: Product }>({ open: false });
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);

  const { data: products = [], isLoading } = useProducts();
  const deleteProductMut = useDeleteProduct();

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const handleDelete = () => {
    if (!deleteProduct) return;
    deleteProductMut.mutate(deleteProduct.id, {
      onSuccess: () => {
        if (selectedProduct?.id === deleteProduct.id) setSelectedProduct(null);
        setDeleteProduct(null);
      },
    });
  };

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* ── Left — product list ── */}
      <Box sx={{
        width: 300, flexShrink: 0,
        borderRight: '1px solid', borderColor: 'divider',
        display: 'flex', flexDirection: 'column',
      }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={700}>Ürün Kataloğu</Typography>
            <Button size="small" startIcon={<AddIcon />} variant="contained"
              onClick={() => setProductDialog({ open: true })}>
              Yeni
            </Button>
          </Box>
          <TextField
            size="small" fullWidth placeholder="Ürün ara..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
        </Box>

        <Box sx={{ overflowY: 'auto', flex: 1 }}>
          {isLoading && <CircularProgress size={20} sx={{ m: 2 }} />}
          {filtered.map((p) => (
            <Box
              key={p.id}
              onClick={() => setSelectedProduct(p)}
              sx={{
                px: 2, py: 1.5, cursor: 'pointer',
                borderBottom: '1px solid', borderColor: 'divider',
                borderLeft: '3px solid',
                borderLeftColor: selectedProduct?.id === p.id ? 'primary.main' : 'transparent',
                bgcolor: selectedProduct?.id === p.id ? 'primary.50' : 'transparent',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" fontWeight={selectedProduct?.id === p.id ? 700 : 400}>
                  {p.name}
                </Typography>
                {p.sourceControlType && (
                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                    {p.sourceControlType}
                  </Typography>
                )}
              </Box>
              {p.description && (
                <Typography variant="caption" color="text.secondary" noWrap display="block">
                  {p.description}
                </Typography>
              )}
            </Box>
          ))}
          {!isLoading && filtered.length === 0 && (
            <Typography variant="body2" color="text.disabled" sx={{ p: 2 }}>
              Ürün bulunamadı
            </Typography>
          )}
        </Box>
      </Box>

      {/* ── Right — detail ── */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {selectedProduct ? (
          <ProductDetail
            key={selectedProduct.id}
            product={selectedProduct}
            onEdit={() => setProductDialog({ open: true, initial: selectedProduct })}
            onDelete={() => setDeleteProduct(selectedProduct)}
          />
        ) : (
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography color="text.disabled">Soldan bir ürün seçin</Typography>
          </Box>
        )}
      </Box>

      {/* ── Dialogs ── */}
      <ProductDialog
        open={productDialog.open}
        onClose={() => setProductDialog({ open: false })}
        initial={productDialog.initial}
      />
      <ConfirmDialog
        open={Boolean(deleteProduct)}
        onCancel={() => setDeleteProduct(null)}
        onConfirm={handleDelete}
        message={`"${deleteProduct?.name ?? ''}" ürünü silinecek. Bu işlem geri alınamaz.`}
        loading={deleteProductMut.isPending}
      />
    </Box>
  );
}
