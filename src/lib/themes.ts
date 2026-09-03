export interface Theme {
  id: string;
  label: string;
  swatch: string; // shown as a little dot in the picker
  dark?: boolean;
  vars: {
    "--paper": string;
    "--paper-edge": string;
    "--card-bg": string;
    "--ink": string;
    "--ink-soft": string;
    "--teal": string; // primary accent — buttons, "waiting" state
    "--amber": string; // highlight accent — "it's your turn" state
    "--amber-glow": string; // rgba() version of --amber, used in the pulse animation
  };
}

export const THEMES: Theme[] = [
  {
    id: "classic",
    label: "Classic Ticket",
    swatch: "#2F7A6F",
    vars: {
      "--paper": "#FAF7F0", "--paper-edge": "#E4DCC9", "--card-bg": "#FFFFFF",
      "--ink": "#1C2B39", "--ink-soft": "#5B6B78",
      "--teal": "#2F7A6F", "--amber": "#D9A22B", "--amber-glow": "rgba(217,162,43,0.35)"
    }
  },
  {
    id: "emerald",
    label: "Emerald & White",
    swatch: "#0F6B4A",
    vars: {
      "--paper": "#F4FBF6", "--paper-edge": "#CFE9D8", "--card-bg": "#FFFFFF",
      "--ink": "#0B3D2E", "--ink-soft": "#3F6656",
      "--teal": "#0F6B4A", "--amber": "#C99A2E", "--amber-glow": "rgba(201,154,46,0.35)"
    }
  },
  {
    id: "blush",
    label: "Blush Pink",
    swatch: "#C2607E",
    vars: {
      "--paper": "#FFF6F8", "--paper-edge": "#F3D3DC", "--card-bg": "#FFFFFF",
      "--ink": "#4A1F2B", "--ink-soft": "#8A5F6B",
      "--teal": "#C2607E", "--amber": "#D9455F", "--amber-glow": "rgba(217,69,95,0.35)"
    }
  },
  {
    id: "ocean",
    label: "Ocean Blue",
    swatch: "#1F6FA8",
    vars: {
      "--paper": "#F2F8FC", "--paper-edge": "#CFE2F0", "--card-bg": "#FFFFFF",
      "--ink": "#0E2A3D", "--ink-soft": "#4C6B7E",
      "--teal": "#1F6FA8", "--amber": "#E08E2E", "--amber-glow": "rgba(224,142,46,0.35)"
    }
  },
  {
    id: "neon",
    label: "Neon Dark",
    swatch: "#00E5C7",
    dark: true,
    vars: {
      "--paper": "#0B0B12", "--paper-edge": "#2A2540", "--card-bg": "#15121F",
      "--ink": "#F5F0FF", "--ink-soft": "#9C93C9",
      "--teal": "#00E5C7", "--amber": "#FF3DAA", "--amber-glow": "rgba(255,61,170,0.45)"
    }
  }
];

export function getTheme(id?: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
