import {IGPRootScope} from './basetypes';
import {app} from './app';
import {} from 'angular';
import * as d3 from 'd3';

/**
 * A service to display a contextual menu
 * Usage is:
 *    app.controler('...', function(contextMenu, $scope) {
 *       element.on('contextmenu', function() {
 *          contextMenu($scope, '#contextMenu', d3.event);
 *       });
 *    }
 * The element matched by the selector should have the class 'contextMenu'.
 * $scope is used to monitor when the page is unloaded.
 * Two signals are emitted ('contextMenuOpen' and 'contextMenuClose'), which
 * you can listen to via   $scope.$on('contextMenuOpen', function(){})
 */

export class ContextMenu {
   menu : d3.Selection<any> = undefined;
   element : EventTarget = undefined;
   data : any = undefined;

   static _singleton : ContextMenu = undefined;

   static $inject = ['$document', '$rootScope'];
   constructor(
      public $document : angular.IDocumentService,
      public $rootScope : IGPRootScope)
   {
   }

   private static _onKeyup(event : JQueryKeyEventObject) {
      if (event.keyCode === 27) {
         ContextMenu._singleton.destroy();
         event.preventDefault();
      }
   }

   private static _onClick(event : JQueryMouseEventObject) {
      // Some browser treat a 'contextmenu' event with a prior 'click'
      // event.
      if (event.button !== 2 ||
          event.target !== ContextMenu._singleton.element)
      {
         ContextMenu._singleton.destroy();
      }
   }

   destroy() {
      if (this.menu) {
         // $rootScope.$broadcast('contextMenuClose');
         this.menu.style('display', 'none');
         this.menu = undefined;
         this.data = undefined;
         this.element = undefined;
         this.$document.unbind('click', ContextMenu._onClick);
         this.$document.unbind('keyup', ContextMenu._onKeyup);
         this.$document.unbind('contextmenu', ContextMenu._onClick);
      }
   }

   create(selector : string, event : MouseEvent, data : any) {
      this.destroy();

      this.data = data;
      this.element = event.target;
      this.menu = d3.select(selector);
      this.menu.style('display', 'block')
         .style('left', event.pageX + 'px')
         .style('top', event.pageY + 'px');
      event.preventDefault();
      event.stopPropagation();

      this.$document.bind('click', ContextMenu._onClick);
      this.$document.bind('contextmenu', ContextMenu._onClick);
      this.$document.bind('keyup', ContextMenu._onKeyup);
      this.$rootScope.$broadcast('contextMenuOpen');
   }
}

//  ??? angular services are already singletons ?
function ContextMenuService(
   $document : angular.IDocumentService,
   $rootScope : IGPRootScope)
{
   return ContextMenu._singleton = ( // assignment
      ContextMenu._singleton
      || new ContextMenu($document, $rootScope));
}
ContextMenuService.$inject = ['$document', '$rootScope'];

app.factory('contextMenu', ContextMenuService);
