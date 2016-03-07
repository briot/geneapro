app.

// Must apply to a <form> element
directive('gpUploadTarget', function($http) {
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
      controller: function($scope) {
         this.scope = $scope;
      },
      link: function(scope, element) {
         scope.files = [];
         scope.isUploading = false;
         scope.dragover = false;

         element.addClass('download-form');
         scope.$watch('dragover', function(v) {
            element.toggleClass('dragover', v);
         });

         if (hasDnd) {
            element.bind(
               'drag dragstart dragend dragover dragenter dragleave drop',
               function(e) {
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
               if (scope.autosubmit) {
                  scope.send();
               }
               scope.$apply();
            });

            scope.onchange = function(input) {
               if (scope.autosubmit) {
                  scope.send(true /* force */);
               }
            };

            scope.send = function(force) {
               if (scope.isUploading || (!force && scope.files.length == 0)) {
                  return false;
               }
               scope.isUploading = true;

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
            };

         } else {
            alert('Cannot upload from IE9. Please upgrade your browser');
         }
      }
   }
}).

/**
 * A one-line drop target. This is only compatible with autosubmit.
 * Must be nested inside a <span gp-upload-target> element.
 */

directive('gpDownloadFormMini', function() {
   return {
      require: '^gpUploadTarget',
      replace: true,
      scope: {},
      link:  function(scope, element, attrs, uploadCtrl) {
         scope.upload = uploadCtrl.scope;  //  Info from upload controller
         scope.upload.autosubmit = true;   //  force autosubmit
         element.find('input').bind('change', function() {
            scope.upload.onchange(this);
         });
      },
      template:
         '<div class="mini">'
       +    '<span class="fa fa-download icon"></span>'
       +    '<input type=file name=file id=file ng-model="upload.files" multiple/>'
       +    '<label for=file>'
       +       '<span class="normal">drop media here</span>'
       +       '<span ng-if="!upload.isUploading" class="btn btn-xs btn-primary fa fa-plus"></span>'
       +       '<span ng-if="upload.isUploading" class="fa fa-spin fa-spinner"></span>'
       +    '</label>'
       + '</div>'
   };
}).

/**
 * An upload form.
 * Must be nested inside a <div gp-upload-target> element.
 */

directive('gpDownloadForm', function() {
   return {
      require: '^gpUploadTarget',
      replace: true,
      scope: {},
      link:  function(scope, element, attrs, uploadCtrl) {
         scope.upload = uploadCtrl.scope;  //  Info from upload controller
         element.find('input').bind('change', function() {
            scope.upload.onchange(this);
         });
      },
      template: 
         '<div class="maxi">'
       +    '<span class="fa fa-download icon"></span>'
       +    '<input type=file name=file ng-model="upload.files" id=file multiple/>'
       +    '<label for="file">'
       +       '<span ng-if="upload.files.length==0">'
       +          '<span>Choose a file or </span>'
       +          '<span class="normal">drop media here</span>.'
       +       '</span>'
       +       '<span ng-if="upload.files.length!=0" ng-repeat="f in upload.files" style="margin-right:10px">'
       +          '{{f.name}}'
       +       '</span>'
       +    '</label>'
       +    '<button ng-if="upload.files.length!=0 && !upload.isUploading && !autosubmit"'
       +           ' class="btn btn-primary" ng-click="upload.send()">'
       +        'Upload'
       +    '</button>'
       +    '<div ng-if="upload.isUploading" class="fa fa-spin fa-spinner"></div>'
       + '</div>'
   };
});
