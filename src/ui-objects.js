/*
* 3/25/2015
* Tom Evans
* encapsulates all user interface objects in one container attached to
* the properties object.  the init method will link the DOM to the
* container fields and setup UI behaviors.
*/

'use strict';

var dependencies = [
  'jquery',
  'd3',
  'select2',
  'properties',
  'data-parsing',
  'graph-generator',
  'spinner',
  'dropdownCheckbox',
  'slider',
  'heat-map-dynamic',
  'heat-map'
];

define(dependencies, function($, d3, select2, properties, parseData, GraphGenerator, Spinner, dropdownCheckbox, Slider, dynamicHeatmap, heatmap) {
  var spinnerOpts = {
    lines: 13, // The number of lines to draw
    length: 20, // The length of each line
    width: 10, // The line thickness
    radius: 30, // The radius of the inner circle
    corners: 1, // Corner roundness (0..1)
    rotate: 0, // The rotation offset
    direction: 1, // 1: clockwise, -1: counterclockwise
    color: '#000', // #rgb or #rrggbb or array of colors
    speed: 1, // Rounds per second
    trail: 60, // Afterglow percentage
    shadow: false, // Whether to render a shadow
    hwaccel: false, // Whether to use hardware acceleration
    className: 'spinner', // The CSS class to assign to the spinner
    zIndex: 2e9, // The z-index (defaults to 2000000000)
    top: '50%', // Top position relative to parent
    left: '50%' // Left position relative to parent
  },
  meshD = {
    data: [],
    title: 'Mesh Terms',
    btnClass: 'btn btn-info',
    hideHeader: false,
    showNbSelected: true,
    autosearch: true
  },
  nodeD = {
    data: [],
    title: 'Nodes',
    btnClass: 'btn btn-info',
    hideHeader: false,
    showNbSelected: true,
    autosearch: true
  },
  span = '<span class="caret"></span>';

  function fetchData() {
    var data = parseData(properties.pubHash.getData({range:properties.range,mesh:[]}), properties);
    properties.data = data;
    console.log(data);
    // updateFilter('nodeSelect', data.nodes);
    // updateFilter('meshSelect', data.mesh);
  };

  function render() {
    var data = properties.data;

    if (!properties.graph) {
      properties.graph = new GraphGenerator(data, properties);
    } else {
      properties.graph.updateData(data);
    }

    properties.graph.propogateUpdate();
  };

  // function updatePerspective() {
  //   var current = d3.select('#btnNodePerspective').text().trim()
  //   var next = d3.select(this).text().trim();
  //   d3.select(this).text(current);
  //   d3.select('#btnNodePerspective').html(next+span);
  //   properties.mesh = [];
  //   properties.ui.meshTermFilter.dropdownCheckbox('reset', []);
  //   properties.nodeFilter = [];
  //   properties.ui.nodeFilter.dropdownCheckbox('reset', []);
  //   properties.previous = [];
  //   properties[current] = false;
  //   properties[next] = true;
  //   render();
  // };

  function updateNodeSize() {
    var current = d3.select('#btnNodeSize').text().trim();
    var next = d3.select(this).text().trim();
    properties.nodeSize = next;
    d3.select(this).text(current);
    d3.select('#btnNodeSize').html(next+span);
    properties.graph.propogateUpdate();
  };

  function updateNodeColor() {
    var current = d3.select('#btnNodeColor').text().trim();
    var next = d3.select(this).text().trim();
    properties.nodeColor = next;
    d3.select(this).text(current);
    d3.select('#btnNodeColor').html(next+span);
    properties.graph.propogateUpdate();
  };

  function updateEdgeColor() {
    var current = d3.select('#btnEdgeColor').text().trim();
    var next = d3.select(this).text().trim();
    properties.edgeColor = next;
    d3.select(this).text(current);
    d3.select('#btnEdgeColor').html(next+span);
    properties.graph.propogateUpdate();
  }

  function transition() {
    if (properties.range.lo != 2013) {
      properties.range.lo = properties.range.hi += 1;
    } else {
      properties.range.lo = 2006;
      properties.range.hi = 2006;
    }
    properties.dhm.year = properties.range.lo;
    properties.dhm.propogateUpdate();
    properties.ui.dateSlider.setValue([properties.range.lo,properties.range.hi]);
    properties.ui.fetchData();
    // properties.ui.render();  // super choppy and the node coors arent updating <----
  };

  function applyFilters() {
    properties.filter.mesh = properties.ui.meshSelect.select2('data');
    properties.filter.node = properties.ui.nodeSelect.select2('data');
    render();
  };

  function renderHeatMap() {
    var pids = [],
      cohort = {'2006':[]},
      densities = {},
      dat = [],
      raw = parseData(properties.pubHash.getData({range:{lo:2006,hi:2006},
        mesh:properties.mesh}), properties).nodes;

    var lines = [
        function(x) { return -1.52*x-225; },
        function(x) { return -1.52*x-150; },
        function(x) { return -1.52*x-75; },
        function(x) { return -1.52*x+0; },
        function(x) { return -1.52*x+75; },
        function(x) { return -1.52*x+150; },
        function(x) { return -1.52*x+300; }
    ];

    var that = this;
    raw.forEach(function(node) {

      if (node.data.isEveryYear()) {
        if (that.properties.cohort.min == 0 &&
          lines[that.properties.cohort.max](node.coors.x) > node.coors.y) {

          pids.push(node.data.pid);
          cohort['2006'].push(node);
        } else {
          if (lines[that.properties.cohort.max](node.coors.x) > node.coors.y &&
            lines[that.properties.cohort.min-1](node.coors.x) < node.coors.y) {

            pids.push(node.data.pid);
            cohort['2006'].push(node);
          }
        }
      } else {
        // console.log('author not in every year');
      }

    });

    for (var i=2007; i<2014; i++) {
      raw = parseData(properties.pubHash.getData({range:{lo:i,hi:i},mesh:properties.mesh}), properties).nodes;
      cohort[i] = [];
      raw.forEach(function(node) {
        if (pids.indexOf(node.data.pid) != -1) {
          cohort[i].push(node);
        }
      });
    }

    for (var year in cohort) {
      if (cohort.hasOwnProperty(year)) {
        densities[year] = [0,0,0,0,0,0,0];
        cohort[year].forEach(function(d) {
          densities[year][calcZone(d.coors)] += 1;
        });
        var z = 0;
        densities[year].forEach(function(d) {
          dat.push({x:z,y:year,d:d})
          z++;
        });
      }
    }

    if (!this.properties.shm) {
      this.properties.shm = new heatmap(this.properties);
    }

    if (!this.properties.dhm) {
      this.properties.dhm = new dynamicHeatmap(this.properties);
    }

    this.properties.dhm.updateData(dat.slice(0,dat.length-1));
    this.properties.shm.updateData(dat);


    function calcZone(coors) {

      for (var i=0; i<lines.length-1; i++) {
        if (lines[i](coors.x) > coors.y) {
          return i;
        }
      }
      return lines.length-1;
    };
  };


  function updateFilter(filter, items) {
    var list = [],
      count = 0;

    items.forEach(function(item) {
      var label = (item.hasOwnProperty('data')) ? item.data.name : item;
      list.push({id:count, text:label, isChecked:false});
      count+=1;
    });

    list = list.sort(function(x, y) {
      var a = x.text.split(' '), b = y.text.split(' ');

      if (filter == 'nodeSelect') {
        a = a[a.length-1];
        b = b[b.length-1];
      } else {
        a = a[0];
        b = b[0];
      }

      if(a < b) return -1;
      if(a > b) return 1;
      return 0;
    });

    properties.ui[filter].select2({
      data: list
    });
  };

  return function() {
    this.properties = properties;
    this.spinner = null;
    this.meshTermFilter = null;
    this.nodeFilter = null;
    this.dateSlider = null;



    this.init = function() {
      properties.ui = this;
      this.spinner = new Spinner(spinnerOpts);

      this.meshSelect = $('#meshTermFilter');
      this.meshSelect.select2({
          multiple:true,
          data:[]
        });

      this.nodeSelect = $('#nodeFilter');
      this.nodeSelect.select2({
          multiple:true,
          data:[]
        });

      this.dateSlider = new Slider('#date-slider', {});
      this.dateSlider.setValue([2006,2006], true);
      this.dateSlider.on('slideStop', function(d) {
        properties.range.lo = d.value[0];
        properties.range.hi = d.value[1];
        fetchData();
        applyFilters();
        render();
        // update mesh here only?
      });
      this.cohortSlider = new Slider('#cohort-slider', {});
      this.cohortSlider.setValue([0,1], true);
      this.cohortSlider.on('slideStop', function(d) {
        properties.cohort.min = d.value[0];
        properties.cohort.max = d.value[1];
        properties.ui.renderHeatMap();
      });

      properties.svg = d3.select('.chart').append('svg')
        .attr('width', properties.width)
        .attr('height', properties.height);

      // attach behavior to UI

      // FILTER UPDATE
      d3.select('#btnApplyFilters').on('click', applyFilters);
      // PERSPECTIVE DD
      // d3.select('#nodePerspListOne').on('click', updatePerspective);
      // NODE SIZE DD
      d3.select('#nodeSizeListOne').on('click', updateNodeSize);
      d3.select('#nodeSizeListTwo').on('click', updateNodeSize);
      d3.select('#nodeSizeListThree').on('click', updateNodeSize);
      d3.select('#nodeSizeListFour').on('click', updateNodeSize);
      d3.select('#nodeSizeListFive').on('click', updateNodeSize);
      d3.select('#nodeSizeListSix').on('click', updateNodeSize);
      d3.select('#nodeSizeListSeven').on('click', updateNodeSize);

      // NODE COLOR DD
      d3.select('#nodeColorListOne').on('click', updateNodeColor);
      d3.select('#nodeColorListTwo').on('click', updateNodeColor);
      d3.select('#nodeColorListThree').on('click', updateNodeColor);
      d3.select('#nodeColorListFour').on('click', updateNodeColor);
      d3.select('#nodeColorListFive').on('click', updateNodeColor);
      d3.select('#nodeColorListSix').on('click', updateNodeColor);
      d3.select('#nodeColorListSeven').on('click', updateNodeColor);

      // EDGE COLOR DD
      d3.select('#edgeColorListOne').on('click', updateEdgeColor);
      d3.select('#edgeColorListTwo').on('click', updateEdgeColor);
      d3.select('#edgeColorListThree').on('click', updateEdgeColor);
      d3.select('#edgeColorListFour').on('click', updateEdgeColor);
      d3.select('#edgeColorListFive').on('click', updateEdgeColor);

      // TOGGLES
      // node filter (author | dept)
      d3.select('#tglNodeFilter').on('click', function() {
        var tog = d3.select(this);

        if (tog.text() == 'Department Filter') {
          tog.text('Author Filter');
        } else {
          tog.text('Department Filter');
        }

        properties.filter.Department = !properties.filter.Department;
        properties.graph.propogateUpdate();
      });

      // edges
      d3.select('#tglEdge').on('click', function() {
        var tog = d3.select(this);
        if (tog.text() == 'On') {
          tog.attr('class', 'btn btn-default').text('Off');
          properties.showEdges = false;
          d3.selectAll('.link.active.nodesActive')
            .attr('class', 'link inactive nodesActive');
        } else {
          tog.attr('class', 'btn btn-info').text('On');
          properties.showEdges = true;
          d3.selectAll('.link.inactive.nodesActive')
            .attr('class','link active nodesActive');
        }

      });

      // transition
      d3.select('#tglTransition').on('click', function() {
        var tog = d3.select(this);

        if (tog.text() == 'On') {
          tog.attr('class', 'btn btn-default').text('Off');
          clearInterval(properties.interval);
          properties.interval = null;
        } else {
          tog.attr('class', 'btn btn-info').text('On');
          properties.interval = setInterval(transition, 2500);
        }
      });

      // node trails
      d3.select('#tglTrails').on('click', function() {
        var tog = d3.select(this);
        if (tog.text() == 'On') {
          tog.attr('class', 'btn btn-default').text('Off');
          properties.Trails = false;
          d3.selectAll('.trails.active').attr('class', 'trails inactive');
        } else {
          tog.attr('class', 'btn btn-info').text('On');
          properties.Trails = true;
          d3.selectAll('.trails.inactive').attr('class', 'trails active');
        }
      });
    }; // end init()

    this.render = render;
    // this.updatePerspective = updatePerspective;
    this.transition = transition;
    this.updateFilter = updateFilter;
    this.renderHeatMap = renderHeatMap;
    this.fetchData = fetchData;
  }
});
