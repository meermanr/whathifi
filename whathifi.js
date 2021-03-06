// Javascript
"use strict";

var d3locale = d3.locale({
      "decimal": ".",
      "thousands": ",",
      "grouping": [3],
      "currency": ["£", ""],
      "dateTime": "%a %b %e %X %Y",
      "date": "%Y-%m-%d",
      "time": "%H:%M:%S",
      "periods": ["AM", "PM"],
      "days": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", 
                "Friday", "Saturday"],
      "shortDays": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      "months": ["January", "February", "March", "April", "May", "June", 
                "July", "August", "September", "October", "November", 
                "December"],
      "shortMonths": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", 
                    "Sep", "Oct", "Nov", "Dec"]
    });

// Utilities
    function distinct(d,i,l){
        // Intended to be used with Array.filter to remove duplicates.
        // >>> [1,2,3,4,1,2].filter(distinct)
        // [1, 2, 3, 4]
        return l.indexOf(d) == i;
    }
    function isNumber(x){
        return !isNaN(+x);
    }
    function isBoolean(x){
        switch(+x){
            case 0:  return true; break;
            case 1:  return true; break;
            default: return false;
        }
    }
    function convert_to_number(x){
        switch(x){
            case "":        x=0; break;
            case "false":   x=0; break;
            case false:     x=0; break;
            case "n/a":     x=0; break;
            case "No":      x=0; break;
            case "NaN":     x=0; break;
            case NaN:       x=0; break;

            case "true":    x=1; break;
            case true:      x=1; break;
            case "Yes":     x=1; break;
        }
        if( !isNaN(+x) ){return parseFloat(x);}
        else { return x; }
    }

