import {Component, ElementRef, Input, Injectable} from '@angular/core';
import {Router, ActivatedRoute, Params} from '@angular/router';
import * as d3 from 'd3';
import {Settings} from './settings.service';
import {GPd3Service, ScalableSelection, d3Styles, LayoutInfo} from './d3.service';
import {ContextMenuService, ContextualItem} from './contextmenu';
import {QuiltsService, QuiltsData, F_HEIGHT, FamilyInfo, FamilyInfoLayer,
        PersonLayout, LINE_SPACING, MARGIN, PersonInfo} from './quilts.service';

@Component({
   selector: 'quilts',
   template: '',
})
export class Quilts {
   @Input() id : number;
   private scalable : ScalableSelection;
   private data   : QuiltsData;

   constructor(
      private element       : ElementRef,
      private gpd3          : GPd3Service,
      private quiltsService : QuiltsService,
      public settings       : Settings)
   {
      this.settings.onChange.subscribe(() => this.ngOnChanges(null));
   }

   ngOnChanges(changes : any) {
      const set = this.settings.quilts;
      if (!this.scalable) {
         this.scalable = this.gpd3.svg(this.element);
      }
      this.quiltsService.get(this.id, !set.whole).subscribe(d => this.render(d));
   }

   /**
    * Called when a person is selected
    */
   onPersonSelected(p : PersonInfo, e : MouseEvent) {
      if (!e.shiftKey) {
         this.data.clearSelection();
      }
      this.data.addToSelection(p);
      this.render(this.data);
   }

