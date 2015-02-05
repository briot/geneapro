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
app.factory('contextMenu', function($document, $rootScope) {

   function contextMenu() {
      this.menu = undefined;
      this.element = undefined; // on which the user clicked
      this.data = undefined;
   }

   contextMenu.prototype.destroy = function() {
      if (this.menu) {
         this.menu.style('display', 'none');
         this.menu = undefined;
         this.data = undefined;
         this.element = undefined;
         $document.unbind('click', onClick);
         $document.unbind('keyup', onKeyup);
         $document.unbind('contextmenu', onClick);
         $rootScope.$broadcast('contextMenuClose');
      }
   };

   contextMenu.prototype.create = function(scope, selector, event, data) {
      this.destroy();

      this.data = data;
      this.element = event.target;
      this.menu = d3.select(selector);
      this.menu.style('display', 'block')
         .style('left', event.pageX + 'px')
         .style('top', event.pageY + 'px');
      event.preventDefault();
      event.stopPropagation();

      $document.bind('click', onClick);
      $document.bind('contextmenu', onClick);
      $document.bind('keyup', onKeyup);
      scope.$on('$destroy', angular.bind(this.destroy, this));

      $rootScope.$broadcast('contextMenuOpen');
   };

   var globalMenu = new contextMenu();

   function onKeyup(event) {
      if (event.keyCode === 27) {
         globalMenu.destroy();
         event.preventDefault();
      }
   }

   function onClick(event) {
      // Some browser treat a 'contextmenu' event with a prior 'click'
      // event.
      if (event.button !== 2 ||
          event.target !== globalMenu.element)
      {
         globalMenu.destroy();
      }
   }

   return globalMenu;
});
