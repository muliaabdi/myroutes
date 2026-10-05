import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 - Halaman Tidak Ditemukan | MyRoutes",
  description: "Halaman yang Anda cari tidak dapat ditemukan atau telah dipindahkan.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6 bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 font-black text-3xl">
          404
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Halaman Tidak Ditemukan</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Tautan yang Anda tuju mungkin sudah kedaluwarsa, berpindah alamat, atau belum terdaftar.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-sm"
          >
            Peta Utama
          </Link>
          <Link
            href="/cctv"
            className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium text-sm transition-colors"
          >
            Direktori CCTV
          </Link>
        </div>
      </div>
    </main>
  );
}
