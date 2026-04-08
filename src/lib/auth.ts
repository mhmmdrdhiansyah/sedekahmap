import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import {
  findUserByEmail,
  getUserRolesAndPermissions,
  verifyPassword,
} from '@/services/auth.service';

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

declare module 'next-auth' {
  interface JWT {
    id: string;
    roles: string[];
    permissions: string[];
  }
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
        const user = await findUserByEmail(email);

        if (!user) {
          throw new Error('Email atau password salah.');
        }

        // 3. Cek apakah user aktif
        if (!user.isActive) {
          throw new Error('Akun Anda telah dinonaktifkan.');
        }

        // 4. Verifikasi password dengan bcrypt
        const isPasswordValid = await verifyPassword(password, user.password);
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
      session.user.id = token.id as string;
      session.user.roles = token.roles as string[];
      session.user.permissions = token.permissions as string[];
      return session;
    },
  },
});
