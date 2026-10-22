import type { Messages } from "./en";

/** Hungarian dictionary. Typed against `Messages`, so a missing key is a compile error. */
export const hu: Messages = {
    app: {
        title: "Labirintus készítő",
        stats: "{cells} cella · a megoldás hossza: {length}",
        language: "Nyelv",
    },

    actions: {
        newMaze: "Új labirintus",
        showSolution: "Megoldás mutatása",
        hideSolution: "Megoldás elrejtése",
        randomizeSeed: "Véletlen kezdőérték",
        randomizeAll: "Lepj meg!",
        randomizeAllHint:
            "Mindent véletlenre állít a stílus kivételével: típus, méret, algoritmus, nehézség és kezdőérték",
        undoRandomize: "Visszavonás",
        undoRandomizeHint:
            "Vissza az utolsó véletlenítés előtti labirintus-beállításokhoz",
        redoRandomize: "Újra",
        redoRandomizeHint: "A most visszavont véletlenítés helyreállítása",
        print: "Nyomtatás",
        svg: "SVG",
        png: "PNG",
    },

    sections: {
        mazeType: "Labirintus típusa",
        difficulty: "Nehézség és generálás",
        style: "Stílus",
        markers: "Jelölők és megoldás",
        title: "Cím",
        page: "Oldal és exportálás",
    },

    mazeTypes: {
        rectangular: "Négyzetes",
        circular: "Kör alakú",
        hexagonal: "Hatszögletű",
        triangular: "Háromszögletű",
        shape: "Formás (sziluett)",
        diamond: "Rombusz",
    },

    shapes: {
        heart: "Szív",
        star: "Csillag",
        circle: "Kör",
        cross: "Kereszt",
        arrow: "Nyíl",
    },

    algorithms: {
        backtracker: {
            label: "Rekurzív visszalépéses",
            hint: "Hosszú, kanyargós folyosók, kevés zsákutca",
        },
        prim: { label: "Prim", hint: "Sok rövid zsákutca, bokros szerkezet" },
        kruskal: { label: "Kruskal", hint: "Egyenletes, sok apró elágazás" },
        wilson: { label: "Wilson", hint: "Torzítatlan, egyenletesen véletlen" },
        aldousBroder: {
            label: "Aldous-Broder",
            hint: "Torzítatlan, egyenletesen véletlen",
        },
        growingTree: {
            label: "Növekvő fa",
            hint: "A visszalépéses és a Prim keveréke",
        },
        huntAndKill: {
            label: "Kóborló felfedező",
            hint: "Addig kóborol, amíg el nem akad, aztán új helyen folytatja. Kanyargós, kevés zsákutca",
        },
    },

    fields: {
        silhouette: "Sziluett",
        rings: "Gyűrűk",
        centerCells: "Cellák a középső gyűrűben",
        centerGoal: "{value} (cél a közepén)",
        size: "Méret",
        columns: "Oszlopok",
        rows: "Sorok",
        algorithm: "Algoritmus",
        twistiness: "Kanyargósság",
        loops: "Hurkok (zsákutcák megszüntetése)",
        farEnds: "Bejárat és kijárat távol egymástól",
        seed: "Kezdőérték",
        preset: "Sablon",
        choosePreset: "Válassz sablont…",
        wallThickness: "Falvastagság",
        wallEnds: "Falvégek",
        walls: "Falak",
        paper: "Papír",
        heavyFrame: "Vastag külső keret",
        cellFill: "Cellák kitöltése",
        cell: "Cella",
        altCell: "Másik cella",
        from: "Innen",
        to: "Idáig",
        margin: "Margó",
        markerStyle: "Start / cél jelölők",
        symbolSet: "Szimbólumok",
        start: "Start",
        end: "Cél",
        solution: "Megoldás",
        solutionThickness: "Megoldás vastagsága",
        dashedSolution: "Szaggatott megoldás",
        heading: "Felirat (nem kötelező)",
        headingPlaceholder: "Segíts az egérnek megtalálni a sajtot!",
        titleColor: "Felirat színe",
        paperSize: "Papírméret",
        orientation: "Tájolás",
    },

    options: {
        wallEnds: { round: "Lekerekített", square: "Szögletes", butt: "Lapos" },
        fill: {
            none: "Nincs",
            solid: "Egyszínű",
            distance: "Színátmenet távolság szerint",
            checker: "Sakktábla",
        },
        markers: {
            emoji: "Emoji",
            symbols: "Szimbólumok (nyomtatóbarát, szín nélkül)",
            circles: "Színes pontok",
            none: "Nincs",
        },
        symbolSets: {
            ringDot: "Gyűrű és céltábla",
            arrowFlag: "Nyíl és zászló",
            starSquare: "Csillag és négyzet",
            letters: "Betűk",
        },
        paper: { a4: "A4", letter: "US Letter", a3: "A3", square: "Négyzet" },
        orientation: { portrait: "Álló", landscape: "Fekvő" },
    },

    stylePresets: {
        classic: "Klasszikus",
        chunky: "Vaskos",
        thin: "Vékony és elegáns",
        rainbow: "Szivárvány",
        chalkboard: "Krétatábla",
        inkSaver: "Tintatakarékos",
    },

    presets: {
        title: "Saját sablonok",
        expand: "Sablonok kinyitása",
        collapse: "Sablonok összecsukása",
        description:
            "A sablon a labirintus típusát, méretét, algoritmusát, stílusát és az oldalbeállításokat menti (a kezdőértéket nem).",
        namePlaceholder: "Név a jelenlegi beállításhoz…",
        save: "Mentés",
        empty: "Még nincs sablonod. Állíts be egy tetszetős labirintust, és mentsd el ide.",
        apply: "Sablon alkalmazása",
        rename: "Átnevezés",
        overwrite: "Felülírás a jelenlegi beállítással",
        delete: "Törlés",
        confirmOverwrite:
            "Felülírod a(z) „{name}” sablont a jelenlegi beállítással?",
        confirmDelete: "Törlöd a(z) „{name}” sablont?",
        resetAll: "Beállítások visszaállítása alapértelmezettre",
        confirmReset:
            "Visszaállítod az összes beállítást alapértelmezettre? A mentett sablonjaid megmaradnak.",
    },
};
