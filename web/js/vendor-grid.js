Ext.define('Ext.ux.form.SearchField', {
    extend: 'Ext.form.field.Trigger',
    alias: 'widget.searchfield',
    trigger1Cls: Ext.baseCSSPrefix + 'form-clear-trigger',
    trigger2Cls: Ext.baseCSSPrefix + 'form-search-trigger',
    paramName: 'query',
    initComponent: function() {
        var me = this;
        me.callParent(arguments);
        me.on('specialkey', function(f, e) {
            if (e.getKey() === e.ENTER) {
                me.onTrigger2Click();
            }
        }, me);
    },
    afterRender: function() {
        var me = this;
        me.callParent();
        me.triggerEl.item(0).setDisplayed('none');
    },
    onTrigger1Click: function() {
        var me = this;
        if (me.hasSearch) {
            me.setValue('');
            me.doSearch();
            me.triggerEl.item(0).setDisplayed('none');
        }
    },
    onTrigger2Click: function() {
        var me = this,
            value = me.getValue();
        if (value.length < 1) {
            me.hasSearch = false;
            me.onTrigger1Click();
            return;
        }
        me.doSearch();
    },
    reloadStore: function() {
        var s = this.store;
        s.proxy.extraParams.start = 0;
        s.currentPage = 1;
        s.load();
        delete s.proxy.extraParams.start;
    },
    search: function(v) {
        var me = this;
        me.setValue(v);
        me.doSearch();
    },
    doSearch: function() {
        var me = this;
        me.store.getProxy().extraParams[me.paramName] = me.getValue();
        me.reloadStore();
        me.hasSearch = true;
        me.triggerEl.item(0).setDisplayed('block');
        me.doComponentLayout();
    }
});

OpenLayers.IMAGE_RELOAD_ATTEMPTS = 3;
OpenLayers.Util.onImageLoadErrorColor = "transparent";

Ext.Ajax.cors = true;

