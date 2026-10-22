/** English dictionary. Its shape defines the `Messages` type every language must satisfy. */
export const en = {
    app: {
        title: "Maze Maker",
        stats: "{cells} cells · solution length {length}",
        language: "Language",
    },

    actions: {
        newMaze: "New maze",
        showSolution: "Show solution",
        hideSolution: "Hide solution",
        randomizeSeed: "Randomize seed",
        randomizeAll: "Surprise me",
        randomizeAllHint:
            "Randomize everything except the style: type, size, algorithm, difficulty and seed",
        undoRandomize: "Undo",
        undoRandomizeHint:
            "Go back to the maze settings before the last randomization",
        print: "Print",
        svg: "SVG",
        png: "PNG",
    },

    sections: {
        mazeType: "Maze type",
        difficulty: "Difficulty & generation",
        style: "Style",
        markers: "Markers & solution",
        title: "Title",
        page: "Page & export",
    },

    mazeTypes: {
        rectangular: "Rectangular",
        circular: "Circular",
        hexagonal: "Hexagonal",
        triangular: "Triangular",
        shape: "Shaped (silhouette)",
        diamond: "Diamond",
    },

    shapes: {
        heart: "Heart",
        star: "Star",
        circle: "Circle",
        cross: "Cross",
        arrow: "Arrow",
    },

    algorithms: {
        backtracker: {
            label: "Recursive backtracker",
            hint: "Long winding corridors, few dead ends",
        },
        prim: { label: "Prim's", hint: "Many short dead ends, bushy" },
        kruskal: {
            label: "Kruskal's",
            hint: "Uniform, lots of small branches",
        },
        wilson: { label: "Wilson's", hint: "Unbiased, uniformly random" },
        aldousBroder: {
            label: "Aldous-Broder",
            hint: "Unbiased, uniformly random",
        },
        growingTree: {
            label: "Growing tree",
            hint: "Mix of backtracker and Prim",
        },
        huntAndKill: {
            label: "Wandering explorer",
            hint: "Wanders until it gets stuck, then picks a new spot. Winding, few dead ends",
        },
    },

    fields: {
        silhouette: "Silhouette",
        rings: "Rings",
        centerCells: "Cells in center ring",
        centerGoal: "{value} (goal in center)",
        size: "Size",
        columns: "Columns",
        rows: "Rows",
        algorithm: "Algorithm",
        twistiness: "Twistiness",
        loops: "Loops (remove dead ends)",
        farEnds: "Place entrance and exit far apart",
        seed: "Seed",
        preset: "Preset",
        choosePreset: "Choose a preset…",
        wallThickness: "Wall thickness",
        wallEnds: "Wall ends",
        walls: "Walls",
        paper: "Paper",
        heavyFrame: "Heavy outer frame",
        cellFill: "Cell fill",
        cell: "Cell",
        altCell: "Alt cell",
        from: "From",
        to: "To",
        margin: "Margin",
        markerStyle: "Start / end markers",
        symbolSet: "Symbols",
        start: "Start",
        end: "End",
        solution: "Solution",
        solutionThickness: "Solution thickness",
        dashedSolution: "Dashed solution",
        heading: "Heading (optional)",
        headingPlaceholder: "Help the mouse find the cheese!",
        titleColor: "Title color",
        paperSize: "Paper",
        orientation: "Orientation",
    },

    options: {
        wallEnds: { round: "Rounded", square: "Square", butt: "Flat" },
        fill: {
            none: "None",
            solid: "Solid color",
            distance: "Gradient by distance",
            checker: "Checkerboard",
        },
        markers: {
            emoji: "Emoji",
            symbols: "Symbols (printer-friendly, no color)",
            circles: "Colored dots",
            none: "None",
        },
        symbolSets: {
            ringDot: "Ring and bullseye",
            arrowFlag: "Arrow and flag",
            starSquare: "Star and square",
            letters: "Letters",
        },
        paper: { a4: "A4", letter: "US Letter", a3: "A3", square: "Square" },
        orientation: { portrait: "Portrait", landscape: "Landscape" },
    },

    stylePresets: {
        classic: "Classic",
        chunky: "Chunky",
        thin: "Thin & elegant",
        rainbow: "Rainbow",
        chalkboard: "Chalkboard",
        inkSaver: "Ink saver",
    },

    presets: {
        title: "My presets",
        expand: "Expand presets",
        collapse: "Collapse presets",
        description:
            "A preset stores the maze type, size, algorithm, style and page settings (not the seed).",
        namePlaceholder: "Name for current setup…",
        save: "Save",
        empty: "No presets yet. Set up a maze you like and save it here.",
        apply: "Apply this preset",
        rename: "Rename",
        overwrite: "Overwrite with current setup",
        delete: "Delete",
        confirmOverwrite: 'Overwrite "{name}" with the current setup?',
        confirmDelete: 'Delete preset "{name}"?',
        resetAll: "Reset settings to defaults",
        confirmReset:
            "Reset all settings to defaults? Your saved presets are kept.",
    },
};

export type Messages = typeof en;
