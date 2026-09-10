export default function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-secondary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-on-surface-variant">Cargando...</p>
      </div>
    </div>
  );
}
