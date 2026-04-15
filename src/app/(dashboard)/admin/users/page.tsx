"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Table, ColumnDef } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";

// ============================================================
// TYPES
// ============================================================

interface Role {
  id: string;
  name: string;
  description: string | null;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  roles: Role[];
  createdAt: string;
  updatedAt: string;
}

interface PaginationData {
  limit: number;
  offset: number;
  total: number;
}

type RoleFilter = "admin" | "verifikator" | "donatur";
type StatusFilter = "all" | "active" | "inactive";

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

const ROLE_FILTERS: { value: RoleFilter | ""; label: string }[] = [
  { value: "", label: "Semua Role" },
  { value: "admin", label: "Admin" },
  { value: "verifikator", label: "Verifikator" },
  { value: "donatur", label: "Donatur" },
];

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Nonaktif" },
];

// ============================================================
// PAGE COMPONENT
// ============================================================

export default function AdminUsersPage() {
  const { showSuccess, showError } = useToast();

  // State for data
  const [users, setUsers] = useState<User[]>([]);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationData>({
    limit: 20,
    offset: 0,
    total: 0,
  });

  // State for filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter | "">("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Modal states
  const [modalType, setModalType] = useState<"create" | "edit" | "roles" | "delete" | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    roleIds: [] as string[],
  });

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          limit: pagination.limit.toString(),
          offset: pagination.offset.toString(),
        });

        if (searchQuery) params.append("search", searchQuery);
        if (roleFilter) params.append("role", roleFilter);
        if (statusFilter === "active") params.append("isActive", "true");
        if (statusFilter === "inactive") params.append("isActive", "false");

        const response = await fetch(`/api/admin/users?${params}`);

        if (!response.ok) {
          throw new Error("Gagal memuat data pengguna");
        }

        const json = await response.json();
        setUsers(json.data || []);
        setPagination(json.pagination || pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [searchQuery, roleFilter, statusFilter, pagination.limit, pagination.offset]);

  // Fetch all roles for modal
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const roleMap = new Map<string, Role>();
        users.forEach((user) => {
          user.roles.forEach((role) => {
            roleMap.set(role.id, role);
          });
        });
        setAllRoles(Array.from(roleMap.values()));
      } catch (err) {
        console.error("Failed to fetch roles:", err);
      }
    };

    fetchRoles();
  }, [users]);

  // Handle search with debounce
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPagination((prev) => ({ ...prev, offset: 0 }));
  };

  // Handle filter change
  const handleRoleFilterChange = (value: RoleFilter | "") => {
    setRoleFilter(value);
    setPagination((prev) => ({ ...prev, offset: 0 }));
  };

  const handleStatusFilterChange = (value: StatusFilter) => {
    setStatusFilter(value);
    setPagination((prev) => ({ ...prev, offset: 0 }));
  };

  // Format date
  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Open modal
  const openCreateModal = () => {
    setModalType("create");
    setFormData({
      name: "",
      email: "",
      password: "",
      phone: "",
      address: "",
      roleIds: [],
    });
  };

  const openEditModal = (user: User) => {
    setModalType("edit");
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      phone: user.phone || "",
      address: user.address || "",
      roleIds: user.roles.map((r) => r.id),
    });
  };

  const openRolesModal = (user: User) => {
    setModalType("roles");
    setSelectedUser(user);
    setFormData({
      ...formData,
      roleIds: user.roles.map((r) => r.id),
    });
  };

  const openDeleteModal = (user: User) => {
    setModalType("delete");
    setSelectedUser(user);
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedUser(null);
  };

  // Handle form input change
  const handleFormChange = (field: string, value: string | string[]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle role checkbox change
  const handleRoleCheckboxChange = (roleId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      roleIds: checked
        ? [...prev.roleIds, roleId]
        : prev.roleIds.filter((id) => id !== roleId),
    }));
  };

  // Refresh data helper
  const refreshData = async () => {
    const params = new URLSearchParams({
      limit: pagination.limit.toString(),
      offset: pagination.offset.toString(),
    });

    if (searchQuery) params.append("search", searchQuery);
    if (roleFilter) params.append("role", roleFilter);
    if (statusFilter === "active") params.append("isActive", "true");
    if (statusFilter === "inactive") params.append("isActive", "false");

    const res = await fetch(`/api/admin/users?${params}`);
    const json = await res.json();
    setUsers(json.data || []);
    setPagination(json.pagination || pagination);
  };

  // Submit form
  const handleSubmit = async () => {
    if (!modalType) return;

    setSubmitting(true);

    try {
      let url = "/api/admin/users";
      let method = "POST";

      if (modalType === "edit" && selectedUser) {
        url = `/api/admin/users/${selectedUser.id}`;
        method = "PUT";
      }

      if (modalType === "roles" && selectedUser) {
        url = `/api/admin/users/${selectedUser.id}`;
        method = "PATCH";

        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "assign_roles",
            roleIds: formData.roleIds,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Gagal memperbarui role");
        }

        await refreshData();
        showSuccess("Role berhasil diperbarui");
        closeModal();
        return;
      }

      if (modalType === "delete" && selectedUser) {
        url = `/api/admin/users/${selectedUser.id}`;
        method = "DELETE";

        const response = await fetch(url, { method });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Gagal menghapus pengguna");
        }

        await refreshData();
        showSuccess("Pengguna berhasil dihapus");
        closeModal();
        return;
      }

      // Create or Edit user
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Gagal menyimpan pengguna");
      }

      await refreshData();
      showSuccess(modalType === "create" ? "Pengguna berhasil dibuat" : "Pengguna berhasil diperbarui");
      closeModal();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle toggle active
  const handleToggleActive = async (user: User) => {
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_active" }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Gagal mengubah status");
      }

      await refreshData();
      showSuccess(`Status ${user.name} berhasil diubah`);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Terjadi kesalahan");
    }
  };

  // Get available roles (for create/edit modal)
  const getAvailableRoles = () => {
    if (allRoles.length > 0) {
      return allRoles;
    }

    return [
      { id: "1", name: "admin", description: "Administrator" },
      { id: "2", name: "verifikator", description: "Verifikator" },
      { id: "3", name: "donatur", description: "Donatur" },
    ];
  };

  const availableRoles = getAvailableRoles();

  // Table columns definition
  const columns: ColumnDef<User>[] = [
    {
      key: "name",
      header: "Nama",
      render: (_, row) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{row.name}</div>
          <div className="text-sm text-gray-500">{row.phone || "-"}</div>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
    },
    {
      key: "roles",
      header: "Roles",
      render: (_, row) => (
        <div className="flex flex-wrap gap-1">
          {row.roles.map((role) => (
            <Badge key={role.id} variant={ROLE_STYLES[role.name] || "neutral"} size="sm">
              {ROLE_LABELS[role.name] || role.name}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      render: (value) => (
        <StatusBadge status={value ? "Aktif" : "Nonaktif"} />
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
            onClick={() => openRolesModal(row)}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            title="Assign Roles"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </button>
          <button
            onClick={() => handleToggleActive(row)}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            title={row.isActive ? "Deactivate" : "Activate"}
          >
            {row.isActive ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Kelola Pengguna
          </h1>
          <p className="text-gray-600">
            Kelola pengguna dan hak akses sistem
          </p>
        </div>
        <Button onClick={openCreateModal}>+ Tambah User</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Cari nama atau email..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        {/* Role filter */}
        <Select
          options={ROLE_FILTERS}
          value={roleFilter}
          onChange={(e) => handleRoleFilterChange(e.target.value as RoleFilter | "")}
        />

        {/* Status filter */}
        <Select
          options={STATUS_FILTERS}
          value={statusFilter}
          onChange={(e) => handleStatusFilterChange(e.target.value as StatusFilter)}
        />
      </div>

      {/* Table */}
      <Table
        data={users}
        columns={columns}
        keyExtractor={(user) => user.id}
        loading={loading}
        error={error || undefined}
        emptyMessage="Tidak ada pengguna ditemukan"
        pagination={{
          limit: pagination.limit,
          offset: pagination.offset,
          total: pagination.total,
          onPageChange: (newOffset) => setPagination((prev) => ({ ...prev, offset: newOffset })),
        }}
      />

      {/* Create/Edit Modal */}
      {(modalType === "create" || modalType === "edit") && (
        <Modal
          isOpen={modalType === "create" || modalType === "edit"}
          onClose={closeModal}
          title={modalType === "create" ? "Tambah User Baru" : "Edit User"}
          size="md"
          footer={
            <>
              <Button variant="secondary" onClick={closeModal} disabled={submitting}>
                Batal
              </Button>
              <Button
                onClick={handleSubmit}
                isLoading={submitting}
                disabled={!formData.name || !formData.email || (modalType === "create" && !formData.password) || formData.roleIds.length === 0}
              >
                {modalType === "create" ? "Buat User" : "Simpan"}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="Nama"
              value={formData.name}
              onChange={(e) => handleFormChange("name", e.target.value)}
              placeholder="Nama lengkap"
              required
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleFormChange("email", e.target.value)}
              placeholder="email@example.com"
              required
            />
            {modalType === "create" && (
              <Input
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => handleFormChange("password", e.target.value)}
                placeholder="Minimal 8 karakter"
                required
              />
            )}
            <Input
              label="Phone"
              value={formData.phone}
              onChange={(e) => handleFormChange("phone", e.target.value)}
              placeholder="+62..."
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => handleFormChange("address", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={2}
                placeholder="Alamat lengkap"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Roles *
              </label>
              <div className="space-y-2">
                {availableRoles.map((role) => (
                  <label key={role.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.roleIds.includes(role.id)}
                      onChange={(e) => handleRoleCheckboxChange(role.id, e.target.checked)}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">
                      {ROLE_LABELS[role.name] || role.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Assign Roles Modal */}
      {modalType === "roles" && selectedUser && (
        <Modal
          isOpen={modalType === "roles"}
          onClose={closeModal}
          title={`Assign Roles - ${selectedUser.name}`}
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={closeModal} disabled={submitting}>
                Batal
              </Button>
              <Button
                onClick={handleSubmit}
                isLoading={submitting}
                disabled={formData.roleIds.length === 0}
              >
                Simpan
              </Button>
            </>
          }
        >
          <div className="space-y-2">
            {availableRoles.map((role) => (
              <label key={role.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.roleIds.includes(role.id)}
                  onChange={(e) => handleRoleCheckboxChange(role.id, e.target.checked)}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span className="text-sm text-gray-700">
                  {ROLE_LABELS[role.name] || role.name}
                </span>
              </label>
            ))}
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {modalType === "delete" && selectedUser && (
        <Modal
          isOpen={modalType === "delete"}
          onClose={closeModal}
          title="Hapus Pengguna?"
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={closeModal} disabled={submitting}>
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={handleSubmit}
                isLoading={submitting}
              >
                Ya, Hapus
              </Button>
            </>
          }
        >
          <p className="text-gray-600">
            Apakah Anda yakin ingin menghapus pengguna <strong>{selectedUser.name}</strong>? Tindakan ini tidak dapat dibatalkan.
          </p>
        </Modal>
      )}
    </div>
  );
}
