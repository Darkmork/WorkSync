import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerWithEmail, loginWithEmail, loginWithGoogle } from "../services/auth";
import { isFirebaseConfigured, requiresFirebaseAuth } from "../services/firebase";
import { Logo } from "../components/Logo";
import { useAppData } from "../services/AppDataContext";

export function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, firebaseEnabled } = useAppData();

  useEffect(() => {
    if (firebaseEnabled && isAuthenticated) navigate("/");
  }, [firebaseEnabled, isAuthenticated, navigate]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    if (!isFirebaseConfigured) {
      setMessage("Modo demo activo. Configura Firebase para autenticacion real online.");
      navigate("/");
      return;
    }
    try {
      setSubmitting(true);
      if (mode === "login") await loginWithEmail(email, password);
      else await registerWithEmail(name, email, password);
      navigate("/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo autenticar. Revisa email y password.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitGoogle = async () => {
    setMessage("");
    if (!isFirebaseConfigured) {
      setMessage("Firebase no esta configurado para iniciar sesion con Google.");
      return;
    }
    try {
      setSubmitting(true);
      await loginWithGoogle();
      navigate("/");
    } catch (error) {
      setMessage(formatAuthError(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-lift md:grid-cols-[1.05fr_0.95fr]">
        <div className="bg-gradient-to-br from-primary to-secondary p-10 text-white">
          <Logo />
          <div className="mt-24 max-w-md">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-white/70">WorkSync</p>
            <h1 className="mt-3 text-4xl font-bold leading-tight">Encuentra el mejor momento para sincronizar.</h1>
            <p className="mt-4 text-lg text-white/80">
              Coordina grupos, cruza horarios y confirma sesiones sin volver a perseguir respuestas por chat.
            </p>
          </div>
        </div>
        <form onSubmit={submit} className="flex flex-col justify-center p-8 md:p-10">
          <h2 className="text-3xl font-bold text-on-surface">{mode === "login" ? "Iniciar sesion" : "Crear cuenta"}</h2>
          <p className="mt-2 text-on-surface-variant">
            {firebaseEnabled
              ? requiresFirebaseAuth
                ? "Entra con tu cuenta Google para cargar tus datos online."
                : "Firebase Firestore activo: la app ya guarda datos online. Auth queda pendiente de habilitar."
              : "Modo demo activo: agrega .env.local para Firebase real."}
          </p>
          <button
            type="button"
            disabled={submitting || !firebaseEnabled}
            onClick={submitGoogle}
            className="mt-6 flex items-center justify-center gap-3 rounded-lg border border-border-subtle bg-white px-5 py-3 font-bold text-on-surface shadow-sm transition hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-white font-bold text-primary">G</span>
            Continuar con Google
          </button>
          <div className="my-6 flex items-center gap-3 text-xs font-bold uppercase text-text-secondary">
            <span className="h-px flex-1 bg-border-subtle" />
            Email
            <span className="h-px flex-1 bg-border-subtle" />
          </div>
          {mode === "register" && (
            <label className="block">
              <span className="font-mono text-xs uppercase text-text-secondary">Nombre</span>
              <input className="mt-2 w-full rounded-lg border border-border-subtle bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary" value={name} onChange={(event) => setName(event.target.value)} />
            </label>
          )}
          <label className="mt-6 block">
            <span className="font-mono text-xs uppercase text-text-secondary">Email</span>
            <input className="mt-2 w-full rounded-lg border border-border-subtle bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="mt-4 block">
            <span className="font-mono text-xs uppercase text-text-secondary">Password</span>
            <input type="password" className="mt-2 w-full rounded-lg border border-border-subtle bg-surface-container-low px-4 py-3 outline-none focus:ring-2 focus:ring-primary" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {message && <p className="mt-4 rounded-lg bg-primary-fixed px-4 py-3 text-sm text-primary">{message}</p>}
          <button disabled={submitting} className="mt-6 rounded-lg bg-primary px-5 py-3 font-bold text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? "Conectando..." : mode === "login" ? "Entrar a WorkSync" : "Registrarme"}
          </button>
          <button type="button" className="mt-4 text-sm font-bold text-primary" onClick={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "Crear una cuenta nueva" : "Ya tengo cuenta"}
          </button>
        </form>
      </section>
    </main>
  );
}

function formatAuthError(error: unknown) {
  if (typeof error === "object" && error && "code" in error && error.code === "auth/configuration-not-found") {
    return "Firebase Auth aun no esta habilitado en este proyecto. Activa Authentication > Sign-in method > Google en Firebase Console y vuelve a intentar.";
  }
  const message = error instanceof Error ? error.message : "No se pudo autenticar con Google.";
  if (message.includes("CONFIGURATION_NOT_FOUND") || message.includes("configuration-not-found")) {
    return "Firebase Auth aun no esta habilitado en este proyecto. Activa Authentication > Sign-in method > Google en Firebase Console y vuelve a intentar.";
  }
  if (message.includes("auth/unauthorized-domain")) {
    return "Este dominio no esta autorizado en Firebase Auth. Agrega worksync-gangale.web.app y 127.0.0.1 en Authorized domains.";
  }
  if (message.includes("auth/popup-closed-by-user")) {
    return "Se cerro la ventana de Google antes de completar el inicio de sesion.";
  }
  return message;
}
