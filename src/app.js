'use strict';

var dependencies = [
  'queue',
  'd3',
  'ui-objects'
];

/**
* Entry point for application as AMD
*
* @module app
*/
require(dependencies, function(queue, d3, ui) {

  /**
  * init an instance of the UI module
  *
  */
  var app = new ui();

  /** load the dataset for first year */
  queue(1)
    .defer(loadPub, './dat/musc_csv/auth/pubAuthDat2006.csv')
    .defer(loadMesh, './dat/musc_csv/mesh/pubMeshDat2006alpha.csv')
    .awaitAll(initialize);

  /** Loads the author publication data */
  function loadPub(file, callback) {
    d3.csv(file, function(error, csv) {
      if(error) {
        console.log(error);
        callback(error, false);
      }

      if(app.properties.pubHash.loadPublications(csv)) {
        callback(null, true);
      }
    });
  };

  /** loads the mesh term data */
  function loadMesh(file, callback) {
    d3.csv(file, function(error, csv) {
      if(error) {
        console.log(error);
        callback(error, false);
      }
      if(app.properties.pubHash.loadMesh(csv)) {
        callback(null, true);
      }
    });
  };

  /** Once the dataset for the first year is loaded setup the initial ui state */
  function initialize() {
    app.init();
    app.fetchData();
    app.render();
    finishLoad();
  }

  /** lazy load the rest of the data while the initial ui state is coming up */
  function finishLoad() {
    queue(1)
      .defer(loadPub, './dat/musc_csv/auth/pubAuthDat2007.csv')
      .defer(loadPub, './dat/musc_csv/auth/pubAuthDat2008.csv')
      .defer(loadPub, './dat/musc_csv/auth/pubAuthDat2009.csv')
      .defer(loadPub, './dat/musc_csv/auth/pubAuthDat2010.csv')
      .defer(loadPub, './dat/musc_csv/auth/pubAuthDat2011.csv')
      .defer(loadPub, './dat/musc_csv/auth/pubAuthDat2012.csv')
      .defer(loadPub, './dat/musc_csv/auth/pubAuthDat2013.csv')
      .awaitAll(reportOnRequest);

    queue(1)
      .defer(loadMesh, './dat/musc_csv/mesh/pubMeshDat2007alpha.csv')
      .defer(loadMesh, './dat/musc_csv/mesh/pubMeshDat2008alpha.csv')
      .defer(loadMesh, './dat/musc_csv/mesh/pubMeshDat2009alpha.csv')
      .defer(loadMesh, './dat/musc_csv/mesh/pubMeshDat2010alpha.csv')
      .defer(loadMesh, './dat/musc_csv/mesh/pubMeshDat2011alpha.csv')
      .defer(loadMesh, './dat/musc_csv/mesh/pubMeshDat2012alpha.csv')
      .defer(loadMesh, './dat/musc_csv/mesh/pubMeshDat2013alpha.csv')
      .awaitAll(reportFinal);

    /** logging for completion of lazy loading the authors */
    function reportOnRequest() {
      console.log('Queue has loaded all author files...');
    };

    /** logging for completion of lazy loading the mesh data */
    function reportFinal() {
      console.log('Queue has loaded all mesh files, file loading complete...');
      //app.calcTrendData(app.showTrends);
      app.renderHeatMap();
    }
  }

});
