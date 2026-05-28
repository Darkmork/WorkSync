import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppData } from "../services/AppDataContext";

export function ProtectedRoute() {
  const location = useLocation();
  const { firebaseEnabled, isAuthenticated, loading, loadError } = useAppData();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div className="rounded-xl border border-border-subtle bg-white p-8 text-center shadow-soft">
          <p className="text-lg font-bold text-primary">Cargando WorkSync...</p>
          <p className="mt-2 text-text-secondary">Preparando tu sesion y datos de Firebase.</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div className="max-w-lg rounded-xl border border-border-subtle bg-white p-8 text-center shadow-soft">
          <p className="text-lg font-bold text-error-red">No se pudo cargar WorkSync</p>
          <p className="mt-2 text-text-secondary">{loadError}</p>
          <button className="mt-5 rounded-lg bg-primary px-5 py-3 font-bold text-white" onClick={() => window.location.reload()}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (firebaseEnabled && !isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
