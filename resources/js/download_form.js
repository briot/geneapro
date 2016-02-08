app.
directive('gpDownloadForm', function() {
   // Code from https://css-tricks.com/drag-and-drop-file-uploading/

   var div = document.createElement('div');
   var hasDnd = (('draggable' in div) ||
                 ('ondragstart' in div && 'ondrop' in div)) &&
                'FormData' in window &&
                'FileReader' in window;

   return {
      controller: function($scope) {
         $scope.hasDnd = hasDnd;
      },
      link: function(scope, element) {
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

               scope.files = [];
               scope.isUploading = false;

               //$.ajax({
               //  url: $form.attr('action'),
               //  type: $form.attr('method'),
               //  data: ajaxData,
               //  dataType: 'json',
               //  cache: false,
               //  contentType: false,
               //  processData: false,
               //  complete: function() {
               //    $form.removeClass('is-uploading');
               //  },
               //  success: function(data) {
               //    $form.addClass( data.success == true ? 'is-success' : 'is-error' );
               //    if (!data.success) $errorMsg.text(data.error);
               //  },
               //  error: function() {
               //    // Log the error, show an alert, whatever works for you
               //  }
               //});

            } else {
               // Only for IE9, ignored for now
            }
         };
      },
      template: 
         '<form class="download-form" method="post" enctype="multipart/form-data"'
         +   ' ng-class="{hasDnd:hasDnd, dragover:dragover}">'
         + '<div class="box__input">'
         +    '<div class="fa fa-download icon"></div>'
         +    '<input type="file" name="files[]" id="file"'
         +           ' data-multiple-caption="{count} files selected" multiple />'
         +    '<label for="file">'
         +       '<span ng-if="files.length==0">'
         +          '<span class="Abtn Abtn-info">Choose a file</span>'
         +          '<span ng-if="hasDnd" class="normal"> or drag it here</span>.'
         +       '</span>'
         +       '<span ng-if="files.length!=0" ng-repeat="f in files" style="margin-right:10px">'
         +          '{{f.name}}'
         +       '</span>'
         +    '</label>'
         +    '<button ng-if="files.length!=0" class="btn btn-primary"'
         +           ' ng-click="send()">Upload</button>'
         + '</div>'
         + '<div ng-if="isUploading">Uploading&hellip;</div>'
         + '<div class="box__success">Done!</div>'
         + '<div class="box__error">Error! <span></span>.</div>'
         + '</form>'
   };
});
