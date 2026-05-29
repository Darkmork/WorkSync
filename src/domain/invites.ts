const APP_URL = "https://worksync-gangale.web.app";

export function buildInviteMailto(email: string, groupName: string, inviterName?: string): string {
  const group = groupName.trim() || "un grupo";
  const subject = `Invitacion a WorkSync: ${group}`;
  const body = [
    "Hola,",
    "",
    `${inviterName ? `${inviterName} te invita` : "Te invito"} a coordinar horarios en el grupo "${group}" en WorkSync.`,
    "",
    `Entra con este correo (${email}) en ${APP_URL} y quedaras dentro del grupo automaticamente.`,
    "",
    "Nos vemos en WorkSync.",
  ].join("\n");
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// Opens the user's mail client without navigating the app away.
export function openMailto(url: string) {
  if (typeof document === "undefined") return;
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
