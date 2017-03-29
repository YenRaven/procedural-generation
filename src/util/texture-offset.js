AFRAME.registerComponent('offset-texture', {
    schema: {
        'offset': {type:'vec2', default:"0 0"}
    },
    init: function () {
        this.material = this.el.getObject3D('mesh').material;
        this.material.map.offset = this.data.offset;
    },
    update: function() {
        this.material.map.offset = this.data.offset;
    }
});
