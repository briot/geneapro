import * as React from 'react';
import { Button, Image } from 'semantic-ui-react';
import { SourceMedia } from './Store/Source';
import './MediaList.css';

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
            <div className="medialistSingle">
               <span>
                  <legend>
                     {m.comments}
                  </legend>
                  <Button
                     size="mini"
                     onClick={() => this.selectImage()}
                  >
                     X
                  </Button>
               </span>
               <Image
                  fluid={true}
                  src={m.url}
                  title={m.comments + '\n\n' + m.file}
               />
            </div>
         );
      }

      return (
         <div
            className="medialist"
            ref={(r: HTMLDivElement) => this.imageGroup = r}
         >
            {
               this.props.medias.map((m, idx) => (
                  <div className="image" key={m.id}>
                     <Image
                        src={m.url}
                        size="small"
                        bordered={true}
                        title={m.comments + '\n\n' + m.file}
                        style={{minWidth: 50}}
                        onClick={() => this.selectImage(idx)}
                     />
                     <legend>{m.comments}</legend>
                  </div>
               ))
            }
         </div>
      );
   }
}
