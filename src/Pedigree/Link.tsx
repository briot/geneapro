import * as React from "react";
import {
   PedigreeSettings,
   LinkStyle,
   LayoutScheme,
   isVertical
} from "../Store/Pedigree";
import { NO_BOX } from "../Store/ColorTheme";
import { PersonLayout } from "../Pedigree/types";

interface PedigreeLinkProps {
   from: PersonLayout;
   to: PersonLayout;
   style: PedigreeSettings;
}

export default function PedigreeLink(props: PedigreeLinkProps) {
   const vertical = isVertical(props.style);

   const linkX = (p: PersonLayout, isFrom: boolean) => {
      switch (props.style.layout) {
         case LayoutScheme.LEFT_RIGHT:
            return isFrom ? p.x + p.w : p.x;
         case LayoutScheme.RIGHT_LEFT:
            return isFrom ? p.x : p.x + p.w;
         default:
            return p.x + p.w / 2;
      }
   };

   const linkY = (p: PersonLayout, isFrom: boolean) => {
      switch (props.style.layout) {
         case LayoutScheme.TOP_DOWN:
            return isFrom ? p.y + p.h : p.y;
         case LayoutScheme.BOTTOM_UP:
            return isFrom ? p.y : p.y + p.h;
         default:
            return (
               p.y + (props.style.colors === NO_BOX.id ? p.fs + 1 : p.h / 2)
            );
      }
   };

   const source = [
      linkX(props.from, true /* isFrom */),
      linkY(props.from, true /* isFrom */)
   ];
   const target = [
      linkX(props.to, false /* isFrom */),
      linkY(props.to, false /* isFrom */)
   ];

   let d: string;

   switch (props.style.links) {
      case LinkStyle.STRAIGHT:
         d = "M" + source + "L" + target;
         break;

      case LinkStyle.ORTHOGONAL:
         d = vertical
            ? "M" +
              source +
              "V" +
              (target[1] + Math.sign(source[1] - target[1]) * 5) +
              "H" +
              target[0] +
              "V" +
              target[1]
            : "M" +
              source +
              "H" +
              (target[0] + Math.sign(source[0] - target[0]) * 5) +
              "V" +
              target[1] +
              "H" +
              target[0];
         break;

      default:
         // CURVE
         d = vertical
            ? "M" +
              source +
              "C" +
              source[0] +
              "," +
              (source[1] + target[1]) / 2 +
              " " +
              target[0] +
              "," +
              (source[1] + target[1]) / 2 +
              " " +
              target
            : "M" +
              source +
              "C" +
              (source[0] + target[0]) / 2 +
              "," +
              source[1] +
              " " +
              (source[0] + target[0]) / 2 +
              "," +
              target[1] +
              " " +
              target;
   }

   if (props.style.colors === NO_BOX.id) {
      d += vertical ? "M" + source + "v-5" : "M" + source + "h" + -props.from.w;
   }

   return <path className="link" d={d} />;
}
