app.
config(function($stateProvider) {
   $stateProvider.
   state('stats', {
      url: '/stats',
      templateUrl: 'geneaprove/stats.html',
      controller: 'statsCtrl',
      data: {
         pageTitle: '[Genaprove] Statistics'
      }
   });
}).

controller('statsCtrl', function($scope, $http, $stateParams, $rootScope, $window, gpd3) {
   $http.get('/data/stats').then(function(resp) {
      $scope.data = resp.data;
      $scope.colors = d3.scale.category20b();
      generations();
      lifespan();
   });

   function generations() {
      // Our data is a 2D array of the form:
      //   [ [ gen_number, min_date, max_date, legend], ...]
      var div = angular.element($window.document.getElementById('generations'));
      var width = div[0].clientWidth;
      var height = div[0].clientHeight;
      var margin = 30;

      var svg = d3.select(div[0]).append('svg');

      var x = d3.scale.linear()
         .domain([d3.min($scope.data.ranges, function(d) { return d[1] }),
                  d3.max($scope.data.ranges, function(d) { return d[2] })])
         .range([margin, width]);
      var y = d3.scale.linear()
         .domain([1, $scope.data.ranges.length + 1])
         .range([height - margin, 0]);

      function make_x_axis() {
         return d3.svg.axis().scale(x).orient("bottom");
      }
      function make_y_axis() {
         return d3.svg.axis().scale(y).orient("left").ticks(5);
      }

      // The grid
      svg.append("g")
         .attr('class', 'grid')
         .attr('transform', 'translate(' + 0 + ',' + (height - margin) + ')')
         .call(make_x_axis().tickSize(-height, 0, 0).tickFormat(''));
      svg.append("g")
         .attr('class', 'grid')
         .attr("transform", 'translate(' + margin + ',0)')
         .call(make_y_axis().tickSize(-width, 0, 0).tickFormat(''));

      // The axis
      svg.append("svg:g")
         .attr('class', 'axis x-axis')
         .attr('transform', 'translate(' + 0 + ',' + (height - margin) + ')')
         .call(make_x_axis());

      svg.append("svg:g")
         .attr('class', 'axis y-axis')
         .attr("transform", 'translate(' + margin + ',0)')
         .call(make_y_axis());

      var rect = svg.selectAll("rect")
            .data($scope.data.ranges)
            .enter().append("rect")
            .attr('fill', function(d) { return $scope.colors(d[0])})
            .attr('title', function(d) { return d[3] })
            .attr("x", function(d) { return x(d[1]); })
            .attr('width', function(d) { return x(d[2]) - x(d[1])})
            .attr("y", function(d) { return y(d[0] + 1) })
            .attr("height", height / $scope.data.ranges.length);
   }

   function lifespan() {
      var div = angular.element($window.document.getElementById('lifespan'));

      // Our ages data is a 2D array, of the form:
      //    [  [age1, males1, females1, unknown1],
      //       [age2, males2, females2, unknown2], ...]
      // layout.stack excepts input of the type:
      //    [  [{x:0, y:males1},   {x:1, y:males2}],
      //       [{x:0, y:females1}, {x:1, y:females2}], ... ]

      var remapped = ['males', 'females', 'unknown'].map(function(sex, sex_i) {
         return $scope.data.ages.map(function(forsex, column) {
            return {x: $scope.data.ages[column][0] /* the age */,
                    y: forsex[sex_i + 1]   /* count for this age/sex */,
                    category: sex,
                    value: forsex[sex_i + 1]};
         });
      });

      var stacked = d3.layout.stack()(remapped);
      var width = div[0].clientWidth;
      var height = div[0].clientHeight;
      var margin = 30;
      var x = d3.scale.ordinal()
         .domain($scope.data.ages.map(function (d) {return d[0]; }))
         .rangePoints([margin, width]);
      var y = d3.scale.linear()
         .domain([0,
                  d3.max(remapped, function(d) {
                     return d3.max(d, function(d) { return d.y0 + d.y });
                  })])
         .range([height - margin, 0]);

      var colors = d3.scale.category10();

      // Create the svg and toplevel group
      var svg = d3.select(div[0]).append('svg');

      function make_x_axis() {
         return d3.svg.axis().scale(x).orient("bottom");
      }
      function make_y_axis() {
         return d3.svg.axis().scale(y).orient("left").ticks(5);
      }

      // The grid
      svg.append("g")
         .attr('class', 'grid')
         .attr('transform', 'translate(' + 0 + ',' + (height - margin) + ')')
         .call(make_x_axis().tickSize(-height, 0, 0).tickFormat(''));
      svg.append("g")
         .attr('class', 'grid')
         .attr("transform", 'translate(' + margin + ',0)')
         .call(make_y_axis().tickSize(-width, 0, 0).tickFormat(''));

      // The axis
      svg.append("svg:g")
         .attr('class', 'axis x-axis')
         .attr('transform', 'translate(' + 0 + ',' + (height - margin) + ')')
         .call(make_x_axis());

      svg.append("svg:g")
         .attr('class', 'axis y-axis')
         .attr("transform", 'translate(' + margin + ',0)')
         .call(make_y_axis());

      // Add a group for each layer
      var groups = svg.selectAll("g.layer")
         .data(stacked)
         .enter()
         .append("g")
         .attr("class", "layer")
         .style("fill", function(d, i) { return colors(i); })
         .style("stroke", function(d, i) { return d3.rgb(colors(i)).darker(); });

      // Add a rect for each date.
      var rect = groups.selectAll("rect")
            .data(function(d) { return d})
            .enter().append("rect")
            .attr('title', function(d) {
               return d.category + ': ' + d.value;
            })
            .attr("x", function(d) { return x(d.x); })
            .attr("y", function(d) { return y(d.y0) + y(d.y) - height + margin; })
            .attr("height", function(d) { return height - margin - y(d.y); })
            .attr("width", (width - 0) / $scope.data.ages.length);
    }
});
