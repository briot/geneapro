import {} from 'angular';
import {app} from './app';

interface UploadScope extends angular.IScope {
   mini        : boolean;
   autosubmit  : boolean;
   url         : string;
   onupload    : Function;
}

const div = document.createElement('div');
const hasDnd = (('draggable' in div) ||
               ('ondragstart' in div && 'ondrop' in div)) &&
              'FormData' in window &&
              'FileReader' in window;

class UploadController {
   files       : string[]= [];
   isUploading : boolean = false;
   dragover    : boolean = false;
   element     : angular.IAugmentedJQuery;

   static $inject = ['$scope', '$http'];
   constructor(
      public scope  : UploadScope,
      public $http  : angular.IHttpService)
   {
   }

   setElement(element : angular.IAugmentedJQuery) {
      this.element = element;   // element[0] must be a HTMLFormElement

      element.addClass('download-form');
      if (hasDnd) {
         element.bind(
            'drag dragstart dragend dragover dragenter dragleave drop',
            (e : Event) => {
               e.preventDefault();
               e.stopPropagation();
            })
         .bind('dragover dragenter', (e : any /*DragEvent*/) => {
            e.dataTransfer.dropEffect = 'copy';
            this.dragover = true;
            element.toggleClass('dragover', true);
            this.scope.$apply();
         })
         .bind('dragleave dragend drop', () => {
            this.dragover = false;
            element.toggleClass('dragover', false);
            this.scope.$apply();
         })
         .bind('drop', (e : any /* DragEvent */) => {
            angular.forEach(e.dataTransfer.files, (f) => {
               this.files.push(f);
            });
            if (this.scope.autosubmit) {
               this.send();
            }
            this.scope.$apply();
         });
      } else {
         alert('Cannot upload from IE9. Please upgrade your browser');
      }   
   }

   onchange() {
      if (this.scope.autosubmit) {
         this.send(true /* force */);
      }
   }

   send(force ?: boolean) {
      if (this.isUploading || (!force && this.files.length == 0)) {
         return false;
      }
      this.isUploading = true;

      const ajaxData = new FormData(<any> this.element[0]);
      angular.forEach(this.files, (f) => {
         ajaxData.append('file', f);
      });

      this.$http.post(this.scope.url, ajaxData,
            {headers: {'Content-Type': undefined },
             transformRequest: angular.identity 
            }).then(() => {
         this.isUploading = false;
         this.files = [];
         this.scope.onupload();
      }, () => {
         this.isUploading = false;
      });
   }
 }

// Must apply to a <form> element
app.directive('gpUploadTarget', ($http : angular.IHttpService) => {
   // Code from https://css-tricks.com/drag-and-drop-file-uploading/

   return {
      scope: {
         mini: '@',
         autosubmit: '@',
         url: '@',
         onupload: '&'
      },
      controller: UploadController,
      link: function(scope      : UploadScope,
                     element    : angular.IAugmentedJQuery,
                     attrs      : any,
                     controller : UploadController)
      {
         controller.setElement(element);
      }
   }
});

/**
 * A one-line drop target. This is only compatible with autosubmit.
 * Must be nested inside a <span gp-upload-target> element.
 */

interface DownloadFormChildScope extends angular.IScope {
   upload : UploadController;
}

app.directive('gpDownloadFormMini', function() {
   return {
      require: '^gpUploadTarget',
      replace: true,
      scope: {},
      link:  function(
         scope      : DownloadFormChildScope,
         element    : angular.IAugmentedJQuery,
         attrs      : any,
         uploadCtrl : UploadController)  // from parent directive
      {
         scope.upload = uploadCtrl;  //  Info from upload controller
         scope.upload.scope.autosubmit = true;   //  force autosubmit
         element.find('input').bind('change', () => {
            uploadCtrl.onchange();
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
      link:  function(
         scope      : DownloadFormChildScope,
         element    : angular.IAugmentedJQuery,
         attrs      : any,
         uploadCtrl : UploadController)  // from parent directive
      {
         scope.upload = uploadCtrl;  //  Info from upload controller
         element.find('input').bind('change', function() {
            uploadCtrl.onchange();
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