   render(data : QuiltsData) {
      this.data = data;
      this.scalable.selection.attr('class', 'quilts');

      const nonEmptyLayers = data.data.persons.filter((d, layer) => !data.isEmpty(layer));

      const allLayers = this.scalable.selection
         .selectAll('g.layer')
         .data(nonEmptyLayers);

      allLayers.exit().remove();
      allLayers
         .enter()
         .append('g')
            .attr('class', 'layer')
            .append('rect')
               .attr('class', 'person');

      allLayers   // enter + update
         .attr('transform', (personList, layer) => `translate(${data.lefts[layer]},${data.tops[layer]})`);
      allLayers  // enter + update
         .select('rect.person')
            .attr({
               'width': (personList, layer) => data.rights[layer] - data.lefts[layer],
               'height': (personList, layer) => data.heights[layer]
            });
      const allText = allLayers  // enter + update
         .selectAll('text')
         .data(personList => personList);
      allText   // ??? Should filter visible persons
         .enter()
            .append('text')
            .on('click', (p : PersonInfo) => this.onPersonSelected(p, <MouseEvent>d3.event));
      allText
         .attr({
            // 'fill': (p : PersonInfo) => data.colorForPerson(p.id),
            'x': MARGIN,
            'y': (p : PersonInfo, index : number) => (1 + index) * LINE_SPACING 
         })
         .text((p : PersonInfo) => p.name);

      // Draw the horizonal lines
      const allHorizGroups = this.scalable.selection
         .selectAll('g.horiz')
         .data(nonEmptyLayers);
      allHorizGroups
         .enter()
             .append('g')
             .attr('class', 'horiz');
      const allHoriz = allHorizGroups
         .selectAll('path.line')
         .data(personList => personList); // ??? Should filter visible persons
      allHoriz
         .enter()
         .append('path')
            .attr('class', 'line');
      allHoriz
         .attr('d', (p : PersonInfo) => {
            const layout : PersonLayout = data.personToLayer[p.id];
            let d = '';
            if (layout) {
               if (data.rights[layout.layer] < layout.maxMarriageLineX) {
                  d = `M${data.rights[layout.layer]} ${layout.y}H${layout.maxMarriageLineX}`;
               }
               if (layout.minChildLineX !== null &&
                   layout.minChildLineX < data.lefts[layout.layer])
               {
                  d += `M${layout.minChildLineX} ${layout.y}H${data.lefts[layout.layer]}`;
               }
            }
            return d;
         }); 

      // Display the rows that separate marriages and child info, except for
      // the last layer we display.

      const allSeps = this.scalable.selection
         .selectAll('rect.separator')
         .data(nonEmptyLayers.filter((d, layer) => layer < nonEmptyLayers.length - 1));
      allSeps.exit().remove();
      allSeps
         .enter()
         .append('rect')
            .attr('class', 'separator');
      allSeps  // enter + update
         .attr({
            'x': (personList, layer) => data.rights[layer + 1] - 1,
            'y': (personList, layer) => data.tops[layer] - F_HEIGHT,
            'width': (personList, layer) => data.lefts[layer] - data.rights[layer + 1],
            'height': F_HEIGHT});

      // Display family blocks
      // Between each layer box, we have a family block used to display marriage
      // and children information.

      const allFamBlocks = this.scalable.selection
         .selectAll('g.familyblock')
         .data(data.data.families);
      allFamBlocks.exit().remove();
      allFamBlocks
         .enter()
         .append('g')
            .attr('class', 'familyblock');

      allFamBlocks
         .attr('transform', (f, layer) => `translate(${data.rights[layer+1]},0)`);

      // Draw the right-most line in the family block
      allFamBlocks.select('path.line').remove();
      allFamBlocks.append('path')
            .attr('class', 'line')
            .attr('d', (f : FamilyInfoLayer) => `M${f.maxIndex * LINE_SPACING} ${f.lastMinY}V${f.lastMaxY}`);

      // Display families within each block
      // Each family is one column with a block

      const allFams = allFamBlocks
         .selectAll('g.family')
         .data((f : FamilyInfoLayer) => f.filter((i : FamilyInfo) => i.visible));
      allFams.exit().remove()
      allFams
         .enter()
         .append('g')
            .attr('class', 'family');
      allFams   // enter + update
         .attr('transform',
               (f : FamilyInfo) => `translate(${f.x},0)`);

      // Draw the vertical lines
      allFams
         .append('path')
            .attr('class', 'line')
            .attr('d', (f : FamilyInfo) => `M0 ${f.minY}V${f.maxY}`);

      // Display persons within each family column
      // Each person is one cell within the column

      const allPersons = allFams
         .selectAll('g.person')
         .data((f : FamilyInfo) => f.filter((i : number) => data.personToLayer[i] !== undefined));
      allPersons.exit().remove();
      allPersons
         .enter()
         .append('g')
            .attr('class', 'person')
            .append('path');
      allPersons   // enter + update
         .select('path')
         .attr('fill', (p : number) => data.colorForPerson(p))
         .attr('d',
               (p : number) => {
                  const info = data.personToLayer[p];
                  const y = info.y;
                  if (info.sex == 'F') {
                     // A circle.
                     const r = LINE_SPACING / 2;
                     return `M0,${y+r}a${r},${r} 0 1 1 0,1Z`;
                  } else if (info.sex == 'M') {
                     // A square
                     return `M0 ${y}h${LINE_SPACING}v${LINE_SPACING}h${-LINE_SPACING}z`;
                  } else {
                     // A small square
                     const s = LINE_SPACING - 8;
                     return `M4 ${y+4}h${s}v${s}h${-s}z`;
                  }
               });

       // Highlight the selection rectangles

       this.scalable.selection.selectAll('rect.highlight').remove();
       
       for (let p in data.selected) {
          const info = data.personToLayer[p];

          const x = info.minChildX || data.lefts[info.layer];
          const x2 = info.maxMarriageX | data.rights[info.layer];

          data.selected[p].forEach(color => {
             const c = data.colors(color);
             this.scalable.selection
                .append('rect')
                   .attr({
                      'class': 'highlight',
                      'opacity': 0.2,
                      'fill': c,
                      'x': x,
                      'y': info.y,
                      'width': x2 - x,
                      'height': LINE_SPACING
                   });
             if (info.minParentY) {
                this.scalable.selection
                   .append('rect')
                      .attr({
                         'class': 'highlight',
                         'opacity': 0.2,
                         'fill': c,
                         'x': x,
                         'y': info.minParentY,
                         'width': LINE_SPACING,
                         'height': info.y - info.minParentY
                      });
             }
          });
       }
   }
}


@Component({
   templateUrl: './quilts.html',
})
export class QuiltsPage {
   public id : number;
   contextualLinks : ContextualItem[];

   constructor(
      public settings        : Settings,
      private contextService : ContextMenuService,
      private router         : Router,
      private route          : ActivatedRoute)
   {
      this.contextualLinks = [];
   }

   ngOnInit() {
      // Subscribe to changes in the parameters
      this.route.params.forEach((p : Params) => {
         this.id = +p['id'];
         this.settings.decujus = this.id;
         this.settings.setTitle('Quilts for person ' + this.id);
      });
   }

   changed() {
      this.settings.reportChange();
   }

   onBackgroundContextMenu(event : MouseEvent) {
      this.contextService.createMenu(event, null);
   }
}
