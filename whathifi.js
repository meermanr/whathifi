// Javascript
"use strict";

/*
This follows Mike Bostock's reusable d3 chart pattern: 
http://bost.ocks.org/mike/chart/

Punch-card charts plot bubbles in a grid. The size of each bubble represents a 
value such as number of occurrences. The location of each bubble indicates the 
datum's two categories.

For instance, a punch-card chart of commits by hour and by day may resemble the 
following, which shows that most commits happen in the evening and at weekends:

Fri |      .   .   ,   o   O   ()  
Sat |  o       o   O   o   ()  O
Sun |  ,       o   O   o   .       
Mon |  o   .           .   ,   .
Tue |  .               .   ,   o
    |_____________________________
     09:00   12:00   21:00   00:00

To achieve this, 3 accessor functions are required:

  x(d,i) -> (float) Hours in the example above
  y(d,i) -> (float) Day-of-week in the example above
  d(d,i) -> (float) Size of each bubble

Sample usage:

    var dData = [
            [new Date('2014-04-18T06:00:00Z'), 0],
            [new Date('2014-04-18T12:00:00Z'), 2],
            [new Date('2014-04-18T18:00:00Z'), 7],
            [new Date('2014-04-19T00:00:00Z'), 3],
            [new Date('2014-04-19T06:00:00Z'), 0],
            [new Date('2014-04-19T12:00:00Z'), 0],
            [new Date('2014-04-19T18:00:00Z'), 3],
            [new Date('2014-04-20T00:00:00Z'), 13],
            [new Date('2014-04-20T06:00:00Z'), 3],
            [new Date('2014-04-20T12:00:00Z'), 0],
            [new Date('2014-04-20T18:00:00Z'), 0],
            ];

    var myChart = punchcard_chart()
                    .x(function(d,i){return d[0].getHours();})
                    .y(function(d,i){return d[0].getDay();})
                    .d(function(d,i){return d[1];})
                    ;

    window.d3Selection = d3.select('p#punchcard_chart')
        .datum(dData)       // NB: datum(), not data()
        .call(myChart)
        ;
*/
function punchcard_chart(){
    "use strict";

    // CONFIGURATION
    /////////////////////////////

    // Default configuration ('c' = 'configuration'). Values may be constants, 
    // or functions which accept (datum, index) as per d3 conventions. All 
    // parameters can be retrieved or set as in the example above.
    var c = {};
    c.width  = 600;
    c.height = 200;
    c.x      = function(d,i){return d.x;};
    c.y      = function(d,i){return d.y;};
    c.d      = function(d,i){return d.d;};

    // Passed to Array.filter() on the source data
    c.filter = function(d){return true;};

    // Passed as the second argument (`key`) to to d3.selection.data
    c.key    = function(d,i){return ''+c.x(d,i)+c.y(d,i)+c.d(d,i);};

    // CHART
    /////////////////////////////

    function my(d3OuterSelection){
        d3OuterSelection.each(function punchcard_chart_inner(d, i){
            // `d`: (Object) Input data
            // `i`: (int) Index within the outer selection
            // `this`: (DOMElement) Element to render chart within, e.g. svg

            var d3SVG = d3.select(this).select('svg.punchcard_chart');

            // Create if necessary
            if (d3SVG.empty()){
                d3SVG = d3.select(this).append('svg:svg')
                    .classed('punchcard_chart', true)
                    .attr('viewBox', '0 0 '+(c.width)+' '+(c.height+30))
                    ;
            }
            // Update
            d3SVG
                .attr('width', c.width)
                .attr('height', c.height)
                ;

            // Filter
            d = d.filter(c.filter);

            // Scales
            /////////////////////////////

            var scale_x = d3.scale.linear()
                .domain(d3.extent(d.map(c.x).sort(d3.descending)))
                .range([0, c.width])
                .nice()
                ;
            var scale_y = d3.scale.ordinal()
                .domain(d.map(c.y).sort(d3.descending))
                .rangeRoundBands([0, c.height], 0.5)
                ;
            var scale_d = d3.scale.sqrt()
                .domain(d3.extent(d.map(c.d).sort(d3.descending)))
                .range([1, scale_y.rangeBand()]) // Bandwidth of y-axis
                ;
            function extract_data_x_and_scale(d,i){return scale_x(c.x(d,i));}
            function extract_data_y_and_scale(d,i){return scale_y(c.y(d,i));}
            function extract_data_d_and_scale(d,i){return scale_d(c.d(d,i));}

            var x_axis = d3.svg.axis().scale(scale_x).orient('bottom').ticks(5);
            var d3XAxis = d3SVG.select('g.x_axis');
            if (d3XAxis.empty()){d3XAxis = d3SVG.append('g').classed('x_axis', true);}
            d3XAxis.attr('transform', 'translate(0, '+c.height+')').call(x_axis);

            var y_axis = d3.svg.axis().scale(scale_y).orient('left');
            var d3YAxis = d3SVG.select('g.y_axis');
            if (d3YAxis.empty()){d3YAxis = d3SVG.append('g').classed('y_axis', true);}
            d3YAxis.attr('transform', 'translate(0, 0)').call(y_axis);

            // DATA
            /////////////////////////////

            // Update
            var d3Selection = d3SVG.selectAll('g.bubble')
                .data(d, c.key)
                .classed('new', false)
                ;
            d3Selection.selectAll('circle')
                .attr('cx', extract_data_x_and_scale)
                .attr('cx', extract_data_x_and_scale)
                ;

            // Enter
            d3Selection.enter().append('g')
                .classed('new', true)
                .classed('bubble', true)
                .each(function enter_g_title(d,i){
                        var rTitle = 'Y:'+c.y(d,i)+' X:'+c.x(d,i)+' D:'+c.d(d,i);
                        d3.select(this).append('title').text(rTitle);
                    })
                .each(function enter_g_circle(d,i){
                        d3.select(this).append('circle')
                            .classed('bubble', true)
                            .attr('r', extract_data_d_and_scale)
                            .attr('cx', extract_data_x_and_scale)
                            .attr('cy', extract_data_y_and_scale)
                            ;
                    })
                ;

            // Exit
            d3Selection.exit()
                .remove()
                ;
        });
    }

    // Getters + Setters
    //
    // For every key in our configuration (`c`) we generate a function which 
    // either returns the current configuration value, or sets it to the 
    // user-provided value.

    for (var rAttr in c){
        var rCode = ''
            +'my.'+rAttr+' = function(mValue){'
            +'\n  if(!arguments.length){return c.'+rAttr+';}'
            +'\n  c.'+rAttr+' = mValue;'
            +'\n  return my;'
            +'\n}'
            +'\n';
        eval(rCode);
    }

    return my;
}
function init(sJSONData){
    "use strict";

    window.sJSONData = sJSONData;
    console.log(sJSONData);

    d3.select('#review_count').text(sJSONData.total_rows);

    var dData = [
            [new Date('2014-04-18T06:00:00Z'), 0],
            [new Date('2014-04-18T12:00:00Z'), 2],
            [new Date('2014-04-18T18:00:00Z'), 7],
            [new Date('2014-04-19T00:00:00Z'), 3],
            [new Date('2014-04-19T06:00:00Z'), 0],
            [new Date('2014-04-19T12:00:00Z'), 0],
            [new Date('2014-04-19T18:00:00Z'), 3],
            [new Date('2014-04-20T00:00:00Z'), 13],
            [new Date('2014-04-20T06:00:00Z'), 3],
            [new Date('2014-04-20T12:00:00Z'), 1],
            [new Date('2014-04-20T18:00:00Z'), 1]
            ];
    window.dData = dData;
    console.log(dData);
    var myChart = punchcard_chart()
                    .x(function extract_data_x(d,i){return d[0].getHours();})
                    .y(function extract_data_y(d,i){return d[0].getDay();})
                    .d(function extract_data_d(d,i){return d[1];})
                    ;

    window.myChart = myChart;
    window.d3Selection = d3.select('p#example')
        .datum(dData)       // NB: datum(), not data()
        .call(myChart)
        ;

    var myChart = punchcard_chart()
                    .width(1024)
                    .height(200)
                    .x(function extract_data_x(d,i){return Math.ceil(d.price/200)*200;})
                    .x(function extract_data_x(d,i){return d.price;})
                    .y(function extract_data_y(d,i){return d.rating;})
                    .d(function extract_data_d(d,i){return 1;})
                    .key(function(d,i){return d._id.$oid;})
                    .filter(function filter_d(d,i){return d.price < 7000;})
                    ;

    window.myChart = myChart;
    window.d3Selection = d3.select('p#punchcard_chart')
        .datum(sJSONData.rows)       // NB: datum(), not data()
        .call(myChart)
        ;

    // # var myChart = punchcard_chart();
    // # var d3Sel = d3.select('ul#review_names')
    // #     .datum(sJSONData.rows)
    // #     .call(myChart)
    // #     ;
    // # console.log(d3Sel)

    // d3.select('ul#review_names').selectAll('li')
    //     .data(sJSONData.rows, function(d){return d._id.$oid;})
    // .enter().append('li')
    //     .text(function(d){return d.name;})
    //     ;

    // window.setTimeout(function(){
    //     d3.select('ul#review_names').selectAll('li')
    //         .sort(function(a,b){return d3.ascending(a.name, b.name);})
    //         .order()
    //         ;
    //     },
    //     1000);
}
