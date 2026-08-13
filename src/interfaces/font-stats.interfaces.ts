export interface FontStats {
    fonts: number;
    categories: number;
    subsets: number;
    designers: number;

    variable: {
        families: number;
        percentage: number;
    };

    styles: {
        normal: number;
        italic: number;
    };

    weights: Record<string, number>;

    breakdown: {
        categories: Record<string, number>;
        subsets: Record<string, number>;
    };

    axes: Record<string, number>;
}