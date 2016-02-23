app.
directive('gpDownloadForm', function($http) {
   // Code from https://css-tricks.com/drag-and-drop-file-uploading/

   var div = document.createElement('div');
   var hasDnd = (('draggable' in div) ||
                 ('ondragstart' in div && 'ondrop' in div)) &&
                'FormData' in window &&
                'FileReader' in window;

   return {
      scope: {
         mini: '@',
         autosubmit: '@',
         url: '@',
         onupload: '&'
      },
      replace: true,
      link: function(scope, element) {
         scope.hasDnd = hasDnd;
         scope.files = [];
         scope.isUploading = false;

         if (hasDnd) {
            element.bind('drag dragstart dragend dragover dragenter dragleave drop', function(e) {
              e.preventDefault();
              e.stopPropagation();
            })
            .bind('dragover dragenter', function(e) {
               e.dataTransfer.dropEffect = 'copy';
               scope.dragover = true;
               scope.$apply();
            })
            .bind('dragleave dragend drop', function() {
               scope.dragover = false;
               scope.$apply();
            })
            .bind('drop', function(e) {
               angular.forEach(e.dataTransfer.files, function(f) {
                  scope.files.push(f);
               });
               scope.$apply();
               if (scope.autosubmit) {
                  scope.send();
               }
            });
         }

         scope.send = function() {
            if (scope.isUploading || scope.files.length == 0) {
               return false;
            }
            scope.isUploading = true;

            if (hasDnd) {
               var ajaxData = new FormData(element[0]);
               angular.forEach(scope.files, function(f) {
                  ajaxData.append('file', f);
               });

               $http.post(scope.url, ajaxData,
                     {headers: {'Content-Type': undefined },
                      transformRequest: angular.identity 
                     }).then(function() {
                  scope.isUploading = false;
                  scope.files = [];
                  scope.onupload();
               }, function() {
                  scope.isUploading = false;
               });

            } else {
               alert('Cannot upload from IE9. Please upgrade your browser');
            }
         };
      },
      template: 
         '<form class="download-form"'
         +   ' method="post" enctype="multipart/form-data"'
         +   ' ng-class="{hasDnd:hasDnd, maxi:!mini, mini:mini, dragover:dragover}">'
         + '<div class="box__input">'
         +    '<span class="fa fa-download icon"></span>'
         +    '<input type="file" name="files[]" id="file"'
         +           ' data-multiple-caption="{count} files selected" multiple />'
         +    '<label for="file">'
         +       '<span ng-if="files.length==0">'
         +          '<span ng-if="!mini">Choose a file or </span>'
         +          '<span ng-if="hasDnd" class="normal">drop it here</span>.'
         +       '</span>'
         +       '<span ng-if="files.length!=0" ng-repeat="f in files" style="margin-right:10px">'
         +          '{{f.name}}'
         +       '</span>'
         +    '</label>'
         +    '<button ng-if="files.length!=0 && !autosubmit" class="btn btn-primary"'
         +           ' ng-class="{\'btn-xs\': mini}"'
         +           ' ng-click="send()">Upload</button>'
         + '</div>'
         + '<div ng-if="isUploading" class="fa fa-spin fa-spinner"></div>'
         //+ '<div class="box__success">Done!</div>'
         //+ '<div class="box__error">Error! <span></span>.</div>'
         + '</form>'
   };
});
