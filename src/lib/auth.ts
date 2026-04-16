import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import {
  findUserByEmail,
  getUserRolesAndPermissions,
  verifyPassword,
  checkAccountLockout,
  handleFailedLogin,
  resetLoginAttempts,
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
    maxAge: 30 * 60, // 30 menit
  },

  // ---- JWT ----
  jwt: {
    maxAge: 30 * 60, // 30 menit
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
          console.info(`[AUTH] Login attempt with non-existent email: ${email}`);
          throw new Error('Email atau password salah.');
        }

        // 3. Cek apakah user aktif
        if (!user.isActive) {
          console.info(`[AUTH] Login attempt with inactive account: ${email}`);
          throw new Error('Akun Anda telah dinonaktifkan.');
        }

        // 4. Cek account lockout
        await checkAccountLockout(user);

        // 5. Verifikasi password dengan bcrypt
        const isPasswordValid = await verifyPassword(password, user.password);
        if (!isPasswordValid) {
          // Increment failed login counter
          await handleFailedLogin(user.id);
          throw new Error('Email atau password salah.');
        }

        // 6. Cek email verification (untuk user yang register sendiri, bukan admin-created)
        if (!user.emailVerifiedAt) {
          console.info(`[AUTH] Login attempt without email verification: ${email}`);
          throw new Error('EMAIL_NOT_VERIFIED:Email belum diverifikasi. Silakan cek email Anda atau minta reset password.');
        }

        // 7. Reset login attempts pada login sukses
        await resetLoginAttempts(user.id);

        // 8. Ambil roles & permissions dari database
        const { roles: userRoleNames, permissions: userPermissions } =
          await getUserRolesAndPermissions(user.id);

        console.info(`[AUTH] Login successful: ${email}, roles=${userRoleNames?.join(',') || 'none'}`);

        // 9. Return user object — data ini akan masuk ke JWT callback
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
