import { Hono } from 'hono'
import fonts from '../data/fonts.json' with { type: 'json' }

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

const search = new Hono()

search.get('/search/:query', (c) => {
    const { query } = c.req.param()
    const { limit, category, designer, license, subset } = c.req.query()

    const parsedLimit = Number(limit)
    const limitNumber =
        limit === 'false'
            ? fonts.length
            : Number.isInteger(parsedLimit) && parsedLimit > 0
                ? Math.min(parsedLimit, 100)
                : 20

    const normalize = (value: string) =>
        value.trim().toLowerCase().replace(/\s+/g, ' ')

    let fontsList = fonts.filter((font: Font) => normalize(font.family).includes(normalize(query)))
    if (category) {
        fontsList = fontsList.filter((font: Font) => font.category.toLowerCase().replace(" ", "-") === category.toLowerCase().replace(" ", "-"))
    }
    if (designer) {
        fontsList = fontsList.filter((font: Font) => font.designer?.name.toLowerCase().replace(" ", "+") === designer.toLowerCase().replace(" ", "+"))
    }
    if (license) {
        fontsList = fontsList.filter((font: Font) => font.license.toUpperCase() === license.toUpperCase())
    }
    if (subset) {
        fontsList = fontsList.filter((font: Font) => font.subsets.includes(subset.toLowerCase().replace(" ", "-")))
    }

    return c.json({ query: query, total: fontsList.length, limit: limitNumber, results: fontsList.slice(0, limitNumber) })
})

export default search