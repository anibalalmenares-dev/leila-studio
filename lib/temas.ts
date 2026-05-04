export type TemaId = "default" | "lila-teal" | "aqua-verde" | "pastel-verano" | "azul-marino" | "tropical" | "blush-sage" | "esmeralda" | "nautico" | "indigo-persa" | "oro-antiguo" | "miel-sirocco" | "festival-vallenato";

export type Tema = {
  id: TemaId;
  nombre: string;
  preview: string[];
  vars: {
    primary: string;
    primaryDark: string;
    primaryLight: string;
    primaryBg: string;
    secondary: string;
    secondaryBg: string;
    bgFrom: string;
    bgTo: string;
    borderSoft: string;
    cardShadow: string;
  };
};

export const TEMAS: Tema[] = [
  {
    id: "default",
    nombre: "Rosa & Dorado",
    preview: ["#c9a84c", "#e91e8c", "#fff0f5"],
    vars: {
      primary: "#c9a84c", primaryDark: "#a07830", primaryLight: "#f0d080",
      primaryBg: "#fff0f5", secondary: "#e91e8c", secondaryBg: "#fce4ec",
      bgFrom: "#fff0f5", bgTo: "#fff8f0", borderSoft: "#f0e0e8",
      cardShadow: "rgba(201,168,76,0.15)",
    },
  },
  {
    id: "lila-teal",
    nombre: "Lila & Teal",
    preview: ["#0D9790", "#8474A1", "#f0fafa"],
    vars: {
      primary: "#0D9790", primaryDark: "#087068", primaryLight: "#6EC6CA",
      primaryBg: "#f0fafa", secondary: "#8474A1", secondaryBg: "#f5f0ff",
      bgFrom: "#f0fafa", bgTo: "#f5f0ff", borderSoft: "#c8dfe0",
      cardShadow: "rgba(13,151,144,0.12)",
    },
  },
  {
    id: "aqua-verde",
    nombre: "Aqua & Verde",
    preview: ["#54C9CC", "#7EA00E", "#f0fafa"],
    vars: {
      primary: "#54C9CC", primaryDark: "#3aafb2", primaryLight: "#9de4e6",
      primaryBg: "#f0fafa", secondary: "#7EA00E", secondaryBg: "#f5faee",
      bgFrom: "#f0fafa", bgTo: "#f5faee", borderSoft: "#c0e4e5",
      cardShadow: "rgba(84,201,204,0.12)",
    },
  },
  {
    id: "pastel-verano",
    nombre: "Pastel Verano",
    preview: ["#FA897B", "#86E3C1", "#fff5f4"],
    vars: {
      primary: "#FA897B", primaryDark: "#d86858", primaryLight: "#CCABD8",
      primaryBg: "#fff5f4", secondary: "#86E3C1", secondaryBg: "#f0faf8",
      bgFrom: "#fff5f4", bgTo: "#f5fdf9", borderSoft: "#f0d0d8",
      cardShadow: "rgba(250,137,123,0.12)",
    },
  },
  {
    id: "azul-marino",
    nombre: "Azul Marino",
    preview: ["#0281BE", "#001B48", "#f0f5fa"],
    vars: {
      primary: "#0281BE", primaryDark: "#001B48", primaryLight: "#97CAD8",
      primaryBg: "#f0f5fa", secondary: "#019BE0", secondaryBg: "#e8f2ff",
      bgFrom: "#f0f5fa", bgTo: "#e8f2ff", borderSoft: "#c0d5e8",
      cardShadow: "rgba(2,129,190,0.12)",
    },
  },
  {
    id: "tropical",
    nombre: "Tropical",
    preview: ["#E35B45", "#FFB557", "#fff5f0"],
    vars: {
      primary: "#E35B45", primaryDark: "#c04030", primaryLight: "#FFB557",
      primaryBg: "#fff5f0", secondary: "#5ABFB7", secondaryBg: "#f0fdf9",
      bgFrom: "#fff5f0", bgTo: "#fffbf0", borderSoft: "#f0d0c8",
      cardShadow: "rgba(227,91,69,0.12)",
    },
  },
  {
    id: "blush-sage",
    nombre: "Blush & Sage",
    preview: ["#E79796", "#ADBC70", "#fff8f6"],
    vars: {
      primary: "#E79796", primaryDark: "#c07070", primaryLight: "#F5CEC7",
      primaryBg: "#fff8f6", secondary: "#ADBC70", secondaryBg: "#f5f8ee",
      bgFrom: "#fff8f6", bgTo: "#f9f9f2", borderSoft: "#f0d8d6",
      cardShadow: "rgba(231,151,150,0.12)",
    },
  },
  {
    id: "esmeralda",
    nombre: "Esmeralda",
    preview: ["#28c76f", "#1a9a55", "#6ee7a0"],
    vars: {
      primary: "#28c76f", primaryDark: "#1a9a55", primaryLight: "#6ee7a0",
      primaryBg: "#edfaf4", secondary: "#0ead69", secondaryBg: "#e0f7ed",
      bgFrom: "#f0fdf7", bgTo: "#eafaf2", borderSoft: "#b8efd3",
      cardShadow: "rgba(40,199,111,0.12)",
    },
  },
  {
    id: "nautico",
    nombre: "Náutico",
    preview: ["#C11720", "#0C324A", "#679CBC"],
    vars: {
      primary: "#C11720", primaryDark: "#8f1018", primaryLight: "#679CBC",
      primaryBg: "#FEF1D5", secondary: "#0C324A", secondaryBg: "#dde8f0",
      bgFrom: "#FEF1D5", bgTo: "#f5ede0", borderSoft: "#d9c8a8",
      cardShadow: "rgba(193,23,32,0.12)",
    },
  },
  {
    id: "indigo-persa",
    nombre: "Índigo Persa",
    preview: ["#4A1D96", "#F59E0B", "#F5F0FF"],
    vars: {
      primary: "#4A1D96", primaryDark: "#2D1260", primaryLight: "#8B5CF6",
      primaryBg: "#F5F0FF", secondary: "#F59E0B", secondaryBg: "#FFFBEB",
      bgFrom: "#F5F0FF", bgTo: "#FFFBF0", borderSoft: "#D8CCF0",
      cardShadow: "rgba(74,29,150,0.12)",
    },
  },
  {
    id: "oro-antiguo",
    nombre: "Oro Antiguo",
    preview: ["#C09710", "#F0BE4D", "#3D1E02"],
    vars: {
      primary: "#C09710", primaryDark: "#3D1E02", primaryLight: "#F0BE4D",
      primaryBg: "#FFFCF0", secondary: "#8B6500", secondaryBg: "#FFF8E6",
      bgFrom: "#FFFCF0", bgTo: "#FFF8E6", borderSoft: "#E8D080",
      cardShadow: "rgba(192,151,16,0.15)",
    },
  },
  {
    id: "miel-sirocco",
    nombre: "Miel & Sirocco",
    preview: ["#EAB749", "#B47A21", "#F9E7C0"],
    vars: {
      primary: "#EAB749", primaryDark: "#B47A21", primaryLight: "#F7CA84",
      primaryBg: "#FEFAF0", secondary: "#7B4A1E", secondaryBg: "#FFF3E4",
      bgFrom: "#FEFAF0", bgTo: "#FFF5E4", borderSoft: "#F0D898",
      cardShadow: "rgba(234,183,73,0.15)",
    },
  },
  {
    id: "festival-vallenato",
    nombre: "Festival Vallenato",
    preview: ["#D97941", "#F4B942", "#7A9E7E"],
    vars: {
      primary: "#D97941", primaryDark: "#5C4033", primaryLight: "#F4B942",
      primaryBg: "#FFF8F0", secondary: "#C4302B", secondaryBg: "#FFF0EE",
      bgFrom: "#FFF8F0", bgTo: "#FFFBF0", borderSoft: "#F0D8C0",
      cardShadow: "rgba(217,121,65,0.15)",
    },
  },
];

export const TEMA_DEFAULT = TEMAS[0];

export function getTema(id: string): Tema {
  return TEMAS.find(t => t.id === id) ?? TEMA_DEFAULT;
}

export function aplicarTema(tema: Tema) {
  const r = document.documentElement.style;
  r.setProperty("--c-primary", tema.vars.primary);
  r.setProperty("--c-primary-dark", tema.vars.primaryDark);
  r.setProperty("--c-primary-light", tema.vars.primaryLight);
  r.setProperty("--c-primary-bg", tema.vars.primaryBg);
  r.setProperty("--c-secondary", tema.vars.secondary);
  r.setProperty("--c-secondary-bg", tema.vars.secondaryBg);
  r.setProperty("--c-bg-from", tema.vars.bgFrom);
  r.setProperty("--c-bg-to", tema.vars.bgTo);
  r.setProperty("--c-border-soft", tema.vars.borderSoft);
  r.setProperty("--c-card-shadow", tema.vars.cardShadow);
}
