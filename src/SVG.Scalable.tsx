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

export default class ScalableSVG extends React.PureComponent<
   ScalableSVGProps,
   ScalableSVGState
> {
   state: ScalableSVGState = {
      scale: 1,
      translate: { left: 0, top: 0 }
   };

   zoomExtent: [number, number] = [1 / 6, 6];
   // Maximum levels of zoom (in and out)

   private origin:
      | undefined
      | {
           clickX: number;
           clickY: number;
           translate: Point;
        };
   // Where the mouseDown occurred, only set during a drag

   private svgRef: SVGSVGElement | null = null;

   render() {
      return (
         <svg
            ref={(ref: SVGSVGElement) => (this.svgRef = ref)}
            {...this.props}
            preserveAspectRatio="xMinYMin meet"
            onMouseDown={this.onMouseDown}
            onWheel={this.wheeled}
         >
            <g
               transform={
                  `scale(${this.state.scale})` +
                  `translate(${-this.state.translate.left},${-this.state
                     .translate.top})`
               }
            >
               {this.props.children}
            </g>
         </svg>
      );
   }

   onMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
      if (e.button === 0) {
         this.origin = {
            clickX: e.pageX,
            clickY: e.pageY,
            translate: this.state.translate
         };
         document.addEventListener("mouseup", this.onMouseUp);
         document.addEventListener("mousemove", this.onMouseMove);
         e.preventDefault();
         e.stopPropagation();
      }
   };

   onMouseUp = (e: MouseEvent) => {
      document.removeEventListener("mouseup", this.onMouseUp);
      document.removeEventListener("mousemove", this.onMouseMove);
      e.preventDefault();
      e.stopPropagation();
   };

   onMouseMove = (e: MouseEvent) => {
      const offsetX = (e.pageX - this.origin!.clickX) / this.state.scale;
      const offsetY = (e.pageY - this.origin!.clickY) / this.state.scale;
      this.setState({
         translate: {
            left: this.origin!.translate.left - offsetX,
            top: this.origin!.translate.top - offsetY
         }
      });
   };

   /**
    * Change scaling factor, keeping `preserve` at the same location on
    * the screen.
    * `preserve` is given in canvas coordinates
    */
   scaleBy(factor: number, preserve: Point) {
      this.setState(
         (oldState: ScalableSVGState): ScalableSVGState => {
            const newScale = Math.max(
               Math.min(oldState.scale * factor, this.zoomExtent[1]),
               this.zoomExtent[0]
            );
            const preserveScreen = this.toScreen(preserve);
            const newTrans: Point = {
               left: preserve.left - preserveScreen.left / newScale,
               top: preserve.top - preserveScreen.top / newScale
            };
            return {
               scale: newScale,
               translate: newTrans
            };
         }
      );
   }

   /**
    * Convert from screen coordinates to canvas coordinates
    */
   toCanvas(p: Point): Point {
      return {
         left: p.left / this.state.scale + this.state.translate.left,
         top: p.top / this.state.scale + this.state.translate.top
      };
   }

   /**
    * Convert from canvas coordinates to screen
    */
   toScreen(p: Point): Point {
      return {
         left: (p.left - this.state.translate.left) * this.state.scale,
         top: (p.top - this.state.translate.top) * this.state.scale
      };
   }

   /**
    * React to wheel events (zoom in)
    */
   wheeled = (e: React.WheelEvent<SVGSVGElement>) => {
      const rect = this.svgRef!.getBoundingClientRect();
      const escreen = this.toCanvas({
         left: e.clientX - rect.left,
         top: e.clientY - rect.top
      });
      this.scaleBy(
         Math.pow(2, 0.002 * -e.deltaY * (e.deltaMode ? 120 : 1)) /* factor */,
         escreen /* preserve */
      );
      e.preventDefault();
   };
}
