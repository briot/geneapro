import * as React from "react";
import { Source } from "../Store/Source";
import Medias from "../MediaList";

interface SourceMediasProps {
   source: Source;
}

export default function SourceMedias(props: SourceMediasProps) {
   return <Medias medias={props.source.medias} />;
}
