import type { Svg } from "@svgdotjs/svg.js";
import {
    forwardRef,
    type CSSProperties,
    useEffect,
    useImperativeHandle,
    useRef,
} from "react";
import type { Maze } from "../maze";
import { renderMaze } from "../render/renderMaze";
import type { MazeStyle } from "../render/style";

export interface MazePreviewHandle {
    getSvg: () => Svg | null;
}

interface Props {
    maze: Maze;
    style: MazeStyle;
    showSolution: boolean;
    solution: number[];
    /** Paper aspect ratio (width / height). */
    aspect: number;
}

/** Paper-shaped host; the SVG inside scales to fit using its viewBox. */
export const MazePreview = forwardRef<MazePreviewHandle, Props>(
    function MazePreview({ maze, style, showSolution, solution, aspect }, ref) {
        const hostRef = useRef<HTMLDivElement>(null);
        const svgRef = useRef<Svg | null>(null);

        useImperativeHandle(ref, () => ({ getSvg: () => svgRef.current }), []);

        useEffect(() => {
            if (!hostRef.current) return;
            svgRef.current = renderMaze(hostRef.current, maze, style, {
                showSolution,
                solution,
            });
        }, [maze, style, showSolution, solution]);

        return (
            <div className="paper-wrap">
                <div
                    className="paper"
                    id="print-area"
                    style={
                        {
                            "--aspect": aspect,
                            background: style.background,
                        } as CSSProperties
                    }
                >
                    <div ref={hostRef} className="svg-host" />
                </div>
            </div>
        );
    },
);
