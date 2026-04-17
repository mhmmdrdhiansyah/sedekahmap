import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      textAlign: 'center',
      padding: '2rem',
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚫 403</h1>
      <h2 style={{ marginBottom: '0.5rem' }}>Akses Ditolak</h2>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Anda tidak memiliki izin untuk mengakses halaman ini.
      </p>
      <Link href="/" style={{
        padding: '0.75rem 1.5rem',
        backgroundColor: '#10B981',
        color: 'white',
        borderRadius: '0.5rem',
        textDecoration: 'none',
      }}>
        Kembali ke Beranda
      </Link>
    </div>
  );
}