function punchcard_chart(){
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

        var lData = [
                [new Date('2014-04-17T06:00:00Z'), 0],
                [new Date('2014-04-17T12:00:00Z'), 2],
                [new Date('2014-04-17T18:00:00Z'), 7],
                [new Date('2014-04-18T00:00:00Z'), 3],
                [new Date('2014-04-18T06:00:00Z'), 0],
                [new Date('2014-04-18T12:00:00Z'), 0],
                [new Date('2014-04-18T18:00:00Z'), 3],
                [new Date('2014-04-19T00:00:00Z'), 13],
                [new Date('2014-04-19T06:00:00Z'), 3],
                [new Date('2014-04-19T12:00:00Z'), 1],
                [new Date('2014-04-19T18:00:00Z'), 1]
                ];

        var myChart = punchcard_chart()
                        .x(function extract_data_x(d,i){return d[0].getHours();})
                        .y(function extract_data_y(d,i){return d[0].getDay();})
                        .d(function extract_data_d(d,i){return d[1];})
                        .y_tick_format(function(d){return [
                            "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun" ][d];})
                        .x_tick_format(function(d){return d+'h00';})
                        ;

        window.d3Selection = d3.select('p#punchcard_chart')
            .datum(lData)       // NB: datum(), not data()
            .call(myChart)
            ;
    */

    // CONFIGURATION
    /////////////////////////////

    // Default configuration ('c' = 'configuration'). Values may be constants, 
    // or functions which accept (datum, index) as per d3 conventions. All 
    // parameters can be retrieved or set as in the example above.
    var c = {};
    c.width  = 600;
    c.height = 200;
    c.left_margin  = 50;
    c.bottom_margin  = 40;
    c.x      = function(d,i){return d.x;};
    c.y      = function(d,i){return d.y;};
    c.d      = function(d,i){return d.d;};
    c.x_tick_format = function(v){return v.toString();}     // v = c.x(d)
    c.y_tick_format = function(v){return v.toString();}
    c.d_tick_format = function(v,d){return v.toString();}
    c.x_label = '';
    c.y_label = '';
    c.click = function(d,i){console.log(this,d,i);};

    // Passed as the second argument (`key`) to to d3.selection.data
    c.key    = function(d,i){return ''+c.x(d,i)+','+c.y(d,i);};

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
                    ;
            }
            // Update
            var d3Transition = d3SVG.transition()
                .duration(750)
                .ease('bounce')
                .attr('viewBox',  ' -'+c.left_margin
                                 +' '+0
                                 +' '+(c.width+c.left_margin)
                                 +' '+(c.height+c.bottom_margin))
                .attr('width', c.width)
                .attr('height', c.height)
                ;

            var extract_data_x_and_scale;
            var extract_data_y_and_scale;
            var extract_data_d_and_scale;
            (function(){
                // Scales
                /////////////////////////////

                /* Since bubbles are centred on grid positions, the grid must 
                 * 'float' within the canvas with at least half a grid division of 
                 * margin on all sides.
                 *
                 * Bubbles should not overlap, so the maximum bubble radius is half 
                 * a grid length (imagine two adjacent max-sized bubbles).
                 */

                function returnInt(d){return parseInt(d,10);}
                function min_gap(lData){
                    return d3.min(d3.pairs(lData).map(function(d){return Math.abs(d[1]-d[0]);}));
                }

                var lXDomainValues = d.map(c.x).map(convert_to_number).filter(distinct).sort();
                var rx = c.width / (lXDomainValues.length) / 2;
                if (d.map(c.x).every(isNumber)){
                    // Numeric scale
                    var scale_x = d3.scale.linear()
                        .domain(d3.extent(d, c.x))
                        .range([rx, c.width-rx])
                        ;
                    var iXDomainSpacing = min_gap(lXDomainValues) || 0;
                    var iXRangeSpacing = Math.abs((scale_x(iXDomainSpacing) - scale_x(0)))
                        || c.height;
                }else{
                    // Ordinal scale
                    var scale_x = d3.scale.ordinal()
                        .domain(lXDomainValues)
                        .rangePoints([rx, c.width-rx])
                        ;
                    var iXRangeSpacing = min_gap(scale_x.range()) || c.height;
                }

                var lYDomainValues = d.map(c.y).map(convert_to_number).filter(distinct).sort();
                var ry = c.height / (lYDomainValues.length) / 2;
                if (d.map(c.y).every(isNumber)){
                    // Numeric scale
                    var scale_y = d3.scale.linear()
                        .domain(d3.extent(d, c.y))
                        .range([c.height-ry, ry])   // SVG y-axis goes top-to-bottom
                        ;
                    var iYDomainSpacing = min_gap(lYDomainValues) || 0;
                    var iYRangeSpacing = Math.abs((scale_y(iYDomainSpacing) - scale_y(0)))
                        || c.height;
                }else{
                    // Ordinal scale
                    var scale_y = d3.scale.ordinal()
                        .domain(lYDomainValues)
                        .rangePoints([c.height-ry, ry])   // SVG y-axis goes top-to-bottom
                        ;
                    var iYRangeSpacing = min_gap(scale_y.range()) || c.height;
                }

                var iMaxRadius = Math.min(iXRangeSpacing, iYRangeSpacing)/2;
                var scale_d = d3.scale.sqrt()
                    .domain([0, d3.max(d, c.d)])
                    .range([0, iMaxRadius])
                    ;

                extract_data_x_and_scale = function extract_data_x_and_scale(d,i){return scale_x(c.x(d,i));}
                extract_data_y_and_scale = function extract_data_y_and_scale(d,i){return scale_y(c.y(d,i));}
                extract_data_d_and_scale = function extract_data_d_and_scale(d,i){return scale_d(c.d(d,i));}

                var x_axis = d3.svg.axis()
                    .scale(scale_x)
                    .tickValues(lXDomainValues)
                    .tickSize(-c.height, 6)
                    .tickPadding(10)
                    .tickFormat(c.x_tick_format)
                    .orient('bottom')
                    ;
                var d3XAxis = d3SVG.select('g.x_axis');
                if (d3XAxis.empty()){d3XAxis = d3SVG.append('g').classed('x_axis', true);}
                d3Transition.each(function(){
                        d3XAxis.attr('transform', 'translate(0, '+c.height+')').call(x_axis);
                    });

                var d3XAxisLabel = d3XAxis.select('text.label');
                if (d3XAxisLabel.empty()){d3XAxisLabel = d3XAxis.append('text').classed('label', true);}
                d3Transition.each(function(){
                        d3XAxisLabel.text(c.x_label).attr('transform', 'translate('+c.width/2+',40)');
                    });

                var y_axis = d3.svg.axis()
                    .scale(scale_y)
                    .tickValues(lYDomainValues)
                    .tickSize(-c.width, 6)
                    .tickPadding(10)
                    .tickFormat(c.y_tick_format)
                    .orient('left')
                    ;
                var d3YAxis = d3SVG.select('g.y_axis');
                if (d3YAxis.empty()){d3YAxis = d3SVG.append('g').classed('y_axis', true);}
                d3Transition.each(function(){
                        d3YAxis.attr('transform', 'translate(0, 0)').call(y_axis);
                    });

                var d3YAxisLabel = d3YAxis.select('text.label');
                if (d3YAxisLabel.empty()){d3YAxisLabel = d3YAxis.append('text').classed('label', true);}
                d3Transition.each(function(){
                        d3YAxisLabel.text(c.y_label)
                            .attr('transform', 'translate(-'+c.left_margin+','+c.height/2+') rotate(-90)');
                    });

            })();

            // DATA
            /////////////////////////////

            d3Transition.each(function(){
                // Init
                var d3Selection = d3SVG.selectAll('g.bubble')
                    .data(d, c.key)
                    .classed('new', false)
                    ;

                // Enter
                d3Selection.enter().append('g')
                    .classed('new', true)
                    .classed('bubble', true)
                    .each(function(){
                        d3.select(this).append('title');
                        d3.select(this).append('circle')
                            .attr('cx', extract_data_x_and_scale)
                            .attr('cy', extract_data_y_and_scale)
                            .attr('r', 0)
                            ;
                        })
                    ;

                // Update (resize chart)
                d3Selection.select('circle')
                    .datum(function(d){return d;})
                .transition()
                    .attr('r', extract_data_d_and_scale)
                    .attr('cx', extract_data_x_and_scale)
                    .attr('cy', extract_data_y_and_scale)
                    ;

                // Update (metadata)
                d3Selection
                    .each(function(d,i){
                            var rTitle = c.d_tick_format(c.d(d), d);
                            d3.select(this)
                                .on('click', c.click)
                            .select('title')
                                .text(rTitle)
                                ;
                        })


                // Exit
                d3Selection.exit().transition()
                    .style('opacity', 0)
                    .remove()
                    ;
            });
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

