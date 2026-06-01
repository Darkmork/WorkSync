import { useState } from "react";
import { Check, User } from "lucide-react";
import { useAppData } from "../services/AppDataContext";

export function ProfilePage() {
  const { currentUser, updateProfile } = useAppData();
  const [name, setName] = useState(currentUser?.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl ?? "");
  const [context, setContext] = useState(currentUser?.context ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;
    setStatus("saving");
    try {
      await updateProfile({ name: name.trim(), avatarUrl: avatarUrl.trim() || undefined, context: context.trim() });
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2500);
    } catch {
      setStatus("error");
    }
  };

  if (!currentUser) {
    return <div className="rounded-xl bg-white p-8 shadow-soft">Cargando perfil...</div>;
  }

  return (
    <div className="space-y-8 pb-20 lg:pb-0">
      <section className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold">Mi perfil</h1>
        <p className="text-text-secondary">Actualiza tu informacion personal en WorkSync.</p>
      </section>

      <section className="max-w-xl rounded-2xl bg-white p-6 shadow-soft dark:bg-[#252829]">
        <div className="mb-6 flex items-center gap-4">
          {currentUser.avatarUrl ? (
            <img
              className="h-20 w-20 rounded-full border-2 border-primary object-cover"
              src={currentUser.avatarUrl}
              alt={currentUser.name}
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary bg-primary/10">
              <User size={36} className="text-primary" />
            </div>
          )}
          <div>
            <p className="text-xl font-bold">{currentUser.name}</p>
            <p className="text-sm text-text-secondary">{currentUser.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-semibold">
              Nombre
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border-subtle bg-surface-container-lowest px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-[#424754] dark:bg-[#2d3134] dark:text-[#e1e3e4]"
              placeholder="Tu nombre"
              required
            />
          </div>

          <div>
            <label htmlFor="avatarUrl" className="mb-1.5 block text-sm font-semibold">
              URL de avatar
            </label>
            <input
              id="avatarUrl"
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full rounded-lg border border-border-subtle bg-surface-container-lowest px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-[#424754] dark:bg-[#2d3134] dark:text-[#e1e3e4]"
              placeholder="https://example.com/avatar.jpg"
            />
          </div>

          <div>
            <label htmlFor="context" className="mb-1.5 block text-sm font-semibold">
              Contexto
            </label>
            <textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-border-subtle bg-surface-container-lowest px-4 py-2.5 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-[#424754] dark:bg-[#2d3134] dark:text-[#e1e3e4] resize-none"
              placeholder="Describe tu contexto o preferencias..."
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={status === "saving"}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white transition-transform active:scale-95 disabled:opacity-60"
            >
              {status === "saving" ? (
                "Guardando..."
              ) : status === "saved" ? (
                <>
                  <Check size={16} />
                  Guardado
                </>
              ) : (
                "Guardar cambios"
              )}
            </button>
            {status === "error" && (
              <p className="text-sm text-error">No se pudo guardar. Intenta de nuevo.</p>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}