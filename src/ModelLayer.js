define(['dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/_base/connect',
  'dojo/_base/array',
  'dojo/topic',
  "dojo/dom",
  "dojo/dom-construct",
  "dojo/dom-style",
  "dojo/io-query",
  "dojo/request/script",
  "esri/request",
  "esri/urlUtils",
  "esri/kernel",
  "esri/layers/DynamicMapServiceLayer",
  './ModelLayerInfo',
  '../jsonConverters'
],
function (declare, lang, dojoConnect, array, topic, dom, domConstruct, domStyle, ioquery,
    script, esriRequest, urlUtils, kernel,
    DynamicMapServiceLayer, ModelLayerInfo, jsonConverters) {

    var clazz = declare(DynamicMapServiceLayer, {

        declaredClass: 'pingoor.layers.ModelLayer',

        layerInfos: [],

        visibleLayerIds: [],

        constructor: function (url, params, options) {
            this.inherited(arguments);
            this._params = params || {};
            lang.mixin(this, options);

            this.id = this.id;
            
            this.imageFormat = params && params.format || "png";
            this.imageTransparency = params && false === params.transparent ? false : true;
            this.f = params && params.f || "image";
            lang.mixin(this._params, this._url.query, {
                transparent: this.imageTransparency,
                format: this.imageFormat,
                f: this.f
            });

            this.loaded = true;
            this.onLoad(this);
            this._getLayerInfo();
            this.registerConnectEvents();
        },

        getImageUrl: function (extent, width, height, callback) {
            var url = this._url.path + '/export?';
            var ratio = Math.min((width / (extent.xmax - extent.xmin)), (height / (extent.ymax - extent.ymin)));
            lang.mixin(this._params, {
                'BBOX': extent.xmin + "," + extent.ymin + "," + extent.xmax + "," + extent.ymax,
                'SIZE': width + "," + height,
                'RATIO': ratio
            });
            delete this._params.time;
            var requestString = url + ioquery.objectToQuery(this._params);
            callback(requestString);
        },

        setImageFormat: function (formate, needRefresh) {
            this.imageFormat = this._params.format = formatea;
            needRefreshb || this.refresh(true);
        },

        setImageTransparency: function (transparent, needRefresh) {
            this.imageTransparency = this._params.transparent = transparent;
            needRefreshb || this.refresh(true);
        },

        setVisibleLayers: function (layerIds, needRefresh) {
            this.visibleLayerIds = layerIds;
            this._params.layers = "show:" + layerIds.join(",");
            needRefresh || this.refresh(true)
        },

        _getLayerInfo: function () {
            if (this.layerInfos && this.layerInfos.length > 0) return;

            script.get(this.url, {
                jsonp: 'callback'
            }).then(
               lang.hitch(this,function (response) {
                   var result = response.GetMapResult;
                    var layers = result.layers;
                    var _layerInfos = [];
                    for (var i in layers) {
                        _layerInfos.push(new ModelLayerInfo(layers[i]));
                    }
                    this.onGetLayerInfo(_layerInfos);
                    this.layerInfos = _layerInfos;
               }));
        },
        onGetLayerInfo: function(){},

        /**
        * 说明:根据空间条件查询指定子图层中满足查询条件的要素
        *
        * Parameters：
        * layerId - {String} the ID of to query subLayer
        *         - 说明：待查询子图层的ID
        * queryParams - {Object} the query conditions object
        *             syntax：{geometry:''，where:''}
        *                     geometry:{esri.Geometry}，support Point|Polygon
        *                     where:{String}，a SQL WhereClause
        *             - 说明：查询参数设置
        * callback - {Function} the callback function to handle the searched results
        *            syntax: function(queryobjects) 
        *                    queryobjects - {Array(Object)}
        *          - 说明：处理查询结果正确的回调函数
        * errback - {Function} the callback function to handle the fault results
        *               syntax: function(err) 
        *                       err:{string}
        *             - 说明：处理查询结果错误的回调函数
        */
        query: function (layerId, queryParams, callback, errback) {
            var geometry = queryParams.geometry;
            if (geometry) {
                var geojson = jsonConverters.esriConverter().toGeoJson(geometry);
            }

            var newParams = {
                'GEOMETRY': geometry ? geojson : null,
                'WHERE': queryParams.where ? queryParams.where : null,
                'RETURNGEOMETRY': true
            };

            var prefix = this._url.path + "/" + layerId + "/query?";
            var requestString = prefix + ioquery.objectToQuery(newParams);

            var queryObjects = [];
            script.get(requestString, {
                jsonp: 'callback'
            }).then(lang.hitch(this, function (response) {
                var qrs = response.QueryResult;
                for (var i in qrs) {
                    var qr = qrs[i];
                    var ret_geometry = jsonConverters.geoJsonConverter().toEsri(JSON.parse(qr.geometry));
                    var featureobject = {
                        geometry: ret_geometry,
                        attributes: JSON.parse(qr.attributes),
                        featureId: qr.featureId,
                        layerId: qr.layerId,
                        layerName: qr.layerName
                    };
                    queryObjects.push(featureobject);
                }
                callback && callback(queryObjects);
            }), function (error) {
                errback && errback(error);
            });
        },

        /**
        * 说明:根据指定几何图形查询指定子图层中满足查询条件的要素
        *
        * Parameters：
        * geometry - {esri.Geometry} the query geometry，support Point|Polygon
        *          - 说明：用于查询的几何图形,支持Point|Polygon
        * callback - {Function} the callback function to handle the searched results
        *            syntax: function(queryobjects) 
        *                    queryobjects - {Array(Object)}
        *          - 说明：处理查询结果正确的回调函数
        * errback - {Function} the callback function to handle the fault results
        *               syntax: function(err) 
        *                       err:{string}
        *             - 说明：处理查询结果错误的回调函数
        */
        identify: function (geometry, callback, errback) {
            if (!geometry) return;
            if (geometry) {
                var geojson = jsonConverters.esriConverter().toGeoJson(geometry);
            }

            var newParams = {
                'GEOMETRY': geojson,
                'RETURNGEOMETRY': true
            };

            var prefix = this._url.path + "/identify";
            var requestString = prefix + ioquery.objectToQuery(newParams);

            var identifyObjects = [];
            script.get(requestString, {
                jsonp: 'callback'
            }).then(lang.hitch(this, function (response) {
                var irs = response.IdentifyResult;
                for (var i in irs) {
                    var ir = irs[i];
                    var ret_geometry = jsonConverters.geoJsonConverter().toEsri(JSON.parse(qr.geometry));
                    var featureobject = {
                        geometry: ret_geometry,
                        attributes: JSON.parse(ir.attributes),
                        featureId: ir.featureId,
                        layerId: ir.layerId,
                        layerName: ir.layerName
                    };
                    identifyObjects.push(featureobject);
                }
                callback && callback(identifyObjects);
            }), function (error) {
                errback && errback(error);
            });
        }

    });

    return clazz;

});