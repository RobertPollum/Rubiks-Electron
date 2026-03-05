// Face order: [+X Right, -X Left, +Y Up, -Y Down, +Z Front, -Z Back]
export const FACE_LABELS = ['Right', 'Left', 'Up', 'Down', 'Front', 'Back'];

export const THEMES = {
    standard: {
        name: 'Standard',
        description: 'Classic Rubik\'s Cube colors',
        colors: ['#C41E3A', '#FF5800', '#FFFFFF', '#FFD500', '#009E60', '#0051BA']
    },
    colorblind_deutan: {
        name: 'Colorblind (Deuteranopia)',
        description: 'Optimized for red-green color blindness (deutan type)',
        colors: ['#D55E00', '#0072B2', '#F0E442', '#FFFFFF', '#56B4E9', '#CC79A7']
    },
    colorblind_protan: {
        name: 'Colorblind (Protanopia)',
        description: 'Optimized for red-green color blindness (protan type)',
        colors: ['#E69F00', '#56B4E9', '#F0E442', '#FFFFFF', '#009E73', '#CC79A7']
    },
    colorblind_tritan: {
        name: 'Colorblind (Tritanopia)',
        description: 'Optimized for blue-yellow color blindness',
        colors: ['#FF4444', '#FF8800', '#FFFFFF', '#44DDDD', '#22AA22', '#CC44CC']
    },
    high_contrast: {
        name: 'High Contrast',
        description: 'Maximum visibility with strong contrast',
        colors: ['#FF0000', '#0000FF', '#FFFFFF', '#FFFF00', '#00FF00', '#FF00FF']
    },
    grayscale: {
        name: 'Grayscale',
        description: 'Shades of gray with distinct brightness levels',
        colors: ['#E0E0E0', '#1A1A1A', '#FFFFFF', '#808080', '#4D4D4D', '#B3B3B3']
    },
    pastel: {
        name: 'Pastel',
        description: 'Soft pastel tones',
        colors: ['#FFB3B3', '#FFDAB3', '#FFFFB3', '#B3FFB3', '#B3D9FF', '#E0B3FF']
    }
};

export const DEFAULT_THEME = 'standard';

export function getThemeColors(themeId) {
    const theme = THEMES[themeId];
    if (theme) return [...theme.colors];
    return [...THEMES[DEFAULT_THEME].colors];
}

export function hexToInt(hex) {
    return parseInt(hex.replace('#', ''), 16);
}
