define(["dojo/_base/declare",
    "dojo/_base/lang",
],
function (declare, lang) {

    var clazz = declare(null, {

        /** Property: id
        * {String} the unique identifier of the subLayer.
        * 说明：子图层唯一标识
        */
        id: null,

        /** Property: id
        * {String} the name of the subLayer.
        * 说明：子图层名称
        */
        name: null,

        /** Property: id
        * {String} the default visibility of the subLayer.
        * 说明：子图层默认可见性
        */
        defaultVisibility: true,

        /** Property: id
        * {Number} the minimum scale of the subLayer.
        * 说明：子图层最小可见比例
        */
        minScale: -1,

        /** Property: id
        * {Number} the maximunm scale of the subLayer.
        * 说明：子图层最大可见比例
        */
        maxScale: -1,

        parentLayerId: null,

        subLayerIds: null,

        constructor: function (json) {
            lang.mixin(this, json);
        },

        toJson: function () {
            return JSON.stringify(this);
        }

    });

    return clazz;
});