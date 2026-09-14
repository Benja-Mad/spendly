"use client";

import { FormEvent, useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import { requestJson } from "@/lib/api";
import { useProfile } from "@/lib/swr";
import { notify } from "@/lib/toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { FormBody, FormRow } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { TransitionSwap } from "@/components/ui/transition-swap";

/**
 * El perfil, en un modal. No es un destino al que se "navega": es un formulario
 * corto que se abre, se edita y se cierra. Antes era una pestaña más de la
 * sidebar, al mismo nivel que Dashboard o Tarjetas, que sí son secciones.
 *
 * El tema y el cierre de sesión NO viven aquí: son de un clic y se resuelven en
 * el menú del usuario, sin abrir un overlay. Ver user-menu.tsx.
 */
export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { data, isLoading, mutate } = useProfile();
  const profile = data?.profile;

  const [username, setUsername] = useState("");
  const [touched, setTouched] = useState(false);
  const [stripped, setStripped] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentUsername = profile?.username ?? "";
  useEffect(() => {
    if (!touched) setUsername(currentUsername);
  }, [currentUsername, touched]);

  const onSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await notify.promise(
        (async () => {
          await requestJson("/api/profile", {
            method: "PATCH",
            body: JSON.stringify({ username: username || undefined }),
          });
          await mutate();
          setTouched(false);
        })(),
        { loading: "Guardando perfil...", success: "Perfil actualizado correctamente" },
      );
    } catch {
      // el toast reporta el error
    } finally {
      setSaving(false);
    }
  };

  const changed = touched && username !== currentUsername;

  return (
    <Modal title="Perfil" onClose={onClose}>
      <form onSubmit={onSave} className="flex min-h-0 flex-1 flex-col">
        <FormBody>
          <TransitionSwap
            showSkeleton={isLoading && !profile}
            skeleton={
              <div className="space-y-4">
                <Skeleton className="h-[68px] rounded-xl" />
                <Skeleton className="h-[52px] rounded-xl" />
              </div>
            }
          >
            <div className="space-y-4">
              <Field
                label="Nombre de usuario"
                hint="Solo letras, números, guion y guion bajo."
              >
                {(props) => (
                  <input
                    {...props}
                    className={inputClass}
                    value={username}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const clean = raw.replace(/[^a-zA-Z0-9_-]/g, "");
                      setTouched(true);
                      setStripped(clean !== raw);
                      setUsername(clean);
                    }}
                    placeholder="mi_username"
                    maxLength={30}
                    autoComplete="username"
                  />
                )}
              </Field>
              {stripped && (
                <p className="-mt-2 text-xs text-amber-600 dark:text-amber-400">
                  Se omitieron caracteres no permitidos.
                </p>
              )}

              <FormRow>
                <ReadOnly label="Email" value={profile?.email ?? "—"} hint="Privado, no se muestra a otros." />
                <ReadOnly label="Miembro desde" value={formatDate(profile?.created_at)} />
              </FormRow>
            </div>
          </TransitionSwap>
        </FormBody>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
          <Button type="submit" variant="primary" disabled={saving || !changed}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ReadOnly({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="flex h-11 items-center rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-300">
        {value}
      </p>
      {hint && <p className="mt-1.5 text-xs text-zinc-400">{hint}</p>}
    </div>
  );
}
