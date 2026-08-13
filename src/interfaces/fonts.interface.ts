interface FontDesigner {
    name: string;
}

interface FontAxis {
    tag: string;
    min: number;
    max: number;
}

interface FontLinks {
    googleFonts: string;
    repository: string;
}

interface FontCss {
    url: string;
}

interface FontPreviews {
    svg: string;
    png: string;
    webp: string;
}

interface Font {
    id: string;
    family: string;
    category: string;
    designer: FontDesigner;
    license: string;
    dateAdded: string;
    subsets: string[];
    styles: string[];
    weights: number[];
    variable: boolean;
    axes: FontAxis[];
    links: FontLinks;
    css: FontCss;
    previews: FontPreviews;
}