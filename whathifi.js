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
    c.x_tick_format = function(v){return d.toString();}     // v = c.x(d)
    c.y_tick_format = function(v){return d.toString();}
    c.d_tick_format = function(v,d){return v.toString();}
    c.x_label = '';
    c.y_label = '';
    c.mouseover = function(d,i){console.log(this,d,i);};

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

                var lXDomainValues = d3.set(d.map(c.x)).values().map(returnInt);
                var iXDomainSpacing = min_gap(lXDomainValues) || 0;
                var rx = c.width / (lXDomainValues.length) / 2;
                var scale_x = d3.scale.linear()
                    .domain(d3.extent(d, c.x))
                    .range([rx, c.width-rx])
                    ;
                var iXRangeSpacing = (scale_x(iXDomainSpacing) - scale_x(0))/2 || c.width/2;

                var lYDomainValues = d3.set(d.map(c.y)).values().map(returnInt);
                var iYDomainSpacing = min_gap(lYDomainValues) || 0;
                var ry = c.height / (lYDomainValues.length) / 2;
                var scale_y = d3.scale.linear()
                    .domain(d3.extent(d, c.y))
                    .range([c.height-ry, ry])   // SVG y-axis goes top-to-bottom
                    ;
                var iYRangeSpacing = Math.abs((scale_y(iYDomainSpacing) - scale_y(0))/2) || c.height/2;

                var iMinRangeSpacing = Math.min(iXRangeSpacing, iYRangeSpacing);
                var scale_d = d3.scale.sqrt()
                    .domain([0, d3.max(d, c.d)])
                    .range([0, iMinRangeSpacing])
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

                // Update (resize chart)
                d3Selection.select('circle')
                    .datum(function(d){return d;})
                .transition()
                    .attr('r', extract_data_d_and_scale)
                    .attr('cx', extract_data_x_and_scale)
                    .attr('cy', extract_data_y_and_scale)
                    ;

                // Enter
                d3Selection.enter().append('g')
                    .classed('new', true)
                    .classed('bubble', true)
                    .each(function(d,i){
                            d3.select(this).append('title');
                            d3.select(this).append('circle')
                                .classed('bubble', true)
                                .attr('cx', extract_data_x_and_scale)
                                .attr('cy', extract_data_y_and_scale)
                                .attr('r', 0)
                            .transition()
                                .attr('r', extract_data_d_and_scale)
                                ;
                        })
                    ;

                // Update (metadata)
                d3Selection
                    .each(function(d,i){
                            var rTitle = c.d_tick_format(c.d(d), d);
                            d3.select(this)
                                .on('mouseover', c.mouseover)
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
    c.width = 900;
    c.item_height = 24;
    c.headings = function(d,i){return d.headings;};
    c.values = function(d,i){return d.values;};

    // Chart functionality
    function my(d3OuterSelection){
        d3OuterSelection.each(function whizzy_table_inner(d, i){
            // `d`: (Object) Input data
            // `i`: (int) Index within the outer selection
            // `this`: (DOMElement) Element to render chart within, e.g. svg

            // Prepare data
            var sHeadings = d3.set();
            var dValues = {};   // rHeading -> d3.set() of seen values
            for (var i=0; i<d.length; i++){
                var dItem = d[i];
                var lDataHeadings = c.headings(dItem,i);
                var lDataValues = c.values(dItem,i);
                for (var j=0; j<lDataHeadings.length; j++)
                {
                    var rHeading = lDataHeadings[j];
                    var mValue = lDataValues[j];
                    sHeadings.add(rHeading);
                    if (dValues[rHeading] === undefined){dValues[rHeading] = d3.set();}
                    dValues[rHeading].add(mValue);
                }
            }
            console.log(sHeadings.values().sort(), dValues);

            var d3SVG = d3.select(this).select('svg.whizzy_table');

            // Create if necessary
            if (d3SVG.empty()){
                d3SVG = d3.select(this).append('svg:svg')
                    .classed('whizzy_table', true)
                    ;
            }

            console.log(d);
            d3SVG
                .attr('width', c.width)
                .attr('height', d.length*c.item_height)
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

function quantize_articles(lArticles, iPriceToNearest){
    /*
     * Want to plot star-rating (Y) against price (X) and display the number of 
     * articles matching each grid location (D). The raw data is not suited to 
     * this because it has not yet been summarised, so there is no count value 
     * (D) to plot, and the possible X,Y coordinates form a surface rather than 
     * a regular grid.
     * 
     * We need to quantise the rating and price data such that we end up with a 
     * grid of possible X,Y coordinates (rather than a surface). This will 
     * result in multiple articles being represented by a single grid point, so 
     * the count (D) should be the summation of all articles.
     */
    var dData = {};     // dData[x][y] = [d, [sArticle1, sArticle2]];
    if (iPriceToNearest === undefined){iPriceToNearest = 500;}
    for (var i in lArticles){
        var dArticle = lArticles[i];
        var fPrice = Math.ceil(dArticle.price/iPriceToNearest)*iPriceToNearest;
        var fRating = dArticle.rating;
        if (dData[fPrice] === undefined){dData[fPrice] = {};}
        if (dData[fPrice][fRating] === undefined){dData[fPrice][fRating] = [0, []];}
        dData[fPrice][fRating][0] += 1;
        dData[fPrice][fRating][1].push(dArticle);
    }
    // NB: Object keys in ECMAScript are *always* converted to string type. So 
    // we must convert back to numbers. Cf.  
    // http://stackoverflow.com/q/3633362/83100
    var lData = [];
    for (var x in dData){
        x = parseInt(x);
        for (var y in dData[x]){
            y = parseInt(y);
            var d = {'x':x, 'y':y, 'd':dData[x][y][0], 'articles':dData[x][y][1]};
            lData.push(d);
        }
    }
    return lData;
}

function init(sJSONData){
    window.sJSONData = sJSONData;

    d3.select('#review_count').text(sJSONData.total_rows);

    var s = {}; // State
    s.iPriceToNearest = d3.select('#price_to_nearest')[0][0].value;
    s.iRatingMin = d3.select('#rating_min')[0][0].value;
    s.iRatingMax = d3.select('#rating_max')[0][0].value;
    s.iPriceMin = d3.select('#price_min')[0][0].value;
    s.iPriceMax = d3.select('#price_max')[0][0].value;

    s.sPunchcardChart = punchcard_chart()
                    .width(500)
                    .height(140)
                    .x(function(d){return parseInt(d.key.split(',')[0]);})
                    .y(function(d){return parseInt(d.key.split(',')[1]);})
                    .d(function(d){return d.values.length;})
                    .x_label('Price')
                    .y_label('Rating')
                    .x_tick_format(d3locale.numberFormat('$,'))
                    .y_tick_format(d3locale.numberFormat(',.g'))
                    .d_tick_format(function(v,d){
                            return d.values.map(function(d){return d.name;}).sort().join('\n');
                        })
                    .mouseover(function(d,i){
                            var lData = d.values.map(function(d){return d.name;}).sort();
                            var s = d3.select('ul#hover_details').selectAll('li')
                                .data(lData, function(d){return d;})
                            s.enter().append('li')
                                .text(function(d,i){return d;})
                                ;
                            s.exit().remove();
                        })
                    ;

    s.d3SelPunch = d3.select('p#punchcard_chart');
    s.lData = [];
    s.lSummaryData = [];

    function update(){
        s.lData = sJSONData.rows;
        s.lData = s.lData.filter(function(d){
            return (d.price <= s.iPriceMax
                && d.price  >= s.iPriceMin
                && d.rating <= s.iRatingMax
                && d.rating >= s.iRatingMin
                );
            });

        s.lSummaryData = d3.nest().key(function(d){
                var iPrice = Math.ceil(d.price/s.iPriceToNearest)*s.iPriceToNearest;
                return [iPrice, d.rating];
            }).entries(s.lData);

        s.d3SelPunch
            .datum(s.lSummaryData)   // NB: datum(), not data()!
            .call(s.sPunchcardChart)
            ;
    }
    update();

    d3.select('#price_to_nearest').on('change', function(){s.iPriceToNearest=parseInt(this.value); update();});
    d3.select('#price_min')       .on('change', function(){s.iPriceMin=parseInt(this.value); update();});
    d3.select('#price_max')       .on('change', function(){s.iPriceMax=parseInt(this.value); update();});
    d3.select('#rating_min')      .on('change', function(){s.iRatingMin=parseInt(this.value); update();});
    d3.select('#rating_max')      .on('change', function(){s.iRatingMax=parseInt(this.value); update();});

    s.sWhizzyTable = whizzy_table()
        .headings(function(d,i){
                var lHeadings = [];
                lHeadings.push('Name', 'Price', 'Rating');
                lHeadings = d3.merge([lHeadings, d3.keys(d.spec)]);
                console.log(lHeadings);
                return lHeadings;
            })
        .values(function(d,i){
            var lValues = [];
            lValues.push(d.name, d.price, d.rating);
            lValues = d3.merge([lValues, d3.values(d.spec)]);
            console.log(lValues);
            return lValues;
            })
        ;
    s.d3SelWhizzy = d3.select('p#whizzy_table')
        .datum(s.lData)
        .call(s.sWhizzyTable)
        ;
}
