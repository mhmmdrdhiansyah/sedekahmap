export default function PublicFooter() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h3 className="text-xl font-bold text-primary">SedekahMap</h3>
          <p className="mt-2 text-sm text-gray-400">
            Platform Distribusi Sedekah Tepat Sasaran Berbasis Peta
          </p>
          <p className="mt-4 text-xs text-gray-500">
            &copy; {new Date().getFullYear()} SedekahMap. Hak Cipta Dilindungi.
          </p>
        </div>
      </div>
    </footer>
  );
}
