import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Msg { role: "user" | "assistant"; content: string; time: string; thought?: string; spoke?: boolean }
export interface Convo { id: string; title: string; msgs: Msg[] }

export interface Settings {
  provider: string; baseURL: string; apiKey: string; model: string;
  voiceOn: boolean; voiceId: string; voiceModel: string;
}
export const DEFAULTS: Settings = {
  provider: "openrouter", baseURL: "https://openrouter.ai/api/v1", apiKey: "", model: "",
  voiceOn: true, voiceId: "", voiceModel: "eleven_flash_v2_5",
};
export const pickSettings = (s: Settings): Settings => ({
  provider: s.provider, baseURL: s.baseURL, apiKey: s.apiKey, model: s.model,
  voiceOn: s.voiceOn, voiceId: s.voiceId, voiceModel: s.voiceModel,
});

interface State extends Settings {
  convos: Convo[]; currentId: string | null;
  setCfg: (p: Partial<Settings>) => void;
  newConvo: () => string;
  del: (id: string) => void;
  select: (id: string) => void;
  push: (id: string, m: Msg) => void;
  patchLast: (id: string, p: Partial<Msg>) => void;
  edit: (id: string, index: number, content: string) => void;
}

export const useApp = create<State>()(persist((set) => ({
  ...DEFAULTS, convos: [], currentId: null,
  setCfg: (p) => set(p),
  newConvo: () => {
    const id = crypto.randomUUID();
    set((s) => ({ convos: [{ id, title: "Obrolan baru", msgs: [] }, ...s.convos], currentId: id }));
    return id;
  },
  del: (id) => set((s) => {
    const convos = s.convos.filter((c) => c.id !== id);
    if (!convos.length) {
      const nid = crypto.randomUUID();
      return { convos: [{ id: nid, title: "Obrolan baru", msgs: [] }], currentId: nid };
    }
    return { convos, currentId: s.currentId === id ? convos[0].id : s.currentId };
  }),
  select: (id) => set({ currentId: id }),
  push: (id, m) => set((s) => ({ convos: s.convos.map((c) => c.id !== id ? c : {
    ...c, title: c.msgs.length === 0 && m.role === "user" ? m.content.slice(0, 34) : c.title, msgs: [...c.msgs, m] }) })),
  patchLast: (id, p) => set((s) => ({ convos: s.convos.map((c) => c.id !== id ? c : {
    ...c, msgs: c.msgs.map((m, i) => (i === c.msgs.length - 1 ? { ...m, ...p } : m)) }) })),
  edit: (id, index, content) => set((s) => ({ convos: s.convos.map((c) => c.id !== id ? c : {
    ...c, msgs: c.msgs.map((m, i) => (i === index ? { ...m, content } : m)) }) })),
}), {
  name: "reze-voice",
  partialize: ({ apiKey, ...rest }) => rest,
}));
