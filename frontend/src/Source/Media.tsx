import * as React from "react";
import { Source } from "../Store/Source";
import Medias from "../MediaList";

interface SourceMediasProps {
   source: Source;
}

const SourceMedias: React.FC<SourceMediasProps> = props => {
   return <Medias medias={props.source.medias} />;
}
export default SourceMedias;
