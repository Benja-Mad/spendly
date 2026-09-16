"use client";

import { FormEvent, useState } from "react";
import { requestJson } from "@/lib/api";
import { notify } from "@/lib/toast";
import { Modal } from "@/components/ui/modal";
import { Field, inputClass } from "@/components/ui/field";
import { FormBody, FormFooter, FormRow } from "@/components/ui/form";

export function CreateJuntaModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await notify.promise(
        (async () => {
          await requestJson("/api/juntas", {
            method: "POST",
            body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
          });
          await onCreated();
        })(),
        { loading: "Creando junta...", success: `"${name.trim()}" creada` },
      );
      onClose();
    } catch {
      // el toast reporta el error
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Crear junta" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <FormBody>
          <FormRow columns={1}>
            <Field label="Nombre">
            {(props) => (
              <input {...props} className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Asado del viernes" required />
            )}
          </Field>
            <Field label="Descripción" hint="Opcional">
              {(props) => (
                <input {...props} className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Casa de Javi, 8pm" />
              )}
            </Field>
          </FormRow>
        </FormBody>
        <FormFooter onCancel={onClose} submitting={submitting} disabled={!name.trim()} label="Crear junta" busyLabel="Creando..." />
      </form>
    </Modal>
  );
}

export function JoinJuntaModal({
  onClose,
  onJoined,
}: {
  onClose: () => void;
  onJoined: () => void | Promise<void>;
}) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await notify.promise(
        (async () => {
          await requestJson("/api/juntas/join", {
            method: "POST",
            body: JSON.stringify({ inviteCode: code.trim() }),
          });
          await onJoined();
        })(),
        { loading: "Uniéndote...", success: "Te uniste a la junta" },
      );
      onClose();
    } catch {
      // el toast reporta el error
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Unirse a una junta" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <FormBody>
          <Field label="Código de invitación" hint="Te lo comparte quien creó la junta">
          {(props) => (
            <input
              {...props}
              className={`${inputClass} font-mono tracking-wider`}
              value={code}
              onChange={(e) => setCode(e.target.value.trim())}
              placeholder="a1b2c3d4"
              autoComplete="off"
              spellCheck={false}
              required
            />
          )}
          </Field>
        </FormBody>
        <FormFooter onCancel={onClose} submitting={submitting} disabled={!code.trim()} label="Unirme" busyLabel="Uniéndote..." />
      </form>
    </Modal>
  );
}

export function CreateJuntaCategoryModal({
  juntaId,
  onClose,
  onCreated,
}: {
  juntaId: string;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await notify.promise(
        (async () => {
          await requestJson(`/api/juntas/${juntaId}/categories`, {
            method: "POST",
            body: JSON.stringify({ name: name.trim() }),
          });
          await onCreated();
        })(),
        { loading: "Creando categoría...", success: `Categoría "${name.trim()}" creada` },
      );
      onClose();
    } catch {
      // el toast reporta el error
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Nueva categoría" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <FormBody>
          <Field label="Nombre de la categoría">
          {(props) => (
            <input {...props} className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Bebidas" required />
          )}
          </Field>
        </FormBody>
        <FormFooter onCancel={onClose} submitting={submitting} disabled={!name.trim()} label="Crear categoría" busyLabel="Creando..." />
      </form>
    </Modal>
  );
}
