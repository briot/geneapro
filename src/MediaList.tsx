import * as React from 'react';
import { Button, Image } from 'semantic-ui-react';
import { SourceMedia } from './Store/Source';

interface MediasProps {
   medias?: SourceMedia[];
}

interface MediasState {
   selected?: number;  // index of selected image, if any
}

export default class Medias extends React.PureComponent<MediasProps, MediasState> {

   imageGroup: HTMLDivElement;
   scrollLeft: number|undefined;

   constructor(props: MediasProps) {
      super(props);
      this.state = {};
   }

   componentDidUpdate() {
      if (this.scrollLeft !== undefined && this.imageGroup) {
         this.imageGroup.scrollLeft = this.scrollLeft;
         this.scrollLeft = undefined;
      }
   }

   selectImage = (selected?: number) => {
      // Save current scrolling position, so that we can restore it
      if (selected !== undefined) {
         this.scrollLeft = this.imageGroup.scrollLeft;
      }
      this.setState({selected: selected});
   }

   render() {
      if (!this.props.medias) {
         return null;
      }

      if (this.state.selected !== undefined) {
         const m = this.props.medias[this.state.selected];
         return (
            <div>
               <Button
                  size="mini"
                  floated="right"
                  onClick={() => this.selectImage()}
               >
                  X
               </Button>
               <Image
                  fluid={true}
                  src={m.url}
                  title={m.file}
               />
            </div>
         );
      }

      return (
         <div
            ref={(r: HTMLDivElement) => this.imageGroup = r}
            style={{whiteSpace: 'nowrap', overflowX: 'auto'}}
         >
            {
               this.props.medias.map((m, idx) => (
                  <Image
                     key={m.id}
                     src={m.url}
                     size="small"
                     bordered={true}
                     spaced="right"
                     title={m.file}
                     style={{minWidth: 50}}
                     onClick={() => this.selectImage(idx)}
                  />
               ))
            }
         </div>
      );
   }
}