function whizzy_table(){
    /* Create a table using SVG shapes such that additions / removals can be 
     * nicely animated.
     *
     * Resulting document structure:
     *
     *   g.tr
     *      g.th
     *        text
     *      g.th
     *        text
     *      ...
     *   g.tr
     *     g.td
     *        circle    // e.g. color swatch
     *     g.td
     *        text      // e.g. number
     *     ...
     */

    // Configuration
    var c = {};
    c.width = 1200;
    c.margin_top = 100;
    c.row_title_width = 160;
    c.item_height = 14;
    c.key = function(d,i){return d.key;};           // Row heading
    c.sort = function(a,b){return d3.ascending(c.key(a), c.key(b));};
    c.headings = function(d,i){return d.headings;}; // Table headings
    c.values = function(d,i){return d.values;};     // Row data
    c.dScaleByHeading;
    c.dDataByHeading;
    c.dRendererByHeading;
    c.yInitialised = false;     // Set to true when chart is first rendered

    // Chart functionality
    function my(d3OuterSelection){
        d3OuterSelection.each(function whizzy_table_inner(d, i){
            // `d`: (Object) Input data
            // `i`: (int) Index within the outer selection
            // `this`: (DOMElement) Element to render chart within, e.g. svg

            // Prepare data
            if (!c.yInitialised){
                c.dDataByHeading = {};   // rHeading -> d3.set() of seen values (CONVERTED TO STRING!)
                for (var i=0; i<d.length; i++){
                    var dItem = d[i];
                    var lDataHeadings = c.headings(dItem,i);
                    var lDataValues = c.values(dItem,i);
                    for (var j=0; j<lDataHeadings.length; j++)
                    {
                        var rHeading = lDataHeadings[j];
                        var mValue = lDataValues[j];
                        if (c.dDataByHeading[rHeading] === undefined){c.dDataByHeading[rHeading] = d3.set();}
                        c.dDataByHeading[rHeading].add(mValue);
                    }
                }
            }

            function boolean(d,i){
                // `this`: (DOMElement) Element to render chart within, e.g.  svg
                // `d`: (Array) 0: rHeading, 1: mValue
                // `i`: (int) Index within the outer selection
                var iValue = d[1];
                if(iValue==1){
                    d3.select(this).append('circle')
                        .classed('boolean', true)
                        .attr('cy', -c.item_height/2)
                        .attr('r', c.item_height/3)
                        .append('title')
                            .text(d[0])
                        ;
                }
            }
            function numeric(d,i){
                // `this`: (DOMElement) Element to render chart within, e.g.  svg
                // `d`: (Array) 0: rHeading, 1: mValue
                // `i`: (int) Index within the outer selection
                var iValue = d[1];
                d3.select(this).append('rect')
                    .attr('x', -sScaleX.rangeBand()/2)
                    .attr('y', -c.item_height)
                    .attr('width', sScaleX.rangeBand())
                    .attr('height', c.item_height)
                    .style('fill', c.dScaleByHeading[d[0]](iValue))
                    .append('title')
                        .text(iValue+' ('+d[0]+')')
                    ;
            }
            function string(d,i){
                // `this`: (DOMElement) Element to render chart within, e.g.  svg
                // `d`: (Array) 0: rHeading, 1: mValue
                // `i`: (int) Index within the outer selection
                var mValue = d[1];
                if (mValue == 0){ return; }
                var rChar = c.dScaleByHeading[d[0]](mValue);
                d3.select(this).append('text')
                    .text(rChar)
                    .append('title')
                        .text(mValue+' ('+d[0]+')')
                    ;
            }


            if (!c.yInitialised){
                c.dScaleByHeading = {};    // rHeading -> d3.scale.linear() which outputs color
                c.dRendererByHeading = {};    // rHeading -> fncChart
                // Categorise each heading
                for (var k in c.dDataByHeading){
                    var lData = c.dDataByHeading[k].values().map(convert_to_number);

                    if (lData.every(isNumber)){
                        if (lData.every(isBoolean)){
                            c.dRendererByHeading[k] = boolean;
                        } else {
                            lData = lData.sort(d3.ascending);
                            c.dRendererByHeading[k] = numeric;
                            c.dScaleByHeading[k] = d3.scale.linear()
                                .domain([d3.quantile(lData, 0.0),
                                         d3.quantile(lData, 0.5),
                                         d3.quantile(lData, 1.0)
                                         ])
                                .range(['#c00', '#cc0', '#0c0'])
                                ;
                        }
                    }else{
                        c.dRendererByHeading[k] = string;
                        // Ignore explict 'no'/0/false
                        var lDomain = lData;
                        if (lData[0] == 0){lDomain = lData.slice(1, lData.length);}
                        c.dScaleByHeading[k] = d3.scale.ordinal()
                            .domain(lDomain)
                            .range(d3.range(65, 65+lData.length).map(String.fromCharCode))
                            ;
                    }
                }
            }

            var iComputedHeight = c.item_height * d.length;

            // Transitions
            var d3TransitionExit = d3.transition()
                .delay(1000)
                .duration(250)
                .ease('linear')
                ;
            var d3TransitionUpdate = d3TransitionExit.transition()
                .duration(c.yInitialised ? 500 :0)
                .ease('exp-out')
                ;
            var d3TransitionEnter = d3TransitionUpdate.transition()
                .duration(250)
                .ease('linear')
                ;


            var d3SVG = d3.select(this).select('svg.whizzy_table');

            // Create if necessary
            if (d3SVG.empty()){
                d3SVG = d3.select(this).append('svg:svg')
                    .classed('whizzy_table', true)
                    .attr('width', c.width)
                    .attr('height', c.margin_top + iComputedHeight)
                    ;
                d3SVG.append('g')
                    .attr('transform', 'translate(0, '+c.margin_top+')')
                    .classed('content', true)
                .append('g')
                    .classed('heading', true)
                    ;
            }

            // Update existing
            var iNewHeight = c.margin_top + iComputedHeight;
            d3TransitionUpdate.each(function(){
                d3SVG.transition().style('height', c.margin_top + iComputedHeight); });

            d3TransitionUpdate.each(function(){
                d3SVG.transition() .style('width', c.width) ; });

            d3SVG = d3.select(this).select('g.content');      // Shift focus to translated group

            var sScaleX = d3.scale.ordinal()    // NB: Does *NOT* handle row titles (left edge headings)
                .domain(d3.keys(c.dDataByHeading).sort())
                .rangeBands([c.row_title_width, c.width])
                ;


            // HEADINGS
            var d3Headings = d3SVG.select('g.heading').selectAll('g.th')
                .data(d3.keys(c.dDataByHeading).sort())
                ;
            d3Headings.exit().remove();
            d3Headings.enter().append('g')
                .classed('th', true)
                .attr('transform', function(d,i){return 'translate('+sScaleX(d,i)+',0)';})
                .each(function(d,i){
                        d3.select(this).append('text')
                            .attr('transform', 'translate('+sScaleX.rangeBand()/2+',0) rotate(-45)')
                            .text(function(d){return d;})
                            ;
                    })
                    ;
            d3Headings.append('g')
                .attr('transform', function(d,i){return 'translate('+sScaleX(d,i)+',0)';})
                .each(function(d,i){
                        d3.select(this).selectAll('rect')
                            .attr('width', sScaleX.rangeBand())
                            .attr('height', iComputedHeight)
                            ;
                        d3.select(this).selectAll('text')
                            .attr('transform', 'translate('+sScaleX.rangeBand()/2+',0) rotate(-45)')
                            ;
                    })
                    ;

            var sScaleY = d3.scale.linear()
                .domain([0, d.length-1])
                .range([c.item_height, iComputedHeight])
                ;


            // DATA
            d = d.sort(c.sort);
            var d3Rows = d3SVG.selectAll('g.tr')
                .data(d, c.key)
                ;

            d3TransitionExit.each(function(){
                    d3Rows.exit().transition().style('opacity', 0).remove();
                });
            d3TransitionUpdate.each(function(){
                    d3Rows.transition().attr('transform', function(d,i){return 'translate(0,'+sScaleY(i)+')';});
                });
            d3Rows.enter().append('g')
                .style('opacity', 0)
                .classed('tr', true)
                .attr('transform', function(d,i){return 'translate(0,'+sScaleY(i)+')';})
                .each(function(d,i){
                        // Background
                        d3.select(this).append('rect')
                            .classed('tr', true)
                            .attr('x', 0)
                            .attr('y', -c.item_height)
                            .attr('width', c.width)
                            .attr('height', c.item_height)
                            ;

                        // Row title (left edge)
                        d3.select(this).append('text').text(c.key)
                            .style('cursor', 'pointer')
                            .on('click', function(d,i){window.open(d.URL);})
                            ;

                        // Data
                        var lHeadings = c.headings(d);
                        var lValues = c.values(d);
                        var lData = d3.zip(lHeadings, lValues);
                        var d3Row = d3.select(this).selectAll('text.data')
                            .data(lData, function(d,i){return d[0];})
                            ;

                        d3Row.enter().append('g')
                            .classed('data', true)
                            .attr('transform', function(d,i){
                                    var x = sScaleX(d[0]) + (sScaleX.rangeBand()/2);
                                    return 'translate('+x+',0)';
                                })
                            .each(function(d,i){
                                    return c.dRendererByHeading[d[0]].call(this, d, i);
                                })
                            .on('mouseenter', function(d,i){
                                    d3.select(this).style('stroke', 'black');
                                })
                            .on('mouseleave', function(d,i){
                                    d3.select(this).style('stroke', 'none');
                                })
                            ;
                    })
                ;

            d3TransitionEnter.each(function(){
                    d3Rows.transition().style('opacity', 1);
                });

            c.yInitialised = true;
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
    // Clean-up source data by replacing symbolic names ('n/a', 'No', 'Yes') 
    // with numeric equivalents (0, 0, 1 respectively).
    function clean(mData){
        switch( typeof(mData) ) {
            case 'string':
                return convert_to_number(mData);
                break;

            case 'object':
                if (Array.isArray(mData)) {
                    // Array
                    return mData.map(clean);
                }else{
                    // Object (dictionary)
                    var o = {};
                    for (var k in mData){
                        var v = mData[k];
                        k = clean(k);
                        v = clean(v);
                        o[k] = v;
                    }
                    return o;
                }
                break;

            case 'boolean':
                return mData ? 1 : 0 ;
                break;

            case 'undefined':
                return 0;
                break;

            case 'number':
                return mData;
                break;

            default:
                console.error('Cannot clean() data of type %s', typeof(mData));
        }
    }
    sJSONData = clean(sJSONData);

    // Flatten array specifications (e.g. Dimentions (hwd, cm))
    sJSONData.rows.forEach(function(d,i,l){
            for (var k in d.spec){
                var v = d.spec[k];
                if (Array.isArray(v)){
                    d.spec[k] = v.reduce(function(a,b){return a*b;}, 1);
                }
            }
        });

    // Remove specifications which have no varience (i.e. don't tell us 
    // anything)
    d3.nest()
        .key(function(d){return d.key;})
        .rollup(function(l){
                // Return DISTINCT values
                return l.map(function(d){return d.value;}).filter(distinct);
            })
        .entries(
            // Create long array of {key:rSpecName, value:mSpecValue from every 
            // article
            d3.merge(sJSONData.rows.map(function(d,i,l){return d3.entries(d.spec);}))
            )

        // d3.nest() -> Array of {key:rSpecName, value:lDistinctSpecValues}
        .forEach(function(d,i,l){
            if (d.values.length <= 1){
                console.log('[SPEC] No variance: %s', d.key);
                sJSONData.rows.forEach(function(item){
                        delete item.spec[d.key];
                    });
            }
        });

    // Alias bad data
    sJSONData.rows.forEach(function(d,i,l){
            // Brand
            d.spec.Brand = d.name.split(' ')[0];

            d.spec.Price = d.price;
            d.spec.Rating = d.rating;

            // THX
            if (d.spec.THX == 'Select2'){
                d.spec.THX = 'Select 2';
            } else if (d.spec.THX == 'Select2 Plus'){
                d.spec.THX = 'Select 2 Plus';
            }
        });

    d3.select('#review_count').text(sJSONData.total_rows);

    var s = {}; // State (encoded location.hash)
    var c = {}; // Configuration

    function encode_state(yForceEvent){
        // nonlocal s
        var rNewHash = d3.entries(s)
            .map(function(d){
                    if (d.key[0] == 'l'){
                        d.value = d.value
                            .filter(function(v){return v;})
                            .map(function(v){
                                return v.replace(',', ';');
                            })
                        ;
                    }
                    if (d.key == 'lFilters'){
                        d.value = d.value.filter(distinct);
                    }
                    return d.key+'='+d.value;
                })
            .join('&')
            ;
        if (yForceEvent && rNewHash == location.hash.replace('#', '')){
            window.onhashchange();
        }else{
            location.hash = rNewHash;
        }
    }

    function decode_state(){
        // Decode hash -> state
        location.hash.replace('#', '').split('&').forEach(function(d){
                var l = d.split('='),
                    k = l[0],
                    v = l[1];
                if (k[0] == 'l'){
                    v = v ? v.split(',').map(function(d){return d.replace(';', ',');}) : [] ;
                    s[k] = v;           // Don't convert to number, since +[] -> 0
                } else {
                    s[k] = +v || v;     // Convert to number if possible
                }
            });

        // Write state -> UI controls
        c.lControls.forEach(function(d,i){
                d3.select(d[1])
                    .attr('value', s[d[0]]);
            });
    }

    s.rSortKey = 'Price';
    s.lFilters = [];        // [ rSpecName:mSpecValue, ... ]
    s.lNegFilters = [];        // [ rSpecName, ... ]

    window.onhashchange = update;       // Defined below

    c.lControls = [
        // [s.rAttributeName, rDOMElementID],
        ['iPriceToNearest', '#price_to_nearest'],
        ['iRatingMin',      '#rating_min'],
        ['iRatingMax',      '#rating_max'],
        ['iPriceMax',       '#price_max'],
        ['iPriceMin',       '#price_min'],
        ['rNameFilter',     '#name_filter']
    ];

    c.lControls.forEach(function(d,i){
        var rAttributeName = d[0],
            rDOMElementID = d[1];
        s[rAttributeName] = d3.select(rDOMElementID)[0][0].value;
        d3.select(rDOMElementID).on('change', function(){
                // Avoid using `this` or any arguments, so we can trigger the 
                // event programattically as
                // `d3.select(...).on('change')()`
                s[rAttributeName]=d3.select(rDOMElementID)[0][0].value;
                encode_state();
            });
    });

    c.fncPunch1 = function(d){
            var iPrice = Math.ceil(d.price/s.iPriceToNearest)*s.iPriceToNearest;
            return [iPrice, d.rating];
        };
    c.sPunchcardChart1 = punchcard_chart()
                    .x_label('Price (£GBP)')
                    .y_label('Rating (%)')
                    .width(500)
                    .height(200)
                    .x(function(d){return convert_to_number(d.key.split(',')[0]);})
                    .y(function(d){return convert_to_number(d.key.split(',')[1]);})
                    .d(function(d){return d.values.length;})
                    .x_tick_format(d3locale.numberFormat('$s'))
                    .y_tick_format(d3locale.numberFormat(',.g'))
                    .click(function(d,i){
                            var x = d.key.split(',')[0], x = +x || x,
                                y = d.key.split(',')[1], y = +y || y;
                            s.iPriceMin = x-(s.iPriceToNearest/2);
                            s.iPriceMax = x+(s.iPriceToNearest/2);
                            s.iRatingMin = y;
                            s.iRatingMax = y;
                            encode_state();
                        })
                    ;

    c.fncPunch2 = function(d){
                return [d.spec.THX || 0, d.rating]
        };
    c.sPunchcardChart2 = punchcard_chart()
                    .x_label('THX')
                    .y_label('Rating')
                    .width(500)
                    .height(200)
                    .x(function(d){return convert_to_number(d.key.split(',')[0]);})
                    .y(function(d){return convert_to_number(d.key.split(',')[1]);})
                    .d(function(d){return d.values.length;})
                    .click(function(d,i){
                            var x = d.key.split(',')[0], x = +x || x,
                                y = d.key.split(',')[1], y = +y || y;
                            s.lFilters.push('THX:'+x);
                            s.iRatingMin = y;
                            s.iRatingMax = y;
                            encode_state();
                        })
                    ;

    c.fncPunch3 = function(d){
            var iPrice = Math.ceil(d.price/s.iPriceToNearest)*s.iPriceToNearest;
            return [iPrice, d.spec.Brand];
        };
    c.sPunchcardChart3 = punchcard_chart()
                    .x_label('Price (£GBP)')
                    .y_label('Brand')
                    .width(500)
                    .height(400)
                    .x(function(d){return convert_to_number(d.key.split(',')[0]);})
                    .y(function(d){return convert_to_number(d.key.split(',')[1]);})
                    .d(function(d){return d.values.length;})
                    .x_tick_format(d3locale.numberFormat('$s'))
                    .click(function(d,i){
                            var x = d.key.split(',')[0], x = +x || x,
                                y = d.key.split(',')[1], y = +y || y;
                            s.iPriceMin = x-(s.iPriceToNearest/2);
                            s.iPriceMax = x+(s.iPriceToNearest/2);
                            s.lFilters.push('Brand:'+y);
                            encode_state();
                        })
                    ;

    c.fncPunch4 = function(d){
            return [d.spec.THX || 0, d.spec.Brand];
        };
    c.sPunchcardChart4 = punchcard_chart()
                    .x_label('THX')
                    .y_label('Brand')
                    .width(500)
                    .height(400)
                    .x(function(d){return convert_to_number(d.key.split(',')[0]);})
                    .y(function(d){return convert_to_number(d.key.split(',')[1]);})
                    .d(function(d){return d.values.length;})
                    .click(function(d,i){
                            var x = d.key.split(',')[0], x = +x || x,
                                y = d.key.split(',')[1], y = +y || y;
                            s.lFilters.push('THX:'+x);
                            s.lFilters.push('Brand:'+y);
                            encode_state();
                        })
                    ;



    c.sWhizzyTable = whizzy_table()
        .key(function(d,i){ return d.name; })
        .sort(function(a,b){return d3.ascending(a.name, b.name);})
        .headings(function(d,i){
                var lHeadings = [];
                var lData = d3.entries(d.spec);
                for (var i=0; i<lData.length; i++){
                    var dData = lData[i];
                    if (c.sHiddenSpecs.has(dData.key)){ continue; }
                    lHeadings.push(dData.key);
                }
                return lHeadings;
            })
        .values(function(d,i){
                var lValues = [];
                var lData = d3.entries(d.spec);
                for (var i=0; i<lData.length; i++){
                    var dData = lData[i];
                    if (c.sHiddenSpecs.has(dData.key)){ continue; }
                    lValues.push(dData.value);
                }
                return lValues;
            })
        ;

    c.d3SelPunch1 = d3.select('p#punchcard_chart');
    c.d3SelPunch2 = d3.select('p#punchcard_chart2');
    c.d3SelPunch3 = d3.select('p#punchcard_chart3');
    c.d3SelPunch4 = d3.select('p#punchcard_chart4');
    c.d3SelWhizzy = d3.select('p#whizzy_table');

    c.lData = sJSONData.rows;
    c.sHiddenSpecs = d3.set();

    function update(){
        console.time('Update');

        decode_state();     // Hash -> UI + state (`s`)

        var lParsedFilters = s.lFilters.map(function(d){return d.split(':');});

        // Update visulisations
        var lData = c.lData.filter(function(d){
            if (! (d.price <= s.iPriceMax
                && d.price  >= s.iPriceMin
                && d.rating <= s.iRatingMax
                && d.rating >= s.iRatingMin
                && d.name.indexOf(s.rNameFilter) != -1
                )){ return false; }

            // Apply filters
            if (lParsedFilters.some(function(f){ return d.spec[f[0]] != f[1]; })){ return false; }
            if (s.lNegFilters.some(function(f){ return ! d.spec[f]; })){ return false; }

            return true;
            });

        var lSummaryData = d3.nest().key(c.fncPunch1).entries(lData);

        c.d3SelPunch1
            .datum(lSummaryData)   // NB: datum(), not data()!
            .call(c.sPunchcardChart1)
            ;

        lSummaryData = d3.nest().key(c.fncPunch2).entries(lData);

        c.d3SelPunch2
            .datum(lSummaryData)   // NB: datum(), not data()!
            .call(c.sPunchcardChart2)
            ;

        lSummaryData = d3.nest().key(c.fncPunch3).entries(lData);

        c.d3SelPunch3
            .datum(lSummaryData)   // NB: datum(), not data()!
            .call(c.sPunchcardChart3)
            ;

        lSummaryData = d3.nest().key(c.fncPunch4).entries(lData);

        c.d3SelPunch4
            .datum(lSummaryData)   // NB: datum(), not data()!
            .call(c.sPunchcardChart4)
            ;

        c.d3SelWhizzy.selectAll('g.th text')
            .classed('criteria', function(d){return s.lNegFilters.indexOf(d) >= 0;})
            ;

        c.sWhizzyTable.sort(function(a,b){
                var c = d3.descending(a.spec[s.rSortKey], b.spec[s.rSortKey]);
                if (c == 0){
                    // Items compare equal, sort by name instead
                    return d3.ascending(a.name, b.name);
                }
                return c;
            });
        c.d3SelWhizzy
            .datum(lData)         // NB: datum(), not data()!
            .call(c.sWhizzyTable)
            ;
        console.timeEnd('Update');
    }
    window.update = update;

    c.sHiddenSpecs.add('Composite in');
    c.sHiddenSpecs.add('Composite out');
    c.sHiddenSpecs.add('S-Video in');
    c.sHiddenSpecs.add('S-Video out');
    c.sHiddenSpecs.add('Video scaling');
    c.sHiddenSpecs.add('Video upconversion');
    c.sHiddenSpecs.add('Multiroom');

    decode_state();         // Merge URL data into our state
    encode_state(true);     // Write out complete state to URL HASH, and trigger update()

    c.d3SelWhizzy.selectAll('g.th text')
        .classed('criteria', function(d){return s.lNegFilters.indexOf(d) >= 0;})
        .on('click', function(d,i){
            var x = d3.select(this);
            if (x.classed('criteria')){
                s.rSortKey = 'name';
                delete s.lNegFilters[s.lNegFilters.indexOf(d)];
                x.classed('criteria', false);
            }else{
                s.rSortKey = d;
                s.lNegFilters.push(d);
                x.classed('criteria', true);
            }
            encode_state();
        });

    window.s = s;
    window.c = c;
    /*
    window.setTimeout(function(){
            d3.select('#price_max').attr('value', 3000).on('change')();
            update();

            window.setTimeout(function(){
                d3.select('#price_to_nearest').attr('value', 250).on('change')();
                update();

                window.setTimeout(function(){
                    d3.select('#rating_min').attr('value', 80).on('change')();
                    update();

                    }, 1000);

                }, 1000);

            }, 1000);
        */
}
