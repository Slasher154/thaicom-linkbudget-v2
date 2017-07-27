DraggableOverlay.prototype = new google.maps.OverlayView();

DraggableOverlay.prototype.onAdd = function() {
    var container=document.createElement('div'),
        that=this;

    if(typeof this.get('content').nodeName!=='undefined'){
        container.appendChild(this.get('content'));
    }
    else{
        if(typeof this.get('content')==='string'){
            container.innerHTML=this.get('content');
        }
        else{
            return;
        }
    }
    container.style.position='absolute';
    container.draggable=true;
    google.maps.event.addDomListener(this.get('map').getDiv(),
        'mouseleave',
        function(){
            google.maps.event.trigger(container,'mouseup');
        }
    );


    google.maps.event.addDomListener(container,
        'mousedown',
        function(e){
            this.style.cursor='move';
            that.map.set('draggable',false);
            that.set('origin',e);

            that.moveHandler  =
                google.maps.event.addDomListener(that.get('map').getDiv(),
                    'mousemove',
                    function(e){
                        var origin = that.get('origin'),
                            left   = origin.clientX-e.clientX,
                            top    = origin.clientY-e.clientY,
                            pos    = that.getProjection()
                                .fromLatLngToDivPixel(that.get('position')),
                            latLng = that.getProjection()
                                .fromDivPixelToLatLng(new google.maps.Point(pos.x-left,
                                    pos.y-top));
                        that.set('origin',e);
                        that.set('position',latLng);
                        that.draw();
                    });


        }
    );

    google.maps.event.addDomListener(container,'mouseup',function(){
        that.map.set('draggable',true);
        this.style.cursor='default';
        google.maps.event.removeListener(that.moveHandler);
    });


    this.set('container',container)
    this.getPanes().floatPane.appendChild(container);
};

export const DraggableOverlay = function DraggableOverlay(map,position,content){
    if(typeof draw==='function'){
        this.draw=draw;
    }
    this.setValues({
        position:position,
        container:null,
        content:content,
        map:map
    });
}



DraggableOverlay.prototype.draw = function() {
    var pos = this.getProjection().fromLatLngToDivPixel(this.get('position'));
    this.get('container').style.left = pos.x + 'px';
    this.get('container').style.top = pos.y + 'px';
};

DraggableOverlay.prototype.onRemove = function() {
    this.get('container').parentNode.removeChild(this.get('container'));
    this.set('container',null)
};