"use client";

import { useState } from "react";

export default function PublicNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-[1000] bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <a href="/" className="text-primary font-bold text-xl">
              SedekahMap
            </a>
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            <a href="/" className="text-gray-700 hover:text-primary transition-colors">
              Beranda
            </a>
            <a href="/#peta" className="text-gray-700 hover:text-primary transition-colors">
              Peta
            </a>
            <a href="/login" className="text-gray-700 hover:text-primary transition-colors">
              Login
            </a>
            <a
              href="/register"
              className="bg-primary text-white rounded-lg px-4 py-2 hover:bg-primary-dark transition-colors"
            >
              Daftar
            </a>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="md:hidden">
            <button
              type="button"
              className="text-gray-700 hover:text-primary focus:outline-none"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100">
          <div className="px-4 py-4 space-y-3">
            <a
              href="/"
              className="block text-gray-700 hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Beranda
            </a>
            <a
              href="/#peta"
              className="block text-gray-700 hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Peta
            </a>
            <a
              href="/login"
              className="block text-gray-700 hover:text-primary transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Login
            </a>
            <a
              href="/register"
              className="block bg-primary text-white rounded-lg px-4 py-2 text-center hover:bg-primary-dark transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Daftar
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
