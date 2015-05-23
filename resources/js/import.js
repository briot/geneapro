app.
config(function($stateProvider) {
   $stateProvider.
   state('import', {
      url: '/import',
      templateUrl: 'geneaprove/import.html',
      controller: 'importCtrl'
   });
}).

controller('importCtrl', function($scope, $http, upload) {
   $scope.success = null;
   $scope.error = null;
   $scope.data = {importFileName: undefined};

   $scope.$watch('data.importFileName', function(val) {
      if (val) {
         $scope.importing = true;

         upload({
            url: '/import',
            method: 'POST',
            data: {
               file: val[1]
            },
            onSuccess: function() {console.log("MANU success")},
            onError: function() {console.log("MANU error")},
            onUpload: function() {console.log("MANU upload")},
            onComplete: function() {console.log("MANU complete")},
         }).then(function(resp) {
            $scope.success = resp.data.success;
            $scope.error = resp.data.error;
            $scope.importing = false;
            console.log("MANU response=", resp);
         });
      }
   });
});
