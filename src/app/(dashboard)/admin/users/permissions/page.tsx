"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Table, ColumnDef } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";

// ============================================================
// TYPES
// ============================================================

interface Role {
  id: string;
  name: string;
}

interface Permission {
  id: string;
  name: string;
  description: string | null;
  module: string;
  createdAt: string;
  roles: Role[];
}

type ModuleFilter = string;

// ============================================================
// CONSTANTS
// ============================================================

const MODULE_LABELS: Record<string, string> = {
  beneficiary: "Beneficiary",
  access_request: "Access Request",
  distribution: "Distribution",
  review: "Review",
  user: "User Management",
};

const AVAILABLE_MODULES = ["beneficiary", "access_request", "distribution", "review", "user"];

const MODULE_OPTIONS = [
  { value: "", label: "Semua Module" },
  ...AVAILABLE_MODULES.map((m) => ({ value: m, label: MODULE_LABELS[m] || m }))
];

// ============================================================
// PAGE COMPONENT
// ============================================================

export default function AdminPermissionsPage() {
  const { showSuccess, showError } = useToast();

  // State for data
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for filters
  const [searchQuery, setSearchQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>("");

  // Modal states
  const [modalType, setModalType] = useState<"create" | "edit" | "delete" | null>(null);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    module: "",
  });

  // Fetch permissions
  useEffect(() => {
    const fetchPermissions = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (searchQuery) params.append("search", searchQuery);
        if (moduleFilter) params.append("module", moduleFilter);

        const response = await fetch(`/api/admin/users/permissions?${params}`);

        if (!response.ok) {
          throw new Error("Gagal memuat data permissions");
        }

        const json = await response.json();
        setPermissions(json.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [searchQuery, moduleFilter]);

  // Refresh data helper
  const refreshData = async () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append("search", searchQuery);
    if (moduleFilter) params.append("module", moduleFilter);

    const res = await fetch(`/api/admin/users/permissions?${params}`);
    const json = await res.json();
    setPermissions(json.data || []);
  };

  // Open modals
  const openCreateModal = () => {
    setModalType("create");
    setFormData({
      name: "",
      description: "",
      module: "",
    });
  };

  const openEditModal = (permission: Permission) => {
    setModalType("edit");
    setSelectedPermission(permission);
    setFormData({
      name: permission.name,
      description: permission.description || "",
      module: permission.module,
    });
  };

  const openDeleteModal = (permission: Permission) => {
    setModalType("delete");
    setSelectedPermission(permission);
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedPermission(null);
  };

  // Handle form input change
  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Submit form
  const handleSubmit = async () => {
    if (!modalType) return;

    setSubmitting(true);

    try {
      let url = "/api/admin/users/permissions";
      let method = "POST";

      if (modalType === "edit" && selectedPermission) {
        url = `/api/admin/users/permissions/${selectedPermission.id}`;
        method = "PUT";
      }

      if (modalType === "delete" && selectedPermission) {
        url = `/api/admin/users/permissions/${selectedPermission.id}`;
        method = "DELETE";

        const response = await fetch(url, { method });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Gagal menghapus permission");
        }

        await refreshData();
        showSuccess("Permission berhasil dihapus");
        closeModal();
        return;
      }

      // Create or Edit permission
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Gagal menyimpan permission");
      }

      await refreshData();
      showSuccess(modalType === "create" ? "Permission berhasil dibuat" : "Permission berhasil diperbarui");
      closeModal();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  // Format permission name for display
  const formatPermissionName = (name: string) => {
    return name
      .split(":")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" - ");
  };

  // Table columns definition
  const columns: ColumnDef<Permission>[] = [
    {
      key: "name",
      header: "Nama",
      render: (_, row) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {formatPermissionName(row.name)}
          </div>
          <div className="text-xs text-gray-500">{row.name}</div>
        </div>
      ),
    },
    {
      key: "module",
      header: "Module",
      render: (_, row) => (
        <Badge variant="neutral" size="sm">
          {MODULE_LABELS[row.module] || row.module}
        </Badge>
      ),
    },
    {
      key: "description",
      header: "Deskripsi",
      render: (_, row) => (
        <div className="text-sm text-gray-600 max-w-xs truncate">
          {row.description || "-"}
        </div>
      ),
    },
    {
      key: "roles",
      header: "Roles",
      render: (_, row) => (
        <div className="flex flex-wrap gap-1">
          {row.roles.map((role) => (
            <Badge key={role.id} variant="info" size="sm">
              {role.name}
            </Badge>
          ))}
          {row.roles.length === 0 && <span className="text-xs text-gray-500">-</span>}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Aksi",
      render: (_, row) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => openEditModal(row)}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => openDeleteModal(row)}
            className="p-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-md transition-colors"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ),
    },
  ];

  const moduleSelectOptions = AVAILABLE_MODULES.map((m) => ({ value: m, label: MODULE_LABELS[m] || m }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Kelola Permissions
          </h1>
          <p className="text-gray-600">
            Kelola permissions dan hak akses sistem
          </p>
        </div>
        <Button onClick={openCreateModal}>+ Tambah Permission</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Cari permission..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Module filter */}
        <Select
          options={MODULE_OPTIONS}
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
        />
      </div>

      {/* Table */}
      <Table
        data={permissions}
        columns={columns}
        keyExtractor={(permission) => permission.id}
        loading={loading}
        error={error || undefined}
        emptyMessage="Tidak ada permission ditemukan"
      />

      {/* Create/Edit Modal */}
      {(modalType === "create" || modalType === "edit") && (
        <Modal
          isOpen={modalType === "create" || modalType === "edit"}
          onClose={closeModal}
          title={modalType === "create" ? "Tambah Permission Baru" : "Edit Permission"}
          size="md"
          footer={
            <>
              <Button variant="secondary" onClick={closeModal} disabled={submitting}>
                Batal
              </Button>
              <Button
                onClick={handleSubmit}
                isLoading={submitting}
                disabled={!formData.name || !formData.module}
              >
                {modalType === "create" ? "Buat Permission" : "Simpan"}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Permission *
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
                placeholder="Contoh: beneficiary:delete"
              />
              <p className="text-xs text-gray-500 mt-1">Format: module:action (contoh: beneficiary:create)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Module *
              </label>
              <Select
                options={[{ value: "", label: "Pilih Module" }, ...moduleSelectOptions]}
                value={formData.module}
                onChange={(e) => handleFormChange("module", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deskripsi
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleFormChange("description", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={2}
                placeholder="Deskripsi permission..."
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {modalType === "delete" && selectedPermission && (
        <Modal
          isOpen={modalType === "delete"}
          onClose={closeModal}
          title="Hapus Permission?"
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={closeModal} disabled={submitting}>
                Batal
              </Button>
              <Button variant="destructive" onClick={handleSubmit} isLoading={submitting}>
                Ya, Hapus
              </Button>
            </>
          }
        >
          <p className="text-gray-600">
            Apakah Anda yakin ingin menghapus permission <strong>{formatPermissionName(selectedPermission.name)}</strong>? Tindakan ini tidak dapat dibatalkan.
          </p>
        </Modal>
      )}
    </div>
  );
}
