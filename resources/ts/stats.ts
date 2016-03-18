/// <reference path="./basetypes.ts" />
/// <reference path="./gpd3.ts"/>
/// <reference path="./services.ts"/>
/// <reference path="./pedigree.service.ts"/>
/// <reference path="./contextmenu.ts"/>
/// <reference path="typings/angularjs/angular" />
/// <reference path="typings/angular-ui-router/angular-ui-router" />
/// <reference path="typings/d3/d3" />

module GP {
   app.
   config(function($stateProvider : angular.ui.IStateProvider) {
      $stateProvider.
      state('stats', {
         url: '/stats',
         templateUrl: 'geneaprove/stats.html',
         controller: 'statsCtrl',
         data: {
            pageTitle: '[Genaprove] Statistics'
         }
      });
   });

   interface StatsControllerScope extends angular.IScope {
      data : {
         ranges: [/* index */ number,
                  /* min year */ number,
                  /* max year */ number,
                  /* legend */ string][],
         ages:   [/* start point */ number,
                  /* males */ number,
                  /* females */ number,
                  /* unknown */ number][],
         total_ancestors : number,
         total_father    : number,
         total_mother    : number,
         decujus         : number,
         decujus_name    : string
      }
      colors : d3.scale.Ordinal<string, string>;
   }
   
   app.controller(
      'statsCtrl',
      ($scope       : StatsControllerScope,
       $http        : angular.IHttpService,
       $stateParams : angular.ui.IStateParamsService,
       $rootScope   : IGPRootScope,
       $window      : angular.IWindowService) =>
   {
      $http.get('/data/stats').then(function(resp) {
         $scope.data = <any>resp.data;
         $scope.colors = d3.scale.category20b();
         generations();
         lifespan();
      });
   
      function generations() {
         // Our data is a 2D array of the form:
         //   [ [ gen_number, min_date, max_date, legend], ...]
         const div = angular.element($window.document.getElementById('generations'));
         const width = div[0].clientWidth;
         const height = div[0].clientHeight;
         const margin = 30;
   
         const svg = d3.select(div[0]).append('svg');
   
         const x = d3.scale.linear()
            .domain([d3.min($scope.data.ranges, (d) => d[1]),
                     d3.max($scope.data.ranges, (d) => d[2])])
            .range([margin, width]);
         const y = d3.scale.linear()
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
            .attr('transform', 'translate(0,' + (height - margin) + ')')
            .call(make_x_axis().tickSize(-height, 0).tickFormat(''));
         svg.append("g")
            .attr('class', 'grid')
            .attr("transform", 'translate(' + margin + ',0)')
            .call(make_y_axis().tickSize(-width, 0).tickFormat(''));
   
         // The axis
         svg.append("svg:g")
            .attr('class', 'axis x-axis')
            .attr('transform', 'translate(0,' + (height - margin) + ')')
            .call(make_x_axis());
   
         svg.append("svg:g")
            .attr('class', 'axis y-axis')
            .attr("transform", 'translate(' + margin + ',0)')
            .call(make_y_axis());
   
         const rect = svg.selectAll("rect")
               .data($scope.data.ranges)
               .enter().append("rect")
               .attr({
                  fill   : (d) => $scope.colors(d[0].toString()),
                  title  : (d) => d[3],
                  x      : (d) => x(d[1]),
                  width  : (d) => x(d[2]) - x(d[1]),
                  y      : (d) => y(d[0] + 1),
                  height : height / $scope.data.ranges.length
               });
      }
   
      function lifespan() {
         const div = angular.element($window.document.getElementById('lifespan'));
   
         // Our ages data is a 2D array, of the form:
         //    [  [age1, males1, females1, unknown1],
         //       [age2, males2, females2, unknown2], ...]
         // layout.stack excepts input of the type:
         //    [  [{x:0, y:males1},   {x:1, y:males2}],
         //       [{x:0, y:females1}, {x:1, y:females2}], ... ]
   
         interface ILifeSpan extends d3.layout.stack.Value {
            x : number,   // the age
            y : number,   // count for this age/sex
            category: string,  // male or female or unknown
            value   : number,

            y0 ?: number  // from d3.layout.stack
         }

         const remapped : ILifeSpan[][] = ['males', 'females', 'unknown'].map(function(sex, sex_i) {
            return $scope.data.ages.map((forsex, column) => (
               <ILifeSpan>{
                  x: $scope.data.ages[column][0] /* the age */,
                  y: forsex[sex_i + 1]   /* count for this age/sex */,
                  category: sex,
                  value: forsex[sex_i + 1]}));
         });
   
         const stacked = <ILifeSpan[][]> d3.layout.stack()(remapped);
         const width = div[0].clientWidth;
         const height = div[0].clientHeight;
         const margin = 30;
         const x = d3.scale.ordinal<number, number>()
            .domain($scope.data.ages.map(d => d[0]))
            .rangePoints([margin, width]);
         const y = d3.scale.linear()
            .domain([0,
                     d3.max(remapped, (d) => d3.max(d, (d) => d.y0 + d.y))])
            .range([height - margin, 0]);
   
         const colors = d3.scale.category10<number>();
   
         // Create the svg and toplevel group
         const svg = d3.select(div[0]).append('svg');
   
         function make_x_axis() {
            return d3.svg.axis().scale(x).orient("bottom");
         }
         function make_y_axis() {
            return d3.svg.axis().scale(y).orient("left").ticks(5);
         }
   
         // The grid
         svg.append("g")
            .attr('class', 'grid')
            .attr('transform', 'translate(0,' + (height - margin) + ')')
            .call(make_x_axis().tickSize(-height, 0).tickFormat(''));
         svg.append("g")
            .attr('class', 'grid')
            .attr("transform", 'translate(' + margin + ',0)')
            .call(make_y_axis().tickSize(-width, 0).tickFormat(''));
   
         // The axis
         svg.append("svg:g")
            .attr('class', 'axis x-axis')
            .attr('transform', 'translate(0,' + (height - margin) + ')')
            .call(make_x_axis());
   
         svg.append("svg:g")
            .attr('class', 'axis y-axis')
            .attr("transform", 'translate(' + margin + ',0)')
            .call(make_y_axis());
   
         // Add a group for each layer
         const groups = svg.selectAll("g.layer")
            .data(stacked)
            .enter()
            .append("g")
            .attr("class", "layer")
            .style('fill', (d, i) => colors(i))
            .style('stroke', (d, i) => d3.rgb(colors(i)).darker().toString());
   
         // Add a rect for each date.
         groups
            .selectAll('rect')
            .data((d : ILifeSpan[]) => d)
            .enter()
            .append("rect")
            .attr({
               title:  (d : ILifeSpan) => d.category + ': ' + d.value,
               x:      (d : ILifeSpan) => x(d.x),
               y:      (d : ILifeSpan) => y(d.y0) + y(d.y) - height + margin,
               height: (d : ILifeSpan) => height - margin - y(d.y),
               width:  (width - 0) / $scope.data.ages.length
            });
       }
   });
}
