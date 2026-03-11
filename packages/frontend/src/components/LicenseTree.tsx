import { useCallback, useEffect, useMemo } from 'react';
import {
  Box, Checkbox, FormControlLabel, Typography, Skeleton,
  Alert, Chip, Button, Divider, Stack,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import api from '@/api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LicenseService {
  id: string;
  name: string;
}

interface LicenseModule {
  id: string;
  name: string;
  services: LicenseService[];
}

interface LicenseModuleGroup {
  id: string;
  name: string;
  modules: LicenseModule[];
}

interface LicenseTreeData {
  productId: string;
  productName: string;
  moduleGroups: LicenseModuleGroup[];
}

export interface LicenseSelection {
  licensedModuleGroupIds: string[];
  licensedModuleIds: string[];
  licensedServiceIds: string[];
}

export interface LicenseTreeProps {
  /** Product ID to fetch the tree for */
  productId: string;
  /** Controlled selection state */
  value: LicenseSelection;
  /** Called when selection changes */
  onChange: (selection: LicenseSelection) => void;
  /** Read-only display mode */
  readOnly?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function allServiceIds(group: LicenseModuleGroup): string[] {
  return group.modules.flatMap((m) => m.services.map((s) => s.id));
}

function allModuleIds(group: LicenseModuleGroup): string[] {
  return group.modules.map((m) => m.id);
}

function buildFullSelection(data: LicenseTreeData): LicenseSelection {
  const moduleGroups = data.moduleGroups.map((g) => g.id);
  const modules = data.moduleGroups.flatMap((g) => g.modules.map((m) => m.id));
  const services = data.moduleGroups.flatMap((g) =>
    g.modules.flatMap((m) => m.services.map((s) => s.id))
  );
  return { licensedModuleGroupIds: moduleGroups, licensedModuleIds: modules, licensedServiceIds: services };
}

// ─── LicenseTree ──────────────────────────────────────────────────────────────

export default function LicenseTree({ productId, value, onChange, readOnly = false }: LicenseTreeProps) {
  const { data, isLoading, isError } = useQuery<LicenseTreeData>({
    queryKey: ['license-tree', productId],
    queryFn: () => api.get(`/products/${productId}/license-tree`).then((r) => r.data),
    enabled: !!productId,
  });

  // When product changes and tree loads, if no selection exists → select all
  useEffect(() => {
    if (!data) return;
    const hasNoSelection =
      value.licensedModuleGroupIds.length === 0 &&
      value.licensedModuleIds.length === 0 &&
      value.licensedServiceIds.length === 0;
    if (hasNoSelection) {
      onChange(buildFullSelection(data));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const totalServices = useMemo(
    () => data?.moduleGroups.reduce((acc, g) => acc + allServiceIds(g).length, 0) ?? 0,
    [data]
  );

  const handleSelectAll = useCallback(() => {
    if (!data) return;
    onChange(buildFullSelection(data));
  }, [data, onChange]);

  const handleDeselectAll = useCallback(() => {
    onChange({ licensedModuleGroupIds: [], licensedModuleIds: [], licensedServiceIds: [] });
  }, [onChange]);

  const toggleService = (serviceId: string, moduleId: string, groupId: string, module: LicenseModule, group: LicenseModuleGroup) => {
    if (readOnly) return;
    const isSelected = value.licensedServiceIds.includes(serviceId);
    let newServiceIds: string[];
    let newModuleIds = [...value.licensedModuleIds];
    let newGroupIds = [...value.licensedModuleGroupIds];

    if (isSelected) {
      // Deselect service
      newServiceIds = value.licensedServiceIds.filter((id) => id !== serviceId);
      // If no service in module remains, remove module
      const remainingInModule = module.services.filter((s) => s.id !== serviceId && newServiceIds.includes(s.id));
      if (remainingInModule.length === 0) {
        newModuleIds = newModuleIds.filter((id) => id !== moduleId);
      }
      // If no module in group remains, remove group
      const remainingModulesInGroup = group.modules.filter((m) =>
        m.id !== moduleId ? newModuleIds.includes(m.id) : remainingInModule.length > 0
      );
      if (remainingModulesInGroup.length === 0) {
        newGroupIds = newGroupIds.filter((id) => id !== groupId);
      }
    } else {
      // Select service
      newServiceIds = [...value.licensedServiceIds, serviceId];
      // Add module if not present
      if (!newModuleIds.includes(moduleId)) newModuleIds.push(moduleId);
      // Add group if not present
      if (!newGroupIds.includes(groupId)) newGroupIds.push(groupId);
    }

    onChange({ licensedModuleGroupIds: newGroupIds, licensedModuleIds: newModuleIds, licensedServiceIds: newServiceIds });
  };

  const toggleModule = (module: LicenseModule, groupId: string, group: LicenseModuleGroup) => {
    if (readOnly) return;
    const allSvcs = module.services.map((s) => s.id);
    const isModuleSelected = value.licensedModuleIds.includes(module.id);

    let newServiceIds: string[];
    let newModuleIds: string[];
    let newGroupIds = [...value.licensedModuleGroupIds];

    if (isModuleSelected) {
      // Deselect module + its services
      newServiceIds = value.licensedServiceIds.filter((id) => !allSvcs.includes(id));
      newModuleIds = value.licensedModuleIds.filter((id) => id !== module.id);
      // Remove group if no modules remain
      const remainingModulesInGroup = group.modules.filter((m) => m.id !== module.id && newModuleIds.includes(m.id));
      if (remainingModulesInGroup.length === 0) {
        newGroupIds = newGroupIds.filter((id) => id !== groupId);
      }
    } else {
      // Select module + all services
      newServiceIds = [...new Set([...value.licensedServiceIds, ...allSvcs])];
      newModuleIds = [...new Set([...value.licensedModuleIds, module.id])];
      if (!newGroupIds.includes(groupId)) newGroupIds.push(groupId);
    }

    onChange({ licensedModuleGroupIds: newGroupIds, licensedModuleIds: newModuleIds, licensedServiceIds: newServiceIds });
  };

  const toggleGroup = (group: LicenseModuleGroup) => {
    if (readOnly) return;
    const isGroupSelected = value.licensedModuleGroupIds.includes(group.id);
    const groupModuleIds = allModuleIds(group);
    const groupServiceIds = allServiceIds(group);

    let newServiceIds: string[];
    let newModuleIds: string[];
    let newGroupIds: string[];

    if (isGroupSelected) {
      // Deselect all in group
      newServiceIds = value.licensedServiceIds.filter((id) => !groupServiceIds.includes(id));
      newModuleIds = value.licensedModuleIds.filter((id) => !groupModuleIds.includes(id));
      newGroupIds = value.licensedModuleGroupIds.filter((id) => id !== group.id);
    } else {
      // Select all in group
      newServiceIds = [...new Set([...value.licensedServiceIds, ...groupServiceIds])];
      newModuleIds = [...new Set([...value.licensedModuleIds, ...groupModuleIds])];
      newGroupIds = [...new Set([...value.licensedModuleGroupIds, group.id])];
    }

    onChange({ licensedModuleGroupIds: newGroupIds, licensedModuleIds: newModuleIds, licensedServiceIds: newServiceIds });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (!productId) {
    return (
      <Alert severity="info">Lisans ağacını görmek için önce bir ürün seçin.</Alert>
    );
  }

  if (isLoading) {
    return (
      <Box>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} height={36} sx={{ mb: 0.5 }} />
        ))}
      </Box>
    );
  }

  if (isError || !data) {
    return <Alert severity="error">Lisans ağacı yüklenemedi.</Alert>;
  }

  if (data.moduleGroups.length === 0) {
    return (
      <Alert severity="info">Bu ürüne henüz modül grubu tanımlanmamış.</Alert>
    );
  }

  return (
    <Box>
      {/* Summary + controls */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" color="text.secondary">Lisanslı:</Typography>
          <Chip
            size="small"
            label={`${value.licensedServiceIds.length} / ${totalServices} servis`}
            color={value.licensedServiceIds.length === totalServices ? 'success' : 'primary'}
            variant="outlined"
          />
          {value.licensedServiceIds.length < totalServices && value.licensedServiceIds.length > 0 && (
            <Typography variant="caption" color="warning.main">
              {totalServices - value.licensedServiceIds.length} servis lisans dışı
            </Typography>
          )}
        </Stack>
        {!readOnly && (
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="text" onClick={handleSelectAll}>Tümünü Seç</Button>
            <Button size="small" variant="text" color="inherit" onClick={handleDeselectAll}>Tümünü Kaldır</Button>
          </Stack>
        )}
      </Stack>

      <Divider sx={{ mb: 1.5 }} />

      {/* Tree */}
      {data.moduleGroups.map((group) => {
        const groupSelected = value.licensedModuleGroupIds.includes(group.id);
        const groupServiceIds = allServiceIds(group);
        const selectedInGroup = groupServiceIds.filter((id) => value.licensedServiceIds.includes(id)).length;
        const groupIndeterminate = !groupSelected && selectedInGroup > 0;
        const isGroupChecked = groupSelected || groupIndeterminate;

        return (
          <Box key={group.id} mb={1}>
            {/* ModuleGroup row */}
            <FormControlLabel
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" fontWeight={600}>{group.name}</Typography>
                  <Chip size="small" label={`${selectedInGroup}/${groupServiceIds.length}`} sx={{ height: 18, fontSize: 11 }} />
                </Stack>
              }
              control={
                <Checkbox
                  checked={isGroupChecked}
                  indeterminate={groupIndeterminate}
                  onChange={() => toggleGroup(group)}
                  disabled={readOnly}
                  size="small"
                />
              }
            />

            {/* Modules */}
            {group.modules.map((mod) => {
              const modSelected = value.licensedModuleIds.includes(mod.id);
              const selectedInMod = mod.services.filter((s) => value.licensedServiceIds.includes(s.id)).length;
              const modIndeterminate = !modSelected && selectedInMod > 0;
              const isModChecked = modSelected || modIndeterminate;

              return (
                <Box key={mod.id} pl={4}>
                  {/* Module row */}
                  <FormControlLabel
                    label={
                      <Typography variant="body2" color={isModChecked ? 'text.primary' : 'text.disabled'}>
                        {mod.name}
                      </Typography>
                    }
                    control={
                      <Checkbox
                        checked={isModChecked}
                        indeterminate={modIndeterminate}
                        onChange={() => toggleModule(mod, group.id, group)}
                        disabled={readOnly}
                        size="small"
                      />
                    }
                  />

                  {/* Services */}
                  {mod.services.map((svc) => {
                    const svcSelected = value.licensedServiceIds.includes(svc.id);
                    return (
                      <Box key={svc.id} pl={4}>
                        <FormControlLabel
                          label={
                            <Typography
                              variant="caption"
                              color={svcSelected ? 'text.primary' : 'text.disabled'}
                              fontFamily="monospace"
                            >
                              {svc.name}
                            </Typography>
                          }
                          control={
                            <Checkbox
                              checked={svcSelected}
                              onChange={() => toggleService(svc.id, mod.id, group.id, mod, group)}
                              disabled={readOnly}
                              size="small"
                              sx={{ py: 0.25 }}
                            />
                          }
                        />
                      </Box>
                    );
                  })}
                </Box>
              );
            })}
          </Box>
        );
      })}
    </Box>
  );
}
