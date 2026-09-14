"use client";

import useSWR, { mutate as globalMutate, type SWRConfiguration } from "swr";
import { requestJson } from "@/lib/api";
import type { DashboardData, Junta, JuntaDetail, Profile } from "@/lib/types";

export const DASHBOARD_KEY = "/api/dashboard";
export const JUNTAS_KEY = "/api/juntas";
export const PROFILE_KEY = "/api/profile";
export const juntaKey = (id: string) => `/api/juntas/${id}`;
export const accountKey = (id: string) => `/api/accounts/${id}`;
export const accountTxKey = (id: string) => `/api/accounts/${id}/transactions`;

const fetcher = <T,>(url: string): Promise<T> => requestJson<T>(url, { cache: "no-store" });

/**
 * Config compartida. `keepPreviousData` es la clave del cambio: al navegar a una
 * página ya visitada, SWR entrega al instante lo que tiene en caché y revalida
 * en segundo plano, en vez de montar vacío y mostrar un spinner de 1-2 s.
 */
const baseConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  keepPreviousData: true,
  dedupingInterval: 2000,
};

export const useDashboard = () =>
  useSWR<DashboardData>(DASHBOARD_KEY, fetcher, baseConfig);

export const useJuntas = () =>
  useSWR<{ juntas: Junta[] }>(JUNTAS_KEY, fetcher, baseConfig);

export const useJunta = (id: string) =>
  useSWR<JuntaDetail>(id ? juntaKey(id) : null, fetcher, baseConfig);

export const useProfile = () =>
  useSWR<{ profile: Profile }>(PROFILE_KEY, fetcher, baseConfig);

export const useAccount = (id: string) =>
  useSWR<{ account: import("@/lib/types").Account }>(id ? accountKey(id) : null, fetcher, baseConfig);

export const useAccountTransactions = (id: string) =>
  useSWR<{ transactions: import("@/lib/types").Transaction[] }>(
    id ? accountTxKey(id) : null,
    fetcher,
    baseConfig,
  );

/** Revalida el dashboard desde cualquier vista que lo modifique. */
export const refreshDashboard = () => globalMutate(DASHBOARD_KEY);
