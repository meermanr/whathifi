#!/usr/bin/env python
# vim: encoding=utf-8 :
"""
Web-scrape Home cinema AV receiver rating, price, and tech-specs into a 
MonogoDB database for searching.
"""

import sys
import re
import math
import urllib2
import pprint
import logging
import pprint

import pymongo
import bson

from mpd.utilities import TILogger

# =============================================================================
# GLOBALS
# =============================================================================
gsLog = TILogger("WhatHiFi", sys.stderr)

# -----------------------------------------------------------------------------
def iter_articles(rSearchURL):
    # Returns: (str) URL of article
    iPage = 0
    sReviewPat = re.compile(r'<h3>\s*<a href="(?P<article>[^"]+)">', re.I)
    while True:
        rPageURL = "{}&page={}".format(rSearchURL, iPage)
        gsLog.debug("Fetching %s", rPageURL)
        sDocument = urllib2.urlopen(rPageURL)
        rDocument = sDocument.read()
        gsLog.debug("%s bytes", len(rDocument))
        lArticles = sReviewPat.findall(rDocument)
        iPage += 1

        for rArticleURL in lArticles:
            yield rArticleURL

        if "?page=" not in rDocument:
            break

# -----------------------------------------------------------------------------
def extract_article_data(rURL):
    # Returns: (dict) Article data ready for MongoDB
    sPatItemName    = re.compile(r'<h1>\s*<span class="item">\s*<span class="fn">(?P<item_name>[^<]+)</span>', re.I)
    sPatItemPrice   = re.compile(r'<div class="tested_at_price clear">Tested at \D+(?P<item_price>\d+)</div>', re.I)
    sPatItemValue   = re.compile(r'<span class="value">(?P<item_value>[^<]+)</span>', re.I)
    sPatItemSpec    = re.compile(r'<tr[^>]*>\s*<td[^>]*>(?P<spec_name>[^<]+)</td>\s*<td>\s*(?P<spec_value>[^<]*?)\s*</td>\s*</tr>', re.I|re.M)

    rPageURL = rURL + "/specs"

    gsLog.debug("Fetching %s", rPageURL)
    sDocument = urllib2.urlopen(rPageURL)
    rDocument = sDocument.read()
    gsLog.debug("%s bytes", len(rDocument))

    dData = {}
    dData["URL"]    = rURL
    dData["name"]   = sPatItemName.search(rDocument).group(1)
    dData["price"]  = int( sPatItemPrice.search(rDocument).group(1) )
    dData["rating"] = int( sPatItemValue.search(rDocument).group(1) )

    dSpec = {}
    for sMatch in sPatItemSpec.finditer(rDocument):
        rSpecName = sMatch.group(1)
        mSpecValue = sMatch.group(2)

        rSpecName = rSpecName.replace(".", "&#46;")

        if rSpecName in ["THX", "Video scaling"]:
            # Do not interpret these values
            pass
        elif mSpecValue == "No":
            mSpecValue = False
        elif mSpecValue == "Yes":
            mSpecValue = True
        elif mSpecValue.isdigit():
            mSpecValue = int(mSpecValue)
        else:
            try:
                mSpecValue = float(mSpecValue)
            except ValueError:
                mSpecValue = re.findall("\d+", mSpecValue)
                if len(mSpecValue) == 0:
                    mSpecValue = 0
                elif len(mSpecValue) == 1:
                    mSpecValue = mSpecValue[0]

        dSpec[rSpecName] = mSpecValue

    dData["spec"]   = dSpec

    return dData

# -----------------------------------------------------------------------------
def build_db():
    gsLog.info("Building DB...")
    siArticleURLs = iter_articles(rSearchURL)
    for rURL in siArticleURLs:
        if sCol.find({"URL": rURL}).count() == 1:
            gsLog.info("Already in DB: %s", rURL)
            continue
        dArticle = extract_article_data(rURL)
        pprint.pprint(dArticle)
        sCol.insert(dArticle)

# -----------------------------------------------------------------------------
def price_spread_by_rating(sCol):
    dResponse = sCol.aggregate([
        # For each distinct rating, create an array of all product prices
        {'$group': {'_id': "$rating", 'prices': {'$push': "$price"}}},
        ])

    for dDoc in dResponse['result']:
        fRating = dDoc['_id']

        # Mean
        fTotal = 0
        fCount = 0.0
        for fPrice in dDoc["prices"]:
            fTotal += fPrice
            fCount += 1.0
        fMeanPrice = fTotal / fCount

        # Variance
        fMin = float("+inf")
        fMax = float("-inf")
        fResidual = 0.0
        for fPrice in dDoc["prices"]:
            if fPrice < fMin:
                fMin = fPrice
            if fPrice > fMax:
                fMax = fPrice
            fResidual += (fPrice - fMeanPrice)**2
        fStandardDeviation = math.sqrt(fResidual) / fCount

        print "{:3.0f}  {:5.0f}  {:5.0f}  {:5.0f}  {:5.0f}".format(
                fRating, fMeanPrice, fMin, fMax, fStandardDeviation)

