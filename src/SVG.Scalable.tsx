import * as React from "react";

interface Point {
   left: number;
   top: number;
}

interface ScalableSVGProps {
   className?: string;
}

interface ScalableSVGState {
   translate: Point;
   scale: number;
}

interface Origin {
   clickX: number;
   clickY: number;
   translate: Point;
}

// Maximum levels of zoom (in and out)
const ZOOM_EXTENT = [1 / 6, 6];

const ScalableSVG: React.FC<ScalableSVGProps> = (p) => {
   const [pos, setPos] = React.useState<ScalableSVGState>({
      scale: 1, translate: {left: 0, top: 0}});
   const svgRef = React.useRef<SVGSVGElement|null>(null);

   // Where the mouseDown occurred, only set during a drag
   const origin = React.useRef<Origin|undefined>(undefined);

   React.useEffect(
      () => {
         const onMouseDown = (e: MouseEvent) => {
            if (e.target === svgRef.current) {
               if (e.button === 0) {
                  origin.current = {
                     clickX: e.pageX,
                     clickY: e.pageY,
                     translate: pos.translate
                  };
               }
               e.preventDefault();
               e.stopPropagation();
            }
         };
         document.addEventListener('mousedown', onMouseDown);
         return () => document.removeEventListener("mousedown", onMouseDown);
      },
      [pos.translate]
   );

   React.useEffect(
      () => {
         const onMouseUp = () => origin.current = undefined;
         document.addEventListener('mouseup', onMouseUp);
         return () => document.removeEventListener("mouseup", onMouseUp);
      },
      []
   );

   React.useEffect(
      () => {
         const onMouseMove = (e: MouseEvent) => {
            const c = origin.current;
            if (c) {
               const offsetX = (e.pageX - c.clickX) / pos.scale;
               const offsetY = (e.pageY - c.clickY) / pos.scale;
               setPos(old => ({
                  scale: old.scale,
                  translate: {
                     left: c.translate.left - offsetX,
                     top: c.translate.top - offsetY
               }}));
               e.preventDefault();
            }
         };
         document.addEventListener("mousemove", onMouseMove);
         return () => document.removeEventListener("mousemove", onMouseMove);
      },
      [pos.scale]
   );

   React.useEffect(
      () => {
         const onMouseWheel = (e: WheelEvent) => {
            if (svgRef.current) {
               const rect = svgRef.current.getBoundingClientRect();
               setPos(old => {
                  const preserveScreen = {
                     left: e.clientX - rect.left,
                     top: e.clientY - rect.top
                  };
                  const preserve = {
                     left: preserveScreen.left / old.scale + old.translate.left,
                     top: preserveScreen.top / old.scale + old.translate.top
                  };
                  const factor = Math.pow(
                     2, 0.002 * -e.deltaY * (e.deltaMode ? 120 : 1));
                  const scale = Math.max(
                     Math.min(old.scale * factor, ZOOM_EXTENT[1]),
                     ZOOM_EXTENT[0]
                  );
                  const translate: Point = {
                     left: preserve.left - preserveScreen.left / scale,
                     top: preserve.top - preserveScreen.top / scale
                  };
                  return {scale, translate};
               });
               e.preventDefault();
            }
         };

         const e = svgRef.current;
         if (e) {
            e.addEventListener("wheel", onMouseWheel, {passive: false});
            return () => e.removeEventListener("wheel", onMouseWheel);
         }
      },
      []
   );

   return (
      <svg ref={svgRef} {...p} preserveAspectRatio="xMinYMin meet" >
         <g
            transform={
               `scale(${pos.scale})` +
               `translate(${-pos.translate.left},${-pos.translate.top})`
            }
         >
            {p.children}
         </g>
      </svg>
   );
};

export default ScalableSVG;