Ext.define('MapWindow', {
	extend: 'Ext.Window',
	title: 'Map',
	width: 500,
	height: 400,
	mapWidth: 5120,
	mapHeight: 4088,
	mapName: 'FELUCCA',
	minZoom: 0,
	maxZoom: 6,
	defaultZoom: 5,
	closeAction: 'hide',
	html: '<div id="map"></div><div id="subheader">Generated by <a href="http://www.maptiler.org/">MapTiler</a>/<a href="http://www.klokan.cz/projects/gdal2tiles/">GDAL2Tiles</a>, Copyright &copy; 2008 <a href="http://www.klokan.cz/">Klokan Petr Pridal</a>,  <a href="http://www.gdal.org/">GDAL</a> &amp; <a href="http://www.osgeo.org/">OSGeo</a> <a href="http://code.google.com/soc/">GSoC</a></div>',
	initComponent: function() {
		var me = this;
		me.callParent();
		me.on('afterrender', me.initMap, me);
	},
	initMap: function() {
		var me = this, options = {
				controls: [],
				maxExtent: new OpenLayers.Bounds(  0.0, 0.0, me.mapWidth, me.mapHeight ),
				maxResolution: 32.000000,
				numZoomLevels: me.maxZoom-me.minZoom + 1,
				url: 'map/'
			},
			mapBounds = new OpenLayers.Bounds( 0.0, 0.0, me.mapWidth, me.mapHeight),
			layer = new OpenLayers.Layer.TMS( me.mapName,'', {  url: '', serviceVersion: '.', layername: '.', alpha: false,
		    type: 'jpg', getURL: me.overlay_getTileURL
		}),
		mp = new OpenLayers.Control.MousePosition({
			formatOutput: function(lonLat) {
				var markup = Math.min(Math.max(0, (me.mapHeight - lonLat.lat)),me.mapHeight);
				markup += ", " + Math.min(Math.max(0, (lonLat.lon)),me.mapWidth);
				return markup;
		}});
	    me.map = new OpenLayers.Map('map', options);
	    me.map.addLayer(layer);
	    me.map.zoomToExtent(mapBounds);
	    me.map.addControl(new OpenLayers.Control.PanZoomBar());
	    me.map.addControl(new OpenLayers.Control.MouseDefaults());
	    me.map.addControl(new OpenLayers.Control.KeyboardDefaults());			
		me.map.addControl(mp);
		me.updateCenter();
		me.updateLocs();
		
		Ext.Ajax.request({
			url: 'map/info/locations.txt',
			success: function(resp) {
				var location, markers = new OpenLayers.Layer.Markers("Houses"),size_city = new OpenLayers.Size(19,16),
					offset_city = new OpenLayers.Pixel(-(size_city.w/2), -size_city.h),
					icon_city = new OpenLayers.Icon('map/icons/icon_city.gif', size_city, offset_city),
					size_dungeon = new OpenLayers.Size(19,20),
					offset_dungeon = new OpenLayers.Pixel(-(size_dungeon.w/2), -size_dungeon.h),
					icon_dungeon = new OpenLayers.Icon('map/icons/icon_skull.gif', size_dungeon, offset_dungeon),i,
					json = Ext.decode(resp.responseText, true);

				//Create a layer only for locations. We can split the locations in multiple layers...
				me.map.addLayer(markers);
				
				for(i = 0; 0 < json.length; ++i)
				{
					location = json[i];		
					me.addMarkerWithPopup(markers, location.type == "TOWN" ? icon_city : icon_dungeon, location.lon, location.lat, location.name);
				}
			},
			scope: me
		});
	},
	updateCenter: function() {
		var me = this, lonLatCenter  = new OpenLayers.LonLat(me.lon, me.mapHeight-me.lat);	
		me.map.setCenter(lonLatCenter, me.defaultZoom, false, true);
	},
	updateLocs: function() {
		var me = this;
		if(me.markers) {
			me.map.removeLayer(me.markers);
			me.markers.destroy();
			me.markers = null;
		}
		
		me.markers = new OpenLayers.Layer.Markers("Vendors");
		me.map.addLayer(me.markers);			
		
		for(i=0,len=me.locs.length; i<len; i++) {
			var l = me.locs.getAt(i),
				size = new OpenLayers.Size(21,25),
				offset = new OpenLayers.Pixel(-(size.w/2), -size.h),
				icon = new OpenLayers.Icon('http://www.openlayers.org/dev/img/marker.png',size,offset);
			me.addMarkerWithPopup(me.markers, icon, l.lat, l.lon, l.name);
		}
	},
	addMarkerWithPopup: function(markerlayer, icontype, lon, lat, popuptext) 
	{
		var me = this, mymarker = new OpenLayers.Marker(new OpenLayers.LonLat(lon,me.mapHeight - lat),icontype.clone());
		markerlayer.addMarker(mymarker);
		mymarker.events.register('mouseover', mymarker, function(evt) {
			popup = new OpenLayers.Popup("thepopup", new OpenLayers.LonLat(lon,me.mapHeight - lat), new OpenLayers.Size(200,200), popuptext, false);
			popup.autoSize = true;
			popup.maxSize = new OpenLayers.Size(200,200);
			popup.setBorder("1px solid #967212");
			me.map.addPopup(popup);
		});
		mymarker.events.register('mouseout', mymarker, function(evt) {
			me.map.removePopup(popup);
			popup.destroy();
			popup = null;
		});
	},
	overlay_getTileURL: function(bounds) {	
        var me = this, map = me.map, res = map.getResolution(),
        	x = Math.round((bounds.left - map.maxExtent.left) / (res * map.tileSize.w)),
        	y = Math.round((bounds.bottom - map.maxExtent.bottom) / (res * map.tileSize.h)),
        	z = map.getZoom();
		if (x >= 0 && y >= 0) {
            return map.url + z + "/" + x + "/" + y + "." + me.type;				
		} else {
            return "http://www.maptiler.org/img/none.png";
		}
	}
});
Ext.define('VendorGrid', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.vendorgrid',
    loadMask: true,
    bodyCls: 'vendor-grid-body',
    overCellCls: 'vendor-col-hover',
    stripeRows: false,
    clickableCols: [0, 1, 2, 6, 7],
    url: 'http://localhost:2595/vendorItems',
    initComponent: function() {
        var me = this;
        me.colModel = {
            xtype: 'headercontainer',
            baseCls: 'vendor-grid-header-ct',
            items: [{
                text: 'Vendor Name',
                dataIndex: 'VendorName'
		},{
                text: 'Name',
                dataIndex: 'Name',
                flex: 2,
                renderer: me.columnRenderer
		},{
                text: 'Description',
                dataIndex: 'Description',
                flex: 2,
                renderer: me.columnRenderer
		},{
                text: 'Amount',
                dataIndex: 'Amount'
		},{
                text: 'Price',
                dataIndex: 'Price'
		},{
                text: 'Price Per',
                dataIndex: 'PricePer'
		},{
                text: 'Location',
                dataIndex: 'Location',
                flex: 1,
                renderer: me.columnRenderer
		},{
                text: 'Owner',
                dataIndex: 'OwnerName'
            }]
        };  
        me.store = Ext.create('Ext.data.Store', {
            fields: ['Amount', 'Description', 'Location', 'Name', 'OwnerName', 'VendorName',
            {
                name: 'PricePer',
                convert: me.formatPrice
		},{
                name: 'Price',
                convert: me.formatPrice
		}],
            pageSize: 30,
            sorters: [{
                property: 'VendorName',
                direction: 'ASC'}],
            proxy: {
                type: 'jsonp',
                url: me.url,
                simpleSortMode: true,
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'count'
                }
            },
            remoteSort: true
        });
	  me.tbar = {
		componentCls: 'vendor-grid-tb',
            items: [{
                xtype: 'searchfield',
                fieldLabel: 'Search',
                labelWidth: 50,
                width: 400,
                paramName: 'q',
                store: me.store
		}, 'You can also click on a vendor/owner name, item name, or description to perform a search']
        };
        me.bbar = Ext.create('Ext.PagingToolbar', {
            defaults: {
                overCls: ''
            },
            componentCls: 'vendor-grid-tb',
            store: me.store,
            displayInfo: true,
            displayMsg: 'Displaying Items {0} - {1} of {2}',
            emptyMsg: 'No items to display'
        });
        me.viewConfig = {
            emptyText: '<div class=\'vendor-grid-empty\'>No Items to Display</div>',
            deferEmptyText: false,
            componentCls: 'vendor-grid-view',
            getRowClass: function() {
                return 'vendor-grid-row';
            },
            disableSelection: true
        };
        me.callParent();
        me.on('cellclick', me.onCellClick, me);
        me.on('itemmouseenter', me.onMouseEnter, me);
        me.on('itemmouseleave', me.onMouseLeave, me);
        me.on('afterrender', me.onLoad, me, {single: true});
    },
    onLoad: function() {
        this.store.loadPage(1);
    },
    onCellClick: function(v, cellEl, cellIndex, rec) {
        var me = this, val;
        if (Ext.Array.contains(me.clickableCols, cellIndex)) {
        	val = rec.get(me.columns[cellIndex].dataIndex);
            if(cellIndex == 6) {
            	me.openMap(val);
         	} else if (!Ext.isEmpty(val)) {
            	me.query('searchfield')[0].search(val);
            }
     	  }
    },
    onMouseEnter: function(v, rec, item, index, e) {
        var me = this, col = v.getPositionByEvent(e).column;
	  if (Ext.Array.contains(me.clickableCols, col) && !Ext.isEmpty(rec.data[me.columns[col].dataIndex])) {
	      Ext.get(e.target).addCls(me.overCellCls);
        }
    },
    onMouseLeave: function(v, rec, item, index, e) {
        var me = this, col = v.getPositionByEvent(e).column;
	  if (Ext.Array.contains(me.clickableCols, col) && !Ext.isEmpty(rec.data[me.columns[col].dataIndex])) {
	      Ext.get(e.target).removeCls(me.overCellCls);
        }

    },
    columnRenderer: function(value, metadata) {
        metadata.tdAttr = 'data-qtip="' + value + '"';
        return value;
    },
    formatPrice: function(v) {
        if (v >= 10000) {
            v = v / 1000.0;
            var m = v % 1;
            if (m !== 0 && m !== 0.5) {
                v = v.toFixed(2);
            }
            v += 'k';
            v = v.replace('.00', '');
        }
        return v;
    },
    openMap: function(v) {
    	var me = this, center = v.split(' ')[1].split(','), locs = Ext.create('Ext.util.MixedCollection'), k;
    	me.store.each(function(r) {
    		var n = r.get('VendorName'), l = r.get('Location').split(' ')[1].split(',');
    		k = n + l.toString();
    		if(!locs.contains(k))
    		{	
    			locs.add(k, {
    				name: r.get('VendorName'),
    				lat: Ext.Number.from(l[0],0),
    				lon: Ext.Number.from(l[1],0)
    			});
    		}
    	});
    	if(!me.win) {
    		me.win = Ext.create('MapWindow', {
        		lat: Ext.Number.from(center[1],0),
        		lon: Ext.Number.from(center[0],0),
        		locs: locs
        	});
    	} else {
    		me.win.lat = Ext.Number.from(center[1],0);
    		me.win.lon = Ext.Number.from(center[0],0);
    		me.win.locs = locs;
    		me.win.updateCenter();
    		me.win.updateLocs();
    	}
    	me.win.show();
    }
});

Ext.onReady(function() {

    Ext.QuickTips.init();

    Ext.create('Ext.container.Viewport', {
        layout: 'fit',
        componentCls: 'vendor-grid-vp',
        items: {
            xtype: 'vendorgrid'                     
        }
    });
});