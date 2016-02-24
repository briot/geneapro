app.

factory('UploadMedia', function($http) {
   /**
    * The element becomes a drag-and-drop target for uploading new
    * media
    * @param {jQueryLite} element   the drop target.
    */
   function UploadMedia(scope, element, autosubmit, url, onupload) {
      this.files = [];
      this.isUploading = false;
      this.dragover = false;
      this.url = url;
      this.onupload = onupload;

      if (UploadMedia.hasDnd) {
         element.bind(
            'drag dragstart dragend dragover dragenter dragleave drop',
            function(e) {
               e.preventDefault();
               e.stopPropagation();
            })
         .bind('dragover dragenter', function(e) {
            e.dataTransfer.dropEffect = 'copy';
            this.dragover = true;
            scope.$apply();
         })
         .bind('dragleave dragend drop', function() {
            this.dragover = false;
            scope.$apply();
         })
         .bind('drop', function(e) {
            var self = this;
            angular.forEach(e.dataTransfer.files, function(f) {
               self.files.push(f);
            });
            scope.$apply();
            if (autosubmit) {
               self.send();
            }
         });

      } else {
         alert('Cannot upload from IE9. Please upgrade your browser');
      }
   }

   /**
    * Whether the browser supports drag-and-drop
    */
   var div = document.createElement('div');
   UploadMedia.hasDnd = (('draggable' in div) ||
                         ('ondragstart' in div && 'ondrop' in div)) &&
                        'FormData' in window &&
                        'FileReader' in window;

   /**
    * Send the list of files to the server
    */

   UploadMedia.prototype.send = function() {
      var self = this;
      if (self.isUploading || self.files.length == 0) {
         return false;
      }
      self.isUploading = true;

      var ajaxData = new FormData(element[0]);
      angular.forEach(self.files, function(f) {
         ajaxData.append('file', f);
      });

      $http.post(self.url, ajaxData,
            {headers: {'Content-Type': undefined },
             transformRequest: angular.identity 
            }).then(function() {
         self.isUploading = false;
         self.files = [];
         self.onupload();
      }, function() {
         self.isUploading = false;
      });
   };

   return UploadMedia;
}).

directive('gpDownloadForm', function(UploadMedia) {
   // Code from https://css-tricks.com/drag-and-drop-file-uploading/

   return {
      scope: {
         mini: '@',
         autosubmit: '@',
         url: '@',
         onupload: '&'
      },
      replace: true,
      link: function(scope, element) {
         scope.upload = new UploadMedia(
            scope, element, scope.autosubmit, scope.url, scope.onupload);
      },
      template: 
         '<form class="download-form"'
         +   ' method="post" enctype="multipart/form-data"'
         +   ' ng-class="{maxi:!mini, mini:mini, dragover:dragover}">'
         + '<div class="box__input">'
         +    '<span class="fa fa-download icon"></span>'
         +    '<input type="file" name="files[]" id="file"'
         +           ' data-multiple-caption="{upload.files.length} files selected" multiple />'
         +    '<label for="file">'
         +       '<span ng-if="upload.files.length==0">'
         +          '<span ng-if="!mini">Choose a file or </span>'
         +          '<span class="normal">drop media here</span>.'
         +       '</span>'
         +       '<span ng-if="upload.files.length!=0" ng-repeat="f in upload.files" style="margin-right:10px">'
         +          '{{f.name}}'
         +       '</span>'
         +    '</label>'
         +    '<button ng-if="upload.files.length!=0 && !autosubmit" class="btn btn-primary"'
         +           ' ng-class="{\'btn-xs\': mini}"'
         +           ' ng-click="upload.send()">Upload</button>'
         + '</div>'
         + '<div ng-if="isUploading" class="fa fa-spin fa-spinner"></div>'
         + '</form>'
   };
});