# -----------------------------------------------------------------------------
def find_distinct_specs(sCol):
    sFuncMap = bson.Code("""
            function (){
                // 'this' refers to the current document
                for(var key in this.spec){
                    emit(key, null);
                }
            }
            """)
    sFuncReduce = bson.Code("""
            function(mKey, lValues){
                print ('Reducing'+mKey+lValues);
                return null;
            }
            """)

    dResponse = {}
    dResponse = sCol.map_reduce(sFuncMap, sFuncReduce, out={'inline': 1})
    lKeys = [ x['_id'] for x in dResponse['results'] ]
    lKeys = [ x.replace('&#46;', '.') for x in lKeys ]
    return lKeys

    """
    These are equivalent to the above - this approach more closely resembles 
    the documentation, i.e. 
    http://docs.mongodb.org/manual/reference/command/mapReduce/#dbcmd.mapReduce

    dResponse = sDB.command(bson.SON([
        ('mapReduce', 'av_receivers'),
        ('map', sFuncMap),
        ('reduce', sFuncReduce),
        ('out', bson.SON([('inline',1)])),
        ('verbose', True),
        ]))
    pprint.pprint(dResponse)

    dResponse = sDB.command('mapReduce', 'av_receivers',
            map=sFuncMap,
            reduce=sFuncReduce,
            out={'inline':1},
            verbose=True,
            )
    pprint.pprint(dResponse)
    """
# -----------------------------------------------------------------------------
def get_price_range(sCol):
    dResponse = sCol.aggregate([
            {'$project': {'price':'$price'}},
            {'$group': {'_id':'price',
                'min':{'$min':'$price'},
                'max':{'$max':'$price'},
                }},
            ])
    dResult = dResponse['result'][0]
    return (dResult['min'], dResult['max'])

# -----------------------------------------------------------------------------
def calc_rating_price_frequency(sCol):
    sFuncMap = bson.Code("""
            // BANDWIDTH is defined externally by 'scope'
            function(){
                // Count documents grouped by rating + rounded price
                var iPrice = Math.ceil(this.price / BANDWIDTH) * BANDWIDTH;
                emit(
                    [this.rating, iPrice], // Key (used for grouping)
                    1                      // Values appended to data of group
                    );
            }
            """,
            scope={'BANDWIDTH':500})

    sFuncReduce = bson.Code("""
            function(lKey, lData){
                // E.g. lKey = [100, 2500];         // Rating, price
                // E.g. lData = [1,1,1,1,1,1,1,1];  // One item per doc
                var iTotal = 0;
                for (var k in lData){ iTotal += lData[k]; }
                return iTotal
            }
            """,
            scope={})

    sFuncFinalize = bson.Code("""
            function(lKey, iReducedValue){
                // E.g. lKey = [100, 2500];         // Rating, price
                // E.g. iReducedValue = 22;         // Group document count
                return {'rating':lKey[0],
                        'price':lKey[1],
                        'count': iReducedValue
                        }
            }
            """,
            scope={})

    dResponse = sCol.map_reduce(
            sFuncMap,
            sFuncReduce,
            finalize=sFuncFinalize,
            out={'inline':1})

    lResults = []
    for dDoc in dResponse['results']:
        lResults += [ dDoc['value'] ]

    return lResults

# -----------------------------------------------------------------------------
def main():
    rSearchURL = "http://www.whathifi.com/search/apachesolr_search/?filters=tid%3A379%20type%3Ahcmproduct&solrsort=is_field_star_rating%20desc&retain-filters=1"

    sClient = pymongo.MongoClient()
    sDB = sClient.whathifi
    sCol = sDB.av_receivers

    if sCol.count() == 0:
        build_db()

    iMin, iMax = get_price_range(sCol)
    price_spread_by_rating(sCol)
    lSpecs = find_distinct_specs(sCol)
    lRatingPriceFreq = calc_rating_price_frequency(sCol)

    pprint.pprint(lRatingPriceFreq)



# =============================================================================
if __name__ == "__main__":
    main()
