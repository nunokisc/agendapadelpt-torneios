export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white py-6 dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto max-w-5xl px-4 text-center text-sm text-slate-500 dark:text-slate-400">
        Padel Torneios &copy; {new Date().getFullYear()}
      </div>
    </footer>
  );
}
