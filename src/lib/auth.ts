import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { users, userRoles } from '@/db/schema/users';
import { roles, rolePermissions } from '@/db/schema/roles';
import { permissions } from '@/db/schema/permissions';
import { eq } from 'drizzle-orm';

// ============================================================
// TYPE AUGMENTATION
// Extend default NextAuth types agar bisa menyimpan data custom
// ============================================================
declare module 'next-auth' {
  interface User {
    id: string;
    roles: string[];
    permissions: string[];
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      roles: string[];
      permissions: string[];
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    roles: string[];
    permissions: string[];
  }
}

// ============================================================
// HELPER: Ambil roles & permissions user dari database
// ============================================================
async function getUserRolesAndPermissions(userId: string) {
  // Query user_roles → roles
  const userRoleRows = await db
    .select({
      roleName: roles.name,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  const roleNames = userRoleRows.map((r) => r.roleName);

  // Query role_permissions → permissions (untuk semua roles user)
  const userPermissionRows = await db
    .select({
      permissionName: permissions.name,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(userRoles.userId, userId));

  // Deduplicate permissions (jika user punya multiple roles dengan overlap)
  const permissionNames = [...new Set(userPermissionRows.map((p) => p.permissionName))];

  return { roles: roleNames, permissions: permissionNames };
}

// ============================================================
// NEXTAUTH CONFIG
// ============================================================
export const { handlers, signIn, signOut, auth } = NextAuth({
  // ---- Session Strategy ----
  session: {
    strategy: 'jwt', // Gunakan JWT, bukan database session
    maxAge: 24 * 60 * 60, // 24 jam
  },

  // ---- Custom Pages ----
  pages: {
    signIn: '/login', // Redirect ke halaman login custom
  },

  // ---- Providers ----
  providers: [
    Credentials({
      // Field yang diterima dari form login
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },

      // Fungsi authorize — dipanggil saat user submit login
      authorize: async (credentials) => {
        // 1. Validasi input
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) {
          throw new Error('Email dan password wajib diisi.');
        }

        // 2. Cari user di database
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user) {
          throw new Error('Email atau password salah.');
        }

        // 3. Cek apakah user aktif
        if (!user.isActive) {
          throw new Error('Akun Anda telah dinonaktifkan.');
        }

        // 4. Verifikasi password dengan bcrypt
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          throw new Error('Email atau password salah.');
        }

        // 5. Ambil roles & permissions dari database
        const { roles: userRoleNames, permissions: userPermissions } =
          await getUserRolesAndPermissions(user.id);

        // 6. Return user object — data ini akan masuk ke JWT callback
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          roles: userRoleNames,
          permissions: userPermissions,
        };
      },
    }),
  ],

  // ---- Callbacks ----
  callbacks: {
    // JWT callback — dipanggil setiap kali JWT token dibuat/diupdate
    jwt({ token, user }) {
      // `user` hanya ada saat pertama kali login (dari authorize)
      if (user) {
        token.id = user.id as string;
        token.roles = user.roles ?? [];
        token.permissions = user.permissions ?? [];
      }
      return token;
    },

    // Session callback — dipanggil setiap kali session dibaca
    session({ session, token }) {
      session.user.id = token.id;
      session.user.roles = token.roles;
      session.user.permissions = token.permissions;
      return session;
    },
  },
});
