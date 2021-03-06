/*
* 3/25/2015
* Tom Evans
* This module encapsulates the data monkey functions needed to
* parse the overall data set to the user defined cross-section.
*/

'use strict';

var dependencies = [
  'tran-sci-cats',
  'vectorize',
  'node'
];

define(dependencies, function(ts, vectorize, node) {
  return function(rawData, properties) {
    var tempNodes = {},
      tempLinks = {},
      meshMap = {},
      data = {nodes:null,links:null,mesh:null};

    authorParse();
    // if (properties.Authors) {
    //   tempNodes = {};
    //   tempLinks = {};
    //   authorParse();
    //
    // }
    // // depracated but may be reactivated DNR!
    // if (properties.Departments) {
    //   tempNodes = {};
    //   tempLinks = {};
    //   authorParse();
    //   departmentParse();
    //
    // }

    data.links = d3.map(tempLinks).values();
    data.nodes = d3.map(tempNodes).values();

    data.nodes.forEach(function(d) {
      d.genCoordinates(properties.height / 2);
    });

    //getEigen(data); <--- needs to be reworked

    setOutInDegrees(data.links);
    data.mesh = d3.map(meshMap).values();

    return data;

    // HELPER FUNCTIONS

    function setOutInDegrees(links) { // refactor? <----
      if (links.length > 0) {
        links.forEach(function(link) {
          if (link.hasOwnProperty('mesh')) {
            link.source.inDegree = link.source.inDegree + 1 || 1;
            link.source.outDegree = link.source.outDegree + 1 || 1;
          } else {
            link.source.outDegree = link.source.outDegree + 1 || 1;
            link.target.inDegree = link.target.inDegree + 1 || 1;
          }
        });
      }
    };

    function meshParse(subMesh) { // extract? <----
      if (Array.isArray(subMesh)) {
        subMesh.forEach(function(mesh) {
          if (!meshMap[mesh]) {
            meshMap[mesh] = mesh;
          }
        });
      } else {
        if (subMesh && !meshMap[subMesh]) {
          meshMap[subMesh] = subMesh;
        }
      }

    };



    function authorParse() {
      // for each publication:
      // create nodes out of the authors
      // aggregate the nodes TS vals by this publications TS vals
      // every node should have a radius and fill attribute...
      var noMeshCount = 0;
      
      rawData.forEach(function(pub) {
        // for each prime author create node if DNE
        // add this pubs TS val to the prime authors
        var secAuthors = [];
        meshParse(pub.mesh);

        for (var pAuth in pub.primeAuthor) {
          if (pub.primeAuthor[pAuth].intersectionOf(properties.range)) {
            if (!tempNodes[pAuth]) {
              // DNE init
              tempNodes[pAuth] = new node(pub.primeAuthor[pAuth]);

            }

            tempNodes[pAuth].ts.plus(pub.ts);
            tempNodes[pAuth].pmids.push(pub.pmid);
            tempNodes[pAuth].pubCt += 1;
            tempNodes[pAuth].mesh = d3.merge([pub.mesh, tempNodes[pAuth].mesh]);

            // use to track pubs with no mesh nums for verification
            // if (pub.mesh.length == 0) {
            //   console.log(pub);
            //   noMeshCount += 1;
            // }


            // for each sec author create node if DNE
            // add this pubs TS val to the sec authors
            // create a link from prime auth to sec auth if DNE

            for (var sAuth in pub.secAuthor) {
              if (pub.secAuthor[sAuth].intersectionOf(properties.range)) {
                if (!tempNodes[sAuth]) {
                  // DNE init
                  tempNodes[sAuth] = new node(pub.secAuthor[sAuth]);
                }

                // add this pub data to the node
                tempNodes[sAuth].ts.plus(pub.ts);
                tempNodes[sAuth].pmids.push(pub.pmid);
                tempNodes[sAuth].pubCt += 1;
                tempNodes[sAuth].mesh = d3.merge([pub.mesh, tempNodes[sAuth].mesh]);

                // create a link from this auth to the prime auth (if DNE)
                var linkKey = sAuth+'-'+pAuth;
                if(!tempLinks[linkKey]) {
                  tempLinks[linkKey] = {
                      source:tempNodes[sAuth],
                      target:tempNodes[pAuth],
                      conn:[pub]
                    };
                } else {
                  tempLinks[linkKey].conn.push(pub);
                }

              } // if intersection
            }  // end sAuth for
          }
        } // end pAuth for

      }); // end pub foreach

    };

    // function departmentParse() { // depracated - remove <-----
    //   var departmentNodes = {}, departmentLinks = {};
    //
    //   // group the author nodes on department
    //   d3.map(tempNodes).values().forEach(function(author) {
    //     var name = getDeptName(author);
    //
    //     if (!departmentNodes[name]) {
    //
    //       departmentNodes[name] = {};
    //       departmentNodes[name].ts = new ts();
    //       departmentNodes[name].coors = {x:0,y:0};
    //       departmentNodes[name].data = {name:name};
    //       departmentNodes[name].outDegree = 0;
    //       departmentNodes[name].inDegree = 0;
    //       departmentNodes[name].intercom = 0;
    //       departmentNodes[name].pop = 0;
    //       departmentNodes[name].pubCt = 0;
    //       departmentNodes[name].active = true;
    //
    //     }
    //
    //     departmentNodes[name].ts.plus(author.ts);
    //     departmentNodes[name].pop++;
    //     departmentNodes[name].pubCt += author.pubCt;
    //
    //   });
    //
    //   // coalesce the authorship links into department links
    //
    //   d3.map(tempLinks).values().forEach(function(link) {
    //     var sDep = getDeptName(link.source), tDep = getDeptName(link.target);
    //
    //     if (sDep != tDep) {
    //       var linkName = sDep + '-' + tDep;
    //       if (!departmentLinks[linkName]) {
    //         departmentLinks[linkName] = {
    //           source:departmentNodes[sDep],
    //           target:departmentNodes[tDep],
    //           density:1
    //         };
    //       } else {
    //         departmentLinks[linkName].density += 1;
    //       }
    //     } else {
    //       departmentNodes[sDep].intercom += 1;
    //     }
    //   });
    //
    //
    //   tempLinks = departmentLinks;
    //   tempNodes = departmentNodes;
    //
    //   function getDeptName(author) { // extract to ___? <----
    //     var instID = properties.deptData.personel[author.data.pid].instID;
    //     var depID = properties.deptData.personel[author.data.pid].deptID;
    //
    //     if (instID == 14) {
    //       return properties.deptData.departments[depID];
    //     } else {
    //       return properties.deptData.institutions[instID];
    //     }
    //   }
    // }

    function getEigen(data) { // analyze algorithim and optimize <-----
      var eigen = [],
      count = 0,
      sum = 0,
      names = [],
      linksTo = [],
      vals = [];


      data.links.forEach(function(link) {
        if (names.indexOf(link.source.data.name) === -1) {
        	names.push(link.source.data.name);
        	linksTo.push([]);
        	vals.push(1);
        } else {
        	vals[names.indexOf(link.source.data.name)].value+=1;
        }
        if (names.indexOf(link.target.data.name) === -1) {
        	names.push(link.target.data.name);
        	linksTo.push([]);
        	vals.push(1);
        } else {
        	vals[names.indexOf(link.target.data.name)].value+=1;
        }
        linksTo[names.indexOf(link.source.data.name)].push(link.target.data.name);
        linksTo[names.indexOf(link.target.data.name)].push(link.source.data.name);
      });

      for (var i = 0; i < 5; i++) {
      var cent = initArray(vals.length);

      for (var j = 0; j < vals.length; j++) {

      	for (var k = 0; k < linksTo[j].length; k++) {
      		var index = names.indexOf(linksTo[j][k]);
      		cent[index] = cent[index] + vals[j];
      	}
      }

      vals = cent.slice();
      }

      vals.forEach(function(val) {
        sum += val;
      });
      vals.forEach(function(val, i) {
        var newVal = val / sum;
        eigen.push({name:names[i],value:newVal});
      });

      eigen.forEach(function(val) {
        tempNodes[val.name].eigen = val.value;
      });
    };

    function initArray(length) { // track and refactor out <-----
      var array = [length];
      for (var i = 0; i < length; i++) {
        array[i] = 0;
      }
      return array;
    };
  };
});
