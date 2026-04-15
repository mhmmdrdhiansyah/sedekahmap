"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Table, ColumnDef } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";

// ============================================================
// TYPES
// ============================================================

interface Permission {
  id: string;
  name: string;
  description: string | null;
  module: string;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  permissions: Permission[];
}

// ============================================================
// CONSTANTS
// ============================================================

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  verifikator: "Verifikator",
  donatur: "Donatur",
};

const ROLE_STYLES: Record<string, "success" | "error" | "info" | "warning" | "neutral"> = {
  admin: "error",
  verifikator: "info",
  donatur: "success",
};

const SYSTEM_ROLES = ["admin", "verifikator", "donatur"];

// ============================================================
// PAGE COMPONENT
// ============================================================

export default function AdminRolesPage() {
  const { showSuccess, showError } = useToast();

  // State for data
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [modalType, setModalType] = useState<"create" | "edit" | "permissions" | "delete" | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissionIds: [] as string[],
  });

  // Fetch roles
  useEffect(() => {
    const fetchRoles = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/admin/users/roles");

        if (!response.ok) {
          throw new Error("Gagal memuat data roles");
        }

        const json = await response.json();
        setRoles(json.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, []);

  // Fetch all permissions for modals
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await fetch("/api/admin/users/permissions");

        if (!response.ok) {
          throw new Error("Gagal memuat data permissions");
        }

        const json = await response.json();
        setAllPermissions(json.data || []);
      } catch (err) {
        console.error("Failed to fetch permissions:", err);
      }
    };

    fetchPermissions();
  }, []);

  // Refresh data helper
  const refreshData = async () => {
    const res = await fetch("/api/admin/users/roles");
    const json = await res.json();
    setRoles(json.data || []);
  };

  // Open modals
  const openCreateModal = () => {
    setModalType("create");
    setFormData({
      name: "",
      description: "",
      permissionIds: [],
    });
  };

  const openEditModal = (role: Role) => {
    setModalType("edit");
    setSelectedRole(role);
    setFormData({
      name: role.name,
      description: role.description || "",
      permissionIds: role.permissions.map((p) => p.id),
    });
  };

  const openPermissionsModal = (role: Role) => {
    setModalType("permissions");
    setSelectedRole(role);
    setFormData({
      ...formData,
      permissionIds: role.permissions.map((p) => p.id),
    });
  };

  const openDeleteModal = (role: Role) => {
    setModalType("delete");
    setSelectedRole(role);
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedRole(null);
  };

  // Handle form input change
  const handleFormChange = (field: string, value: string | string[]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle permission checkbox change
  const handlePermissionCheckboxChange = (permissionId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      permissionIds: checked
        ? [...prev.permissionIds, permissionId]
        : prev.permissionIds.filter((id) => id !== permissionId),
    }));
  };

  // Submit form
  const handleSubmit = async () => {
    if (!modalType) return;

    setSubmitting(true);

    try {
      let url = "/api/admin/users/roles";
      let method = "POST";

      if (modalType === "edit" && selectedRole) {
        url = `/api/admin/users/roles/${selectedRole.id}`;
        method = "PUT";
      }

      if (modalType === "permissions" && selectedRole) {
        url = `/api/admin/users/roles/${selectedRole.id}`;
        method = "PATCH";

        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "assign_permissions",
            permissionIds: formData.permissionIds,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Gagal memperbarui permissions");
        }

        await refreshData();
        showSuccess("Permissions berhasil diperbarui");
        closeModal();
        return;
      }

      if (modalType === "delete" && selectedRole) {
        url = `/api/admin/users/roles/${selectedRole.id}`;
        method = "DELETE";

        const response = await fetch(url, { method });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Gagal menghapus role");
        }

        await refreshData();
        showSuccess("Role berhasil dihapus");
        closeModal();
        return;
      }

      // Create or Edit role
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          permissionIds: formData.permissionIds,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Gagal menyimpan role");
      }

      await refreshData();
      showSuccess(modalType === "create" ? "Role berhasil dibuat" : "Role berhasil diperbarui");
      closeModal();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  // Group permissions by module
  const groupedPermissions = allPermissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  // Table columns definition
  const columns: ColumnDef<Role>[] = [
    {
      key: "name",
      header: "Nama",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Badge variant={ROLE_STYLES[row.name] || "neutral"} size="sm">
            {ROLE_LABELS[row.name] || row.name}
          </Badge>
          {SYSTEM_ROLES.includes(row.name) && (
            <span className="text-xs text-gray-500">(Sistem)</span>
          )}
        </div>
      ),
    },
    {
      key: "description",
      header: "Deskripsi",
      render: (_, row) => (
        <div className="text-sm text-gray-900">{row.description || "-"}</div>
      ),
    },
    {
      key: "permissions",
      header: "Permissions",
      render: (_, row) => (
        <div className="text-sm text-gray-600">{row.permissions.length} permissions</div>
      ),
    },
    {
      key: "actions",
      header: "Aksi",
      render: (_, row) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => openPermissionsModal(row)}
          >
            Permissions
          </Button>
          <button
            onClick={() => openEditModal(row)}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          {!SYSTEM_ROLES.includes(row.name) && (
            <button
              onClick={() => openDeleteModal(row)}
              className="p-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-md transition-colors"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Kelola Roles
          </h1>
          <p className="text-gray-600">
            Kelola roles dan hak akses sistem
          </p>
        </div>
        <Button onClick={openCreateModal}>+ Tambah Role</Button>
      </div>

      {/* Table */}
      <Table
        data={roles}
        columns={columns}
        keyExtractor={(role) => role.id}
        loading={loading}
        error={error || undefined}
        emptyMessage="Tidak ada role ditemukan"
      />

      {/* Create/Edit Modal */}
      {(modalType === "create" || modalType === "edit") && (
        <Modal
          isOpen={modalType === "create" || modalType === "edit"}
          onClose={closeModal}
          title={modalType === "create" ? "Tambah Role Baru" : "Edit Role"}
          size="md"
          footer={
            <>
              <Button variant="secondary" onClick={closeModal} disabled={submitting}>
                Batal
              </Button>
              <Button
                onClick={handleSubmit}
                isLoading={submitting}
                disabled={!formData.name || (modalType === "create" && formData.permissionIds.length === 0)}
              >
                {modalType === "create" ? "Buat Role" : "Simpan"}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Role *
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
                placeholder="Contoh: moderator"
                disabled={modalType === "edit"}
              />
              {modalType === "edit" && (
                <p className="text-xs text-gray-500 mt-1">Nama role tidak dapat diubah</p>
              )}
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
                placeholder="Deskripsi role..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Permissions *
              </label>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {Object.entries(groupedPermissions).map(([module, perms]) => (
                  <div key={module}>
                    <p className="text-xs font-medium text-gray-700 uppercase mb-1">
                      {module}
                    </p>
                    {perms.map((permission) => (
                      <label key={permission.id} className="flex items-center gap-2 ml-2">
                        <input
                          type="checkbox"
                          checked={formData.permissionIds.includes(permission.id)}
                          onChange={(e) => handlePermissionCheckboxChange(permission.id, e.target.checked)}
                          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <span className="text-sm text-gray-700">
                          {permission.name}
                        </span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Assign Permissions Modal */}
      {modalType === "permissions" && selectedRole && (
        <Modal
          isOpen={modalType === "permissions"}
          onClose={closeModal}
          title={`Permissions - ${ROLE_LABELS[selectedRole.name] || selectedRole.name}`}
          size="md"
          footer={
            <>
              <Button variant="secondary" onClick={closeModal} disabled={submitting}>
                Batal
              </Button>
              <Button onClick={handleSubmit} isLoading={submitting}>
                Simpan
              </Button>
            </>
          }
        >
          <div className="max-h-60 overflow-y-auto space-y-2">
            {Object.entries(groupedPermissions).map(([module, perms]) => (
              <div key={module}>
                <p className="text-xs font-medium text-gray-700 uppercase mb-1">
                  {module}
                </p>
                {perms.map((permission) => (
                  <label key={permission.id} className="flex items-center gap-2 ml-2">
                    <input
                      type="checkbox"
                      checked={formData.permissionIds.includes(permission.id)}
                      onChange={(e) => handlePermissionCheckboxChange(permission.id, e.target.checked)}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">
                      {permission.name}
                    </span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {modalType === "delete" && selectedRole && (
        <Modal
          isOpen={modalType === "delete"}
          onClose={closeModal}
          title="Hapus Role?"
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
            Apakah Anda yakin ingin menghapus role <strong>{ROLE_LABELS[selectedRole.name] || selectedRole.name}</strong>? Tindakan ini tidak dapat dibatalkan.
          </p>
        </Modal>
      )}
    </div>
  );
}
